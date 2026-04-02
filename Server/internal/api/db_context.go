package api

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/faze3Development/true-cost/Server/internal/infrastructure/dbctx"
	"github.com/faze3Development/true-cost/Server/internal/infrastructure/errors"
	"github.com/faze3Development/true-cost/Server/internal/infrastructure/tenant"
)

var pgIdentPattern = regexp.MustCompile(`^[a-zA-Z_][a-zA-Z0-9_]*$`)

func formatPgIdentifier(ident string) (string, error) {
	if strings.ContainsRune(ident, '\x00') {
		return "", fmt.Errorf("identifier contains NUL")
	}
	if pgIdentPattern.MatchString(ident) {
		return ident, nil
	}
	// Quote as an identifier; escape embedded quotes by doubling.
	return `"` + strings.ReplaceAll(ident, `"`, `""`) + `"`, nil
}

func withTenantDBContext(db *gorm.DB, runtimeRole string) gin.HandlerFunc {
	runtimeRole = strings.TrimSpace(runtimeRole)

	roleSQL := ""
	if runtimeRole != "" {
		roleIdent, err := formatPgIdentifier(runtimeRole)
		if err != nil {
			return func(c *gin.Context) {
				c.Error(errors.ErrInternal("db/invalid_runtime_role", "Invalid DB_RUNTIME_ROLE configuration", err))
				c.Abort()
			}
		}
		roleSQL = "SET LOCAL ROLE " + roleIdent
	}

	return func(c *gin.Context) {
		if db == nil {
			c.Error(errors.ErrInternal("db/unavailable", "Database unavailable", nil))
			c.Abort()
			return
		}

		ctx := c.Request.Context()
		tenantKey := tenant.FromContext(ctx)

		tx := db.WithContext(ctx).Begin()
		if tx.Error != nil {
			c.Error(errors.ErrInternal("db/tx_begin_failed", "Failed to start database transaction", tx.Error))
			c.Abort()
			return
		}

		defer func() {
			if r := recover(); r != nil {
				_ = tx.Rollback().Error
				panic(r)
			}
		}()

		if roleSQL != "" {
			if err := tx.Exec(roleSQL).Error; err != nil {
				_ = tx.Rollback().Error
				c.Error(errors.ErrInternal("db/set_role_failed", "Failed to set database runtime role", err))
				c.Abort()
				return
			}
		}

		// Use a transaction-local setting so pooled connections can't leak tenant state.
		if err := tx.Exec("SELECT set_config('app.tenant_key', ?, true)", tenantKey).Error; err != nil {
			_ = tx.Rollback().Error
			c.Error(errors.ErrInternal("db/rls_set_tenant_failed", fmt.Sprintf("Failed to set tenant context for '%s'", tenantKey), err))
			c.Abort()
			return
		}

		ctx = dbctx.WithDB(ctx, tx)
		c.Request = c.Request.WithContext(ctx)

		c.Next()

		if err := tx.Commit().Error; err != nil {
			_ = tx.Rollback().Error
			c.Error(errors.ErrInternal("db/tx_commit_failed", "Failed to commit database transaction", err))
		}
	}
}
