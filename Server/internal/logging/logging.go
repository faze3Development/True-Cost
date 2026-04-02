package logging

import (
	"fmt"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// Init builds a production JSON logger and installs it as the global zap logger.
// It matches AI Studio's structured logging architecture globally.
func Init(env, version string) (*zap.Logger, error) {
	cfg := zap.NewProductionConfig()
	cfg.Encoding = "json"
	cfg.EncoderConfig.TimeKey = "time"
	cfg.EncoderConfig.LevelKey = "level"
	cfg.EncoderConfig.MessageKey = "msg"
	cfg.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	cfg.EncoderConfig.EncodeLevel = zapcore.LowercaseLevelEncoder

	logger, err := cfg.Build()
	if err != nil {
		return nil, fmt.Errorf("build zap logger: %w", err)
	}

	// Tie AI Studio's global metadata bounds to the logging interceptors
	logger = logger.With(
		zap.String("service", "true-cost-api"),
		zap.String("env", env),
		zap.String("version", version),
	)

	zap.ReplaceGlobals(logger)
	return logger, nil
}
