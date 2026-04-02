// Package api configures the Gin router and registers all application routes.
package api

import (
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
	"gorm.io/gorm"

	"github.com/faze3Development/true-cost/Server/internal/admin"
	"github.com/faze3Development/true-cost/Server/internal/api/handlers"
	"github.com/faze3Development/true-cost/Server/internal/config"
	"github.com/faze3Development/true-cost/Server/internal/infrastructure/audit"
	"github.com/faze3Development/true-cost/Server/internal/infrastructure/auth"
	"github.com/faze3Development/true-cost/Server/internal/infrastructure/businessValidation"
	"github.com/faze3Development/true-cost/Server/internal/infrastructure/errors"
	"github.com/faze3Development/true-cost/Server/internal/infrastructure/ratelimit"
	"github.com/faze3Development/true-cost/Server/internal/infrastructure/rbac"
	"github.com/faze3Development/true-cost/Server/internal/infrastructure/security"
	"github.com/faze3Development/true-cost/Server/internal/infrastructure/stripe"
	"github.com/faze3Development/true-cost/Server/internal/infrastructure/user"
	"go.uber.org/zap"
)

// NewRouter creates and returns a configured *gin.Engine.
func NewRouter(db *gorm.DB, cfg *config.Config, authClient *auth.Client) *gin.Engine {
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(requestLogger())
	r.Use(resolveTenant())

	// Initialize Audit Logger
	auditLogger := audit.NewAuditLogger(db, zap.L())

	// Apply Global Error Interceptor
	r.Use(errors.GlobalErrorHandler())

	// Establish request-scoped DB context for Postgres RLS.
	r.Use(withTenantDBContext(db, cfg.DBRuntimeRole))

	// Apply Security Headers & Anti-MIME sniff
	r.Use(security.SecurityHeaders())

	// Apply Advanced Security Filters
	secCfg := security.DefaultSecurityConfig()
	r.Use(security.RequestSizeLimit(secCfg.MaxRequestSize))                      // Protects against oversized payloads (10MB limit)
	r.Use(security.RequestTimeout(secCfg.RequestTimeout))                        // 30s context timeout bounds
	r.Use(security.IPFilter(secCfg.BlockedIPs))                                  // Deny known bad actors
	r.Use(security.ContentTypeFilter("application/json", "multipart/form-data")) // Strict Content Types

	// Apply Global IP Rate Limiting (10 requests/second, 20 burst)
	limiter := ratelimit.NewIPRateLimiter(rate.Limit(10), 20)
	r.Use(ratelimit.RateLimitMiddleware(limiter, auditLogger))

	corsConfig := cors.DefaultConfig()
	corsConfig.AllowOrigins = strings.Split(cfg.CORSAllowedOrigins, ",")
	corsConfig.AllowHeaders = []string{"Origin", "Content-Type", "Authorization", "X-Tenant-Key", "X-Admin-Bootstrap-Secret"}
	r.Use(cors.New(corsConfig))

	// Instantiate Stripe Infrastructure
	stripeSvc := stripe.NewService(cfg, zap.L())
	webhookSvc := stripe.NewWebhookService(stripeSvc, zap.L())

	// Instantiate User Infrastructure
	userModule := user.NewModule(db, zap.L(), auditLogger)
	rbacModule := rbac.NewModule(db)
	adminModule := admin.NewModule(db, auditLogger, cfg.AdminBootstrapSecret, rbacModule.Service)

	h := handlers.New(db, userModule.Service, stripeSvc, webhookSvc)

	v1 := r.Group("/api/v1")
	{
		v1.POST("/admin/bootstrap", adminModule.Handler.BootstrapInitialAdmin)

		// Public Routes
		v1.GET("/properties", h.ListProperties)
		v1.GET("/system/settings", h.GetSystemSettings)
		v1.POST("/stripe/webhook", h.StripeWebhook)

		// Protected Routes
		protected := v1.Group("")
		protected.Use(auth.EnsureAuthenticated(authClient, userModule.Service, cfg.EnableMockAuth))
		{

			// business Validation Example (Ensuring parameterized routes aren't empty)
			protected.GET("/properties/:id", businessValidation.EnsureResourceOwnership("id"), h.GetProperty)
			protected.GET("/properties/:id/units", businessValidation.EnsureResourceOwnership("id"), h.ListUnits)
			protected.GET("/units/:id/history", businessValidation.EnsureResourceOwnership("id"), h.GetUnitHistory)

			// User Protected Routes
			protected.GET("/users/me/settings", h.GetUserSettings)
			protected.PUT("/users/me/settings", h.UpdateUserSettings)
			protected.POST("/users/me/saved-properties/:id", h.AddSavedProperty)
			protected.DELETE("/users/me/saved-properties/:id", h.RemoveSavedProperty)
			protected.POST("/stripe/checkout", h.CreateCheckoutSession)
			protected.POST("/stripe/portal", h.CreateCustomerPortalSession)

			adminRoutes := protected.Group("/admin")
			adminRoutes.Use(admin.RequireAdmin(userModule.Service))
			{
				adminRoutes.GET("/top-nav-config", rbac.RequirePermission(rbacModule.Service, rbac.PermissionTopNavRead), adminModule.Handler.GetTopNavConfig)
				adminRoutes.PUT("/top-nav-config", rbac.RequirePermission(rbacModule.Service, rbac.PermissionTopNavWrite), adminModule.Handler.UpdateTopNavConfig)
				adminRoutes.GET("/settings", rbac.RequirePermission(rbacModule.Service, rbac.PermissionAdminSettingsRead), adminModule.Handler.ListAdminSettings)
				adminRoutes.GET("/system-settings", rbac.RequirePermission(rbacModule.Service, rbac.PermissionSystemSettingsRead), adminModule.Handler.ListSystemSettings)
				adminRoutes.PUT("/system-settings/:key", rbac.RequirePermission(rbacModule.Service, rbac.PermissionSystemSettingsWrite), adminModule.Handler.UpsertSystemSetting)
				adminRoutes.GET("/tenants", rbac.RequirePermission(rbacModule.Service, rbac.PermissionTenantsRead), adminModule.Handler.ListTenants)
				adminRoutes.POST("/tenants", rbac.RequirePermission(rbacModule.Service, rbac.PermissionTenantsWrite), adminModule.Handler.CreateTenant)
				adminRoutes.PUT("/tenants/:tenantKey", rbac.RequirePermission(rbacModule.Service, rbac.PermissionTenantsWrite), adminModule.Handler.UpdateTenant)
				adminRoutes.GET("/rbac/roles", rbac.RequirePermission(rbacModule.Service, rbac.PermissionRBACRead), adminModule.Handler.ListRoles)
				adminRoutes.POST("/rbac/roles", rbac.RequirePermission(rbacModule.Service, rbac.PermissionRBACWrite), adminModule.Handler.CreateRole)
				adminRoutes.GET("/rbac/permissions", rbac.RequirePermission(rbacModule.Service, rbac.PermissionRBACRead), adminModule.Handler.ListPermissions)
				adminRoutes.PUT("/rbac/roles/:roleID/permissions", rbac.RequirePermission(rbacModule.Service, rbac.PermissionRBACWrite), adminModule.Handler.SetRolePermissions)
				adminRoutes.PUT("/rbac/users/:uid/roles", rbac.RequirePermission(rbacModule.Service, rbac.PermissionRBACWrite), adminModule.Handler.SetUserRoles)
			}
		}
	}

	return r
}
