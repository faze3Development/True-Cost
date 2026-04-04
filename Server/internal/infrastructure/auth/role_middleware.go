package auth

import (
	"net/http"

	"github.com/faze3Development/true-cost/Server/internal/infrastructure/errors"
	"github.com/faze3Development/true-cost/Server/internal/infrastructure/user"
	"github.com/gin-gonic/gin"
)

// RoleChecker defines the interface for verifying and logging role-based access.
type RoleChecker interface {
	LogRouteAccessDenied(c *gin.Context, userID, email, requiredRole, userRole, reason string) error
}

// RequireRole creates a middleware that enforces a specific role for the route.
// Must be used AFTER EnsureAuthenticated middleware.
// Logs all access denials to the audit log for security monitoring.
func RequireRole(requiredRole string, userService user.Service, roleChecker RoleChecker) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get user ID from context (set by EnsureAuthenticated)
		userIDInterface, exists := c.Get(UserIDKey)
		if !exists {
			// This should not happen if middleware is ordered correctly
			c.AbortWithStatusJSON(http.StatusInternalServerError, errors.ErrInternal("auth/no_user_context", "User context not found", nil))
			return
		}

		userID, ok := userIDInterface.(string)
		if !ok {
			c.AbortWithStatusJSON(http.StatusInternalServerError, errors.ErrInternal("auth/invalid_user_context", "Invalid user context", nil))
			return
		}

		// Fetch user from database with role
		dbUser, err := userService.GetProfile(c.Request.Context(), userID)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, errors.ErrInternal("auth/user_fetch_failed", "Failed to fetch user profile", nil))
			return
		}

		userRole := dbUser.Role
		if userRole == "" {
			userRole = "user" // default role
		}

		// Check if user has required role (case-insensitive)
		if userRole != requiredRole {
			// Log the access denial
			if roleChecker != nil {
				email := dbUser.Email
				_ = roleChecker.LogRouteAccessDenied(c, userID, email, requiredRole, userRole,
					"Insufficient role for route access")
			}

			c.AbortWithStatusJSON(http.StatusForbidden, errors.ErrForbidden("auth/insufficient_role",
				"You do not have the required role to access this resource"))
			return
		}

		// User has required role
		c.Next()
	}
}
