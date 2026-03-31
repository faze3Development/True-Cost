// cmd/worker/main.go is the entrypoint for the True Cost Asynq worker service.
// It initialises the database and Redis connections, starts the consumer, and
// implements graceful shutdown on SIGINT / SIGTERM so active scrape tasks are
// not corrupted during Cloud Run container scaling events.
package main

import (
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/hibiken/asynq"

	"github.com/faze3Development/true-cost/internal/config"
	"github.com/faze3Development/true-cost/internal/db"
	"github.com/faze3Development/true-cost/internal/jobs"
)

func main() {
	// Structured JSON logging — parsable by GCP Cloud Logging.
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))

	cfg, err := config.Load()
	if err != nil {
		slog.Error("config load failed", slog.String("error", err.Error()))
		os.Exit(1)
	}

	database, err := db.Connect(cfg.DSN())
	if err != nil {
		slog.Error("database connect failed", slog.String("error", err.Error()))
		os.Exit(1)
	}

	redisOpt := asynq.RedisClientOpt{Addr: cfg.RedisAddr}

	// ---------------------------------------------------------------------------
	// Producer HTTP server — Cloud Scheduler hits this endpoint to trigger
	// enqueuing of daily scrape tasks.
	// ---------------------------------------------------------------------------
	producer := jobs.NewProducer(redisOpt, database)
	defer producer.Close() //nolint:errcheck

	mux := http.NewServeMux()
	mux.HandleFunc("/enqueue", producer.EnqueueHandler)

	producerSrv := &http.Server{
		Addr:    ":8081",
		Handler: mux,
	}

	go func() {
		slog.Info("producer http server starting", slog.String("addr", producerSrv.Addr))
		if err := producerSrv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("producer server error", slog.String("error", err.Error()))
		}
	}()

	// ---------------------------------------------------------------------------
	// Consumer — processes tasks from the Redis queue.
	// ---------------------------------------------------------------------------
	consumer := jobs.NewConsumer(redisOpt, database, 5)

	go func() {
		slog.Info("asynq consumer starting")
		if err := consumer.Run(); err != nil {
			slog.Error("consumer run error", slog.String("error", err.Error()))
			os.Exit(1)
		}
	}()

	// Block until SIGINT or SIGTERM.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	slog.Info("worker shutting down gracefully")

	// Gracefully drain in-flight scrape tasks before exiting.
	consumer.Shutdown()

	slog.Info("worker stopped")
}
