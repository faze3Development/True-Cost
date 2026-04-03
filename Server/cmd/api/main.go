// cmd/api/main.go is the entrypoint for the True Cost web API service.
// It initialises the database connection, configures the Gin router, starts
// the HTTP server, and implements graceful shutdown on SIGINT / SIGTERM.
package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"runtime/debug"
	"strings"

	"github.com/joho/godotenv"
	"go.uber.org/zap"

	"github.com/faze3Development/true-cost/Server/internal/api"
	"github.com/faze3Development/true-cost/Server/internal/config"
	"github.com/faze3Development/true-cost/Server/internal/db"
	"github.com/faze3Development/true-cost/Server/internal/infrastructure/auth"
	"github.com/faze3Development/true-cost/Server/internal/logging"
	"github.com/faze3Development/true-cost/Server/migrations"
)

func loadDotEnv() {
	// In local/dev we want edits to Server/.env to take effect immediately on restart,
	// even if a previous shell exported different values.
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

	// 1. Init matching AI Studio Logger Structure
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

	mockAuthRequested := strings.EqualFold(os.Getenv("ENABLE_MOCK_AUTH"), "true")
	if mockAuthRequested && env != "development" && env != "local" {
		zap.L().Warn("ENABLE_MOCK_AUTH was requested outside local/development and has been ignored",
			zap.String("env", env),
			zap.Bool("effective_enable_mock_auth", cfg.EnableMockAuth),
		)
	}

	database, err := db.Connect(cfg.DSN())
	if err != nil {
		zap.L().Error("database connect failed", zap.Error(err))
		os.Exit(1)
	}

	db.WarnIfSuperuser(database)

	if err := migrations.Run(database); err != nil {
		zap.L().Error("migrations failed", zap.Error(err))
		os.Exit(1)
	}

	if err := db.SeedTiers(database); err != nil {
		zap.L().Error("database seeding failed", zap.Error(err))
	}

	if err := db.SeedProperties(database); err != nil {
		zap.L().Error("database properties seeding failed", zap.Error(err))
	}

	// Initialize Firebase Auth
	// Passing an empty string so it tries to use GOOGLE_APPLICATION_CREDENTIALS from env
	ctxInit := context.Background()
	authClient, err := auth.NewClient(ctxInit, "")
	if err != nil {
		zap.L().Warn("firebase auth failed to initialize - protected routes will fail", zap.Error(err))
	}

	router := api.NewRouter(database, cfg, authClient)

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in a goroutine so we can listen for shutdown signals.
	go func() {
		zap.L().Info("api server starting", zap.String("addr", srv.Addr))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			zap.L().Error("server error", zap.Error(err))
			os.Exit(1)
		}
	}()

	// Block until SIGINT or SIGTERM.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	zap.L().Info("api server shutting down gracefully")

	// Allow up to 30 seconds for in-flight requests to finish.
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		zap.L().Error("server forced shutdown", zap.Error(err))
	}

	zap.L().Info("api server stopped")
}
