package ratelimit

import (
	"net/http"
	"sync"

	"github.com/faze3Development/true-cost/Server/internal/infrastructure/audit"
	"github.com/faze3Development/true-cost/Server/internal/infrastructure/errors"
	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// IP rate limiter structure
type IPRateLimiter struct {
	ips map[string]*rate.Limiter
	mu  *sync.RWMutex
	r   rate.Limit
	b   int
}

// NewIPRateLimiter creates a new limiter for IPs
func NewIPRateLimiter(r rate.Limit, b int) *IPRateLimiter {
	return &IPRateLimiter{
		ips: make(map[string]*rate.Limiter),
		mu:  &sync.RWMutex{},
		r:   r,
		b:   b,
	}
}

// AddIP adds a new IP to the map
func (i *IPRateLimiter) AddIP(ip string) *rate.Limiter {
	i.mu.Lock()
	defer i.mu.Unlock()

	limiter := rate.NewLimiter(i.r, i.b)
	i.ips[ip] = limiter

	return limiter
}

// GetLimiter gets an existing limiter or creates a new one
func (i *IPRateLimiter) GetLimiter(ip string) *rate.Limiter {
	i.mu.RLock()
	limiter, exists := i.ips[ip]
	if !exists {
		i.mu.RUnlock()
		return i.AddIP(ip)
	}
	i.mu.RUnlock()
	return limiter
}

// RateLimitMiddleware enforces rate limiting per IP and logs violations
func RateLimitMiddleware(limiter *IPRateLimiter, auditLogger *audit.AuditLogger) gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		if !limiter.GetLimiter(ip).Allow() {
			userID, _ := c.Get("userID")
			uidStr, _ := userID.(string)

			// Log the rate limit violation via the audit layer
			auditLogger.LogRateLimitExceeded(
				c.Request.Context(),
				uidStr,
				c.Request.RequestURI,
				"rate-limit-blocked",
				ip,
				int64(limiter.r),
			)

			c.AbortWithStatusJSON(http.StatusTooManyRequests, errors.ErrTooManyRequests("rate_limit/exceeded", "Too many requests. Please wait a moment."))
			return
		}
		c.Next()
	}
}
