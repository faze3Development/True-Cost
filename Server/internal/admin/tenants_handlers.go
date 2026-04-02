package admin

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	appErrors "github.com/faze3Development/true-cost/Server/internal/infrastructure/errors"
	"github.com/faze3Development/true-cost/Server/internal/infrastructure/tenant"
)

type createTenantRequest struct {
	TenantKey string `json:"tenant_key" binding:"required"`
	Name      string `json:"name" binding:"required"`
	Status    string `json:"status"`
}

type updateTenantRequest struct {
	Name   *string `json:"name"`
	Status *string `json:"status"`
}

// ListTenants returns the current tenant (self-only).
func (h *Handler) ListTenants(c *gin.Context) {
	tenants, err := h.service.ListTenants(c.Request.Context())
	if err != nil {
		zap.L().Error("admin.ListTenants: failed", zap.Error(err))
		c.Error(appErrors.ErrInternal("admin/list_tenants_failed", "Failed to list tenants", err))
		return
	}
	c.JSON(http.StatusOK, tenants)
}

// CreateTenant creates a new tenant record.
func (h *Handler) CreateTenant(c *gin.Context) {
	uidVal, exists := c.Get("userID")
	if !exists {
		c.Error(appErrors.ErrUnauthorized("admin/missing_user", "User context missing"))
		return
	}
	adminUID, _ := uidVal.(string)

	var req createTenantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.Error(appErrors.ErrValidation("admin/invalid_tenant_payload", "tenant_key and name are required", nil))
		return
	}

	key := tenant.NormalizeTenantKey(req.TenantKey)
	if key == "" || !tenant.IsValidTenantKey(key) {
		c.Error(appErrors.ErrValidation("admin/invalid_tenant_key", "Invalid tenant key", nil))
		return
	}

	currentTenantKey := tenant.FromContext(c.Request.Context())
	if key != currentTenantKey {
		c.Error(appErrors.ErrForbidden("admin/tenant_cross_tenant_forbidden", "Cannot create another tenant"))
		return
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		c.Error(appErrors.ErrValidation("admin/invalid_tenant_name", "Tenant name is required", nil))
		return
	}

	status := strings.TrimSpace(req.Status)
	if status == "" {
		status = "active"
	}

	created, err := h.service.CreateTenant(c.Request.Context(), key, name, status, adminUID)
	if err != nil {
		switch {
		case errors.Is(err, errTenantAlreadyExists):
			c.Error(appErrors.ErrConflict("admin/tenant_exists", "Tenant already exists", gin.H{"tenant_key": key}))
			return
		default:
			zap.L().Error("admin.CreateTenant: failed", zap.Error(err))
			c.Error(appErrors.ErrInternal("admin/create_tenant_failed", "Failed to create tenant", err))
			return
		}
	}

	c.JSON(http.StatusCreated, created)
}

// UpdateTenant updates an existing tenant's name and/or status.
func (h *Handler) UpdateTenant(c *gin.Context) {
	uidVal, exists := c.Get("userID")
	if !exists {
		c.Error(appErrors.ErrUnauthorized("admin/missing_user", "User context missing"))
		return
	}
	adminUID, _ := uidVal.(string)

	key := tenant.NormalizeTenantKey(c.Param("tenantKey"))
	if key == "" || !tenant.IsValidTenantKey(key) {
		c.Error(appErrors.ErrValidation("admin/invalid_tenant_key", "Invalid tenant key", nil))
		return
	}

	currentTenantKey := tenant.FromContext(c.Request.Context())
	if key != currentTenantKey {
		c.Error(appErrors.ErrForbidden("admin/tenant_cross_tenant_forbidden", "Cannot update another tenant"))
		return
	}

	var req updateTenantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.Error(appErrors.ErrValidation("admin/invalid_tenant_payload", "Invalid request payload", nil))
		return
	}

	if req.Name == nil && req.Status == nil {
		c.Error(appErrors.ErrValidation("admin/no_tenant_updates", "At least one of name or status must be provided", nil))
		return
	}

	if req.Name != nil {
		trimmed := strings.TrimSpace(*req.Name)
		if trimmed == "" {
			c.Error(appErrors.ErrValidation("admin/invalid_tenant_name", "Tenant name cannot be empty", nil))
			return
		}
		req.Name = &trimmed
	}

	if req.Status != nil {
		trimmed := strings.TrimSpace(*req.Status)
		if trimmed == "" {
			c.Error(appErrors.ErrValidation("admin/invalid_tenant_status", "Tenant status cannot be empty", nil))
			return
		}
		req.Status = &trimmed
	}

	updated, err := h.service.UpdateTenant(c.Request.Context(), key, req.Name, req.Status, adminUID)
	if err != nil {
		switch {
		case errors.Is(err, errTenantNotFound):
			c.Error(appErrors.ErrNotFound("admin/tenant_not_found", "Tenant not found"))
			return
		default:
			zap.L().Error("admin.UpdateTenant: failed", zap.Error(err))
			c.Error(appErrors.ErrInternal("admin/update_tenant_failed", "Failed to update tenant", err))
			return
		}
	}

	c.JSON(http.StatusOK, updated)
}
