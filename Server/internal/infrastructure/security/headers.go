package security

import (
	"github.com/gin-gonic/gin"
)

// SecurityHeaders applies Helm-like HTTP security headers
func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Prevent MIME-sniffing
		c.Header("X-Content-Type-Options", "nosniff")
		// Prevent Clickjacking
		c.Header("X-Frame-Options", "DENY")
		// XSS Protection
		c.Header("X-XSS-Protection", "1; mode=block")
		// Referrer Policy
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		// Strict Transport Security (HSTS)
		c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		
		c.Next()
	}
}

// CORS wrapper if not already existing
func CORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*") // Restrict to localhost:3000 in prod
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization")
		
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		
		c.Next()
	}
}
