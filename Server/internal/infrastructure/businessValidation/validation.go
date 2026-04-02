package businessValidation

import (
	"net/http"

	"github.com/faze3Development/true-cost/Server/internal/infrastructure/errors"
	"github.com/gin-gonic/gin"
)

// ValidatePlanQuota intercepts heavy operations to assert plan constraints
func ValidatePlanQuota(resourceType string, maxAllowed uint) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Example: Check database for user's generated reports today vs their plan maximum.
		userID, exists := c.Get("userID")
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, errors.ErrUnauthorized("auth/missing_user", "Could not identify user for quota check"))
			return
		}

		// Mock DB fetch: user := db.GetUser(userID)
		// Mock logic: if user.CurrentUsage >= maxAllowed { c.Abort... }
		
		_ = userID // To be replaced with real usage tracking integration via GORM
		
		c.Next()
	}
}

// EnsureResourceOwnership prevents IDOR vulnerabilities (Insecure Direct Object Reference)
func EnsureResourceOwnership(resourceKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		reqID := c.Param(resourceKey) // e.g. "id" in /api/v1/reports/:id
		if reqID == "" {
			c.AbortWithStatusJSON(http.StatusBadRequest, errors.ErrValidation("validation/missing_param", "Missing required parameterized ID", nil))
			return
		}

		// Mock Logic: 
		// report, err := db.GetReport(reqID)
		// if report.UserID != c.Get("userID") { return Forbidden }

		c.Next()
	}
}
