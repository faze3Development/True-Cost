// Package config loads application configuration from environment variables.
package config

import (
	"fmt"
	"os"
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

	// Redis / Asynq
	RedisAddr string

	// Server
	Port string
}

// Load reads configuration from environment variables and returns a Config.
// Missing required fields cause an error to be returned.
func Load() (*Config, error) {
	cfg := &Config{
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", ""),
		DBName:     getEnv("DB_NAME", "truecost"),
		DBSSLMode:  getEnv("DB_SSLMODE", "disable"),
		RedisAddr:  getEnv("REDIS_ADDR", "localhost:6379"),
		Port:       getEnv("PORT", "8080"),
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

func getEnv(key, defaultValue string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultValue
}
