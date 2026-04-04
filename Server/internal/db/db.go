// Package db manages the GORM PostgreSQL connection with production-safe
// connection pool settings for serverless Cloud Run environments.
package db

import (
	"fmt"
	"time"

	"go.uber.org/zap"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/faze3Development/true-cost/Server/internal/models"
)

// ConnectConfig opens a GORM PostgreSQL connection using the supplied DSN and
// configures the underlying sql.DB connection pool with the provided settings.
func ConnectConfig(dsn string, maxIdleConns, maxOpenConns int, connMaxLifetime time.Duration) (*gorm.DB, error) {
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
	sqlDB.SetMaxIdleConns(maxIdleConns)
	sqlDB.SetMaxOpenConns(maxOpenConns)
	sqlDB.SetConnMaxLifetime(connMaxLifetime)

	zap.L().Info("database connection pool configured",
		zap.Int("max_idle_conns", maxIdleConns),
		zap.Int("max_open_conns", maxOpenConns),
		zap.Duration("conn_max_lifetime", connMaxLifetime),
	)

	return db, nil
}

// Connect opens a GORM PostgreSQL connection using the supplied DSN and
// configures the underlying sql.DB connection pool with default settings
// for Cloud Run environments.
func Connect(dsn string) (*gorm.DB, error) {
	return ConnectConfig(dsn, 10, 100, time.Hour)
}

// AutoMigrate runs GORM's auto-migration for all application models.
// It creates or updates tables to match the current model definitions.
func AutoMigrate(db *gorm.DB) error {
	if err := db.AutoMigrate(
		&models.Property{},
		&models.FeeStructure{},
		&models.Unit{},
		&models.PriceRecord{},
		&models.User{},
		&models.SubscriptionTier{},
		&models.ResourceUsage{},
		&models.UserWatchlistAlert{},
		&models.SystemSetting{},
		&models.AdminNavConfig{},
		&models.AdminSetting{},
		&models.UserSavedProperty{},
		&models.SecurityEvent{},
		&models.AuditLog{},
	); err != nil {
		return fmt.Errorf("auto migrate: %w", err)
	}

	zap.L().Info("database schema migration complete")
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
