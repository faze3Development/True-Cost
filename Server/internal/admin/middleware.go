package admin

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	appErrors "github.com/faze3Development/true-cost/Server/internal/infrastructure/errors"
	"github.com/faze3Development/true-cost/Server/internal/infrastructure/user"
)

// RequireAdmin ensures the authenticated user has an admin role.
func RequireAdmin(userService user.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		uidVal, exists := c.Get("userID")
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, appErrors.ErrUnauthorized("admin/missing_user", "User context missing"))
			return
		}

		uid, ok := uidVal.(string)
		if !ok || uid == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, appErrors.ErrUnauthorized("admin/invalid_user", "Invalid user context"))
			return
		}

		profile, err := userService.GetProfile(c.Request.Context(), uid)
		if err != nil {
			zap.L().Error("admin.RequireAdmin: failed to load profile", zap.Error(err), zap.String("uid", uid))
			c.AbortWithStatusJSON(http.StatusInternalServerError, appErrors.ErrInternal("admin/profile_lookup_failed", "Unable to verify admin role", err))
			return
		}

		if profile.Role != "admin" {
			c.AbortWithStatusJSON(http.StatusForbidden, appErrors.ErrForbidden("admin/forbidden", "Admin privileges required"))
			return
		}

		c.Next()
	}
}
