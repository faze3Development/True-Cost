// Package db manages the GORM PostgreSQL connection with production-safe
// connection pool settings for serverless Cloud Run environments.
package db

import (
	"fmt"
	"log/slog"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/faze3Development/true-cost/internal/models"
)

// Connect opens a GORM PostgreSQL connection using the supplied DSN and
// configures the underlying sql.DB connection pool to prevent connection
// exhaustion in serverless Cloud Run environments.
func Connect(dsn string) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		return nil, fmt.Errorf("gorm open: %w", err)
	}

	// Retrieve the underlying *sql.DB so we can tune the connection pool.
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("retrieve sql.DB: %w", err)
	}

	// Connection pool settings — critical for Cloud Run "scale-to-zero" services
	// where many instances can spin up simultaneously.
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	slog.Info("database connection pool configured",
		slog.Int("max_idle_conns", 10),
		slog.Int("max_open_conns", 100),
		slog.Duration("conn_max_lifetime", time.Hour),
	)

	return db, nil
}

// AutoMigrate runs GORM's auto-migration for all application models.
// It creates or updates tables to match the current model definitions.
func AutoMigrate(db *gorm.DB) error {
	if err := db.AutoMigrate(
		&models.Property{},
		&models.FeeStructure{},
		&models.Unit{},
		&models.PriceRecord{},
	); err != nil {
		return fmt.Errorf("auto migrate: %w", err)
	}

	slog.Info("database schema migration complete")
	return nil
}

// Ping verifies that the database connection is alive.
func Ping(db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return fmt.Errorf("retrieve sql.DB for ping: %w", err)
	}
	if err := sqlDB.Ping(); err != nil {
		return fmt.Errorf("ping database: %w", err)
	}
	return nil
}
