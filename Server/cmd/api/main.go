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

	"go.uber.org/zap"

	"github.com/faze3Development/true-cost/Server/internal/api"
	"github.com/faze3Development/true-cost/Server/internal/config"
	"github.com/faze3Development/true-cost/Server/internal/db"
	"github.com/faze3Development/true-cost/Server/internal/logging"
	"github.com/faze3Development/true-cost/Server/migrations"
)

func main() {
	logger, err := logging.Init()
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

	database, err := db.Connect(cfg.DSN())
	if err != nil {
		zap.L().Error("database connect failed", zap.Error(err))
		os.Exit(1)
	}

	if err := migrations.Run(database); err != nil {
		zap.L().Error("migrations failed", zap.Error(err))
		os.Exit(1)
	}

	router := api.NewRouter(database, cfg)

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
