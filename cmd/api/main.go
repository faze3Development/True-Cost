// cmd/api/main.go is the entrypoint for the True Cost web API service.
// It initialises the database connection, configures the Gin router, starts
// the HTTP server, and implements graceful shutdown on SIGINT / SIGTERM.
package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/faze3Development/true-cost/internal/api"
	"github.com/faze3Development/true-cost/internal/config"
	"github.com/faze3Development/true-cost/internal/db"
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

	if err := db.AutoMigrate(database); err != nil {
		slog.Error("auto migrate failed", slog.String("error", err.Error()))
		os.Exit(1)
	}

	router := api.NewRouter(database)

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in a goroutine so we can listen for shutdown signals.
	go func() {
		slog.Info("api server starting", slog.String("addr", srv.Addr))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", slog.String("error", err.Error()))
			os.Exit(1)
		}
	}()

	// Block until SIGINT or SIGTERM.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	slog.Info("api server shutting down gracefully")

	// Allow up to 30 seconds for in-flight requests to finish.
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("server forced shutdown", slog.String("error", err.Error()))
	}

	slog.Info("api server stopped")
}
