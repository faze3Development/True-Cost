// Package config loads application configuration from environment variables.
package config

import (
	"os"
	"strconv"
	"time"
)

// getEnv retrieves an environment variable or returns a default value if not set.
func getEnv(key, defaultValue string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultValue
}

// getEnvInt retrieves an environment variable as an integer or returns a default.
func getEnvInt(key string, defaultValue int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return defaultValue
}

// getEnvDuration retrieves an environment variable as a duration or returns a default.
func getEnvDuration(key string, defaultValue time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return defaultValue
}
