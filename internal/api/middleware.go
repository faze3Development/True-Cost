package api

import (
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"
)

// requestLogger returns a Gin middleware that emits a structured slog entry
// for every HTTP request so that logs are easily parsable in GCP Cloud Logging.
func requestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		slog.Info("http request",
			slog.String("method", c.Request.Method),
			slog.String("path", c.Request.URL.Path),
			slog.Int("status", c.Writer.Status()),
			slog.Duration("latency", time.Since(start)),
			slog.String("client_ip", c.ClientIP()),
		)
	}
}
