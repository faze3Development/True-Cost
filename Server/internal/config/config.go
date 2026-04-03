// Package config loads application configuration from environment variables.
package config

import (
	"fmt"
	"strings"
	"time"
)

// Config holds all runtime configuration values for the application.
type Config struct {
	// Database
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string

	// Optional: force an effective role for request transactions.
	// This helps avoid accidentally running as a superuser (which bypasses Postgres RLS).
	DBRuntimeRole string

	// Database Connection Pool
	DBMaxIdleConns    int
	DBMaxOpenConns    int
	DBConnMaxLifetime time.Duration

	// Redis / Asynq
	RedisAddr string

	// Server
	Port               string
	CORSAllowedOrigins string

	// Producer (task enqueuer)
	ProducerPort string

	// Consumer (task worker)
	ConsumerConcurrency     int
	ConsumerShutdownTimeout time.Duration

	// Scraper
	ScraperTimeout    time.Duration
	ScraperSleep      time.Duration
	MaxJitterDuration time.Duration

	// Tasks
	MaxRetries      int
	TaskTimeout     time.Duration
	ConfidenceScore int
	DataSource      string

	// Stripe settings
	StripeSecretKey     string
	StripeWebhookSecret string
	StripeMode          string

	// Admin bootstrap
	AdminBootstrapSecret string

	// Dev bypass
	EnableMockAuth bool
}

// Load reads configuration from environment variables and returns a Config.
// Missing required fields cause an error to be returned.
func Load() (*Config, error) {
	envName := strings.ToLower(getEnv("ENV", "development"))
	allowMockAuth := getEnv("ENABLE_MOCK_AUTH", "false") == "true" && (envName == "development" || envName == "local")

	cfg := &Config{
		DBHost:        getEnv("DB_HOST", "localhost"),
		DBPort:        getEnv("DB_PORT", "5432"),
		DBUser:        getEnv("DB_USER", "postgres"),
		DBPassword:    getEnv("DB_PASSWORD", ""),
		DBName:        getEnv("DB_NAME", "truecost"),
		DBSSLMode:     getEnv("DB_SSLMODE", "disable"),
		DBRuntimeRole: getEnv("DB_RUNTIME_ROLE", ""),

		DBMaxIdleConns:    getEnvInt("DB_MAX_IDLE_CONNS", 10),
		DBMaxOpenConns:    getEnvInt("DB_MAX_OPEN_CONNS", 100),
		DBConnMaxLifetime: getEnvDuration("DB_CONN_MAX_LIFETIME", 1*time.Hour),

		RedisAddr:          getEnv("REDIS_ADDR", "localhost:6379"),
		Port:               getEnv("PORT", "8080"),
		CORSAllowedOrigins: getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000"),

		ProducerPort:            getEnv("PRODUCER_PORT", "8081"),
		ConsumerConcurrency:     getEnvInt("CONSUMER_CONCURRENCY", 5),
		ConsumerShutdownTimeout: getEnvDuration("CONSUMER_SHUTDOWN_TIMEOUT", 30*time.Second),

		ScraperTimeout:    getEnvDuration("SCRAPER_TIMEOUT", 45*time.Second),
		ScraperSleep:      getEnvDuration("SCRAPER_SLEEP", 2*time.Second),
		MaxJitterDuration: getEnvDuration("MAX_JITTER_DURATION", 60*time.Minute),

		MaxRetries:      getEnvInt("TASK_MAX_RETRIES", 3),
		TaskTimeout:     getEnvDuration("TASK_TIMEOUT", 60*time.Minute),
		ConfidenceScore: getEnvInt("CONFIDENCE_SCORE", 80),
		DataSource:      getEnv("DATA_SOURCE", "DirectSite"),

		StripeSecretKey:     getEnv("STRIPE_SECRET_KEY", ""),
		StripeWebhookSecret: getEnv("STRIPE_WEBHOOK_SECRET", ""),
		StripeMode:          getEnv("STRIPE_MODE", "test"),

		AdminBootstrapSecret: getEnv("ADMIN_BOOTSTRAP_SECRET", ""),
		EnableMockAuth:       allowMockAuth,
	}

	if cfg.DBPassword == "" {
		return nil, fmt.Errorf("DB_PASSWORD environment variable is required")
	}

	return cfg, nil
}

// DSN returns the PostgreSQL data source name for GORM.
func (c *Config) DSN() string {
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s TimeZone=UTC",
		c.DBHost, c.DBPort, c.DBUser, c.DBPassword, c.DBName, c.DBSSLMode,
	)
}
