package api

import (
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// requestLogger returns a Gin middleware that emits a structured log entry
// for every HTTP request so that logs are easily parsable in GCP Cloud Logging.
func requestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		zap.L().Info("http request",
			zap.String("method", c.Request.Method),
			zap.String("path", c.Request.URL.Path),
			zap.Int("status", c.Writer.Status()),
			zap.Duration("latency", time.Since(start)),
			zap.String("client_ip", c.ClientIP()),
		)
	}
}
