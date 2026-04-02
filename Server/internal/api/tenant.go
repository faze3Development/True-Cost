package api

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/faze3Development/true-cost/Server/internal/infrastructure/errors"
	"github.com/faze3Development/true-cost/Server/internal/infrastructure/tenant"
)

const tenantKeyHeader = "X-Tenant-Key"

func resolveTenant() gin.HandlerFunc {
	return func(c *gin.Context) {
		headerValue := strings.TrimSpace(c.GetHeader(tenantKeyHeader))
		resolved := tenant.NormalizeTenantKey(headerValue)
		if resolved == "" {
			resolved = tenant.DefaultTenantKey
		}

		if !tenant.IsValidTenantKey(resolved) {
			c.AbortWithStatusJSON(http.StatusBadRequest, errors.ErrValidation(
				"tenant/invalid_key",
				"Invalid tenant key",
				nil,
			))
			return
		}

		ctx := tenant.WithTenantKey(c.Request.Context(), resolved)
		c.Request = c.Request.WithContext(ctx)
		c.Set("tenantKey", resolved)

		c.Next()
	}
}
