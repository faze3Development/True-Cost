package rbac

import (
	"net/http"

	"github.com/gin-gonic/gin"

	appErrors "github.com/faze3Development/true-cost/Server/internal/infrastructure/errors"
)

// RequirePermission enforces that the authenticated user has the given permission.
// Superadmin users are always allowed.
func RequirePermission(svc Service, permissionKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		uidVal, exists := c.Get("userID")
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, appErrors.ErrUnauthorized("rbac/missing_user", "User context missing"))
			return
		}

		uid, ok := uidVal.(string)
		if !ok || uid == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, appErrors.ErrUnauthorized("rbac/invalid_user", "Invalid user context"))
			return
		}

		allowed, err := svc.HasPermission(c.Request.Context(), uid, permissionKey)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, appErrors.ErrInternal("rbac/check_failed", "Failed to verify permissions", err))
			return
		}
		if !allowed {
			c.AbortWithStatusJSON(http.StatusForbidden, appErrors.ErrForbidden("rbac/forbidden", "Insufficient permissions"))
			return
		}

		c.Next()
	}
}
