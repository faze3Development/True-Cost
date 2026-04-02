// cmd/worker/main.go is the entrypoint for the True Cost Asynq worker service.
// It initialises the database and Redis connections, starts the consumer, and
// implements graceful shutdown on SIGINT / SIGTERM so active scrape tasks are
// not corrupted during Cloud Run container scaling events.
package main

import (
	"net/http"
	"os"
	"os/signal"
	"runtime/debug"
	"strings"
	"syscall"

	"github.com/hibiken/asynq"
	"github.com/joho/godotenv"
	"go.uber.org/zap"

	"github.com/faze3Development/true-cost/Server/internal/config"
	"github.com/faze3Development/true-cost/Server/internal/db"
	"github.com/faze3Development/true-cost/Server/internal/jobs"
	"github.com/faze3Development/true-cost/Server/internal/logging"
	"github.com/faze3Development/true-cost/Server/migrations"
)

func loadDotEnv() {
	if strings.ToLower(os.Getenv("ENV")) == "production" {
		_ = godotenv.Load()
		return
	}
	_ = godotenv.Overload("Server/.env")
	_ = godotenv.Overload(".env")
}

func getEnvironment() string {
	env := os.Getenv("ENV")
	if env == "" {
		env = "development"
	}
	return strings.ToLower(env)
}

func getVersion() string {
	version := os.Getenv("APP_VERSION")
	if version == "" {
		if info, ok := debug.ReadBuildInfo(); ok {
			version = info.Main.Version
		}
		if version == "" {
			version = "dev"
		}
	}
	return version
}

func main() {
	loadDotEnv()

	env := getEnvironment()
	version := getVersion()

	// Init matching AI Studio Logger Structure
	logger, err := logging.Init(env, version)
	if err != nil {
		_, _ = os.Stderr.WriteString("logger init failed: " + err.Error() + "\n")
		os.Exit(1)
	}
	defer func() { _ = logger.Sync() }()

	cfg, err := config.Load()
	if err != nil {
		zap.L().Error("config load failed", zap.Error(err))
		os.Exit(1)
	}

	database, err := db.ConnectConfig(cfg.DSN(), cfg.DBMaxIdleConns, cfg.DBMaxOpenConns, cfg.DBConnMaxLifetime)
	if err != nil {
		zap.L().Error("database connect failed", zap.Error(err))
		os.Exit(1)
	}

	if err := migrations.Run(database); err != nil {
		zap.L().Error("migrations failed", zap.Error(err))
		os.Exit(1)
	}

	if err := db.SeedTiers(database); err != nil {
		zap.L().Error("database seeding failed", zap.Error(err))
	}

	redisOpt := asynq.RedisClientOpt{Addr: cfg.RedisAddr}

	// ---------------------------------------------------------------------------
	// Producer HTTP server — Cloud Scheduler hits this endpoint to trigger
	// enqueuing of daily scrape tasks.
	// ---------------------------------------------------------------------------
	producer := jobs.NewProducer(redisOpt, database, cfg.MaxJitterDuration, cfg.MaxRetries, cfg.TaskTimeout)
	defer producer.Close() //nolint:errcheck

	mux := http.NewServeMux()
	mux.HandleFunc("/enqueue", producer.EnqueueHandler)

	producerSrv := &http.Server{
		Addr:    ":" + cfg.ProducerPort,
		Handler: mux,
	}

	go func() {
		zap.L().Info("producer http server starting", zap.String("addr", producerSrv.Addr))
		if err := producerSrv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			zap.L().Error("producer server error", zap.Error(err))
		}
	}()

	// ---------------------------------------------------------------------------
	// Consumer — processes tasks from the Redis queue.
	// ---------------------------------------------------------------------------
	consumer := jobs.NewConsumer(redisOpt, database, cfg.ConsumerConcurrency, cfg.ConsumerShutdownTimeout, cfg.ScraperTimeout, cfg.ScraperSleep, cfg.ConfidenceScore, cfg.DataSource)

	go func() {
		zap.L().Info("asynq consumer starting")
		if err := consumer.Run(); err != nil {
			zap.L().Error("consumer run error", zap.Error(err))
			os.Exit(1)
		}
	}()

	// Block until SIGINT or SIGTERM.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	zap.L().Info("worker shutting down gracefully")

	// Gracefully drain in-flight scrape tasks before exiting.
	consumer.Shutdown()

	zap.L().Info("worker stopped")
}
