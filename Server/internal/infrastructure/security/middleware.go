package security

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/faze3Development/true-cost/Server/internal/infrastructure/errors"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// SecurityConfig holds configuration for the middleware layer
type SecurityConfig struct {
	MaxRequestSize int64
	RequestTimeout time.Duration
	BlockedIPs     []string
}

// DefaultSecurityConfig returns a secure default config
func DefaultSecurityConfig() *SecurityConfig {
	return &SecurityConfig{
		MaxRequestSize: 10 << 20, // 10 MB payload limit by default
		RequestTimeout: 30 * time.Second,
	}
}

// RequestSizeLimit protects the application from excessively large payloads
func RequestSizeLimit(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.ContentLength > maxBytes {
			c.AbortWithStatusJSON(http.StatusRequestEntityTooLarge, errors.ErrValidation("payload_too_large", "Request entity too large", nil))
			return
		}

		// Enforce parsing limit for form data / JSON using MaxBytesReader
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		c.Next()
	}
}

// RequestTimeout limits how long the request context stays alive processing
func RequestTimeout(timeout time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), timeout)
		defer cancel()

		c.Request = c.Request.WithContext(ctx)
		c.Next()
	}
}

// ContentTypeFilter ensures non-GET/DELETE routes actually carry valid acceptable formats
func ContentTypeFilter(allowedTypes ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method == http.MethodPost || c.Request.Method == http.MethodPut || c.Request.Method == http.MethodPatch {
			contentType := c.GetHeader("Content-Type")

			// Drop charset parameter
			if idx := strings.Index(contentType, ";"); idx != -1 {
				contentType = contentType[:idx]
			}
			contentType = strings.TrimSpace(contentType)

			allowed := false
			for _, allowedType := range allowedTypes {
				if contentType == allowedType {
					allowed = true
					break
				}
			}

			if !allowed {
				zap.L().Warn("invalid content type denied", zap.String("content_type", contentType), zap.String("path", c.Request.URL.Path))
				c.AbortWithStatusJSON(http.StatusUnsupportedMediaType, errors.ErrValidation("unsupported_media_type", "Invalid content type", nil))
				return
			}
		}

		c.Next()
	}
}

// IPFilter blocks requests from explicitly blacklisted IPs
func IPFilter(blockedIPs []string) gin.HandlerFunc {
	// Precompute lookup
	blockedMap := make(map[string]bool, len(blockedIPs))
	for _, ip := range blockedIPs {
		blockedMap[ip] = true
	}

	return func(c *gin.Context) {
		ip := c.ClientIP()
		if blockedMap[ip] {
			zap.L().Warn("blacklisted ip attempted access", zap.String("ip", ip), zap.String("path", c.Request.URL.Path))
			c.AbortWithStatusJSON(http.StatusForbidden, errors.ErrForbidden("ip_blocked", "Access Denied via IP rule"))
			return
		}
		c.Next()
	}
}
