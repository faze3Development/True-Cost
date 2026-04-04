package audit

import (
	"net"

	"github.com/faze3Development/true-cost/Server/internal/models"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// Service provides audit logging functionality.
type Service interface {
	LogRouteAccessDenied(c *gin.Context, userID, email, requiredRole, userRole, reason string) error
	LogUnauthorizedAccess(c *gin.Context, resource string) error
}

type service struct {
	repo   Repository
	logger *zap.Logger
}

// NewService creates a new audit service.
func NewService(repo Repository, logger *zap.Logger) Service {
	return &service{
		repo:   repo,
		logger: logger,
	}
}

// LogRouteAccessDenied logs when a user has insufficient role for a route.
func (s *service) LogRouteAccessDenied(c *gin.Context, userID, email, requiredRole, userRole, reason string) error {
	log := &models.AuditLog{
		UserID:       userID,
		Email:        email,
		Action:       "ROUTE_ACCESS_DENIED",
		Resource:     c.Request.URL.Path,
		RequiredRole: requiredRole,
		UserRole:     userRole,
		Reason:       reason,
		IPAddress:    s.getClientIP(c),
		UserAgent:    c.Request.UserAgent(),
		statusCode:   403,
	}

	if err := s.repo.LogAccessDenial(c.Request.Context(), log); err != nil {
		s.logger.Error("failed to log route access denial",
			zap.String("user_id", userID),
			zap.String("resource", c.Request.URL.Path),
			zap.Error(err))
		// Don't return error; log writing should not block request flow
		return nil
	}

	return nil
}

// LogUnauthorizedAccess logs when a request lacks valid authentication.
func (s *service) LogUnauthorizedAccess(c *gin.Context, resource string) error {
	log := &models.AuditLog{
		Action:     "UNAUTHORIZED_ACCESS_ATTEMPT",
		Resource:   resource,
		Reason:     "Missing or invalid authentication token",
		IPAddress:  s.getClientIP(c),
		UserAgent:  c.Request.UserAgent(),
		statusCode: 401,
	}

	if err := s.repo.LogAccessDenial(c.Request.Context(), log); err != nil {
		s.logger.Error("failed to log unauthorized access",
			zap.String("resource", resource),
			zap.Error(err))
		return nil
	}

	return nil
}

// getClientIP extracts the client's IP address, accounting for proxies.
func (s *service) getClientIP(c *gin.Context) string {
	// Try X-Forwarded-For header first (for reverse proxies)
	if forwarded := c.GetHeader("X-Forwarded-For"); forwarded != "" {
		// X-Forwarded-For can contain multiple IPs; take the first
		if ip, _, err := net.SplitHostPort(forwarded); err == nil {
			return ip
		}
		return forwarded
	}

	// Fall back to direct connection IP
	return c.ClientIP()
}
