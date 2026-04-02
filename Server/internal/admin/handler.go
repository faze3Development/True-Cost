package admin

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	appErrors "github.com/faze3Development/true-cost/Server/internal/infrastructure/errors"
)

// Handler exposes admin-only API operations.
type Handler struct {
	service Service
}

// NewHandler creates a new admin HTTP handler.
func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

type topNavConfigRequest struct {
	TopNavConfig json.RawMessage `json:"top_nav_config" binding:"required"`
}

type systemSettingRequest struct {
	Value       string `json:"value" binding:"required"`
	Description string `json:"description"`
}

type bootstrapAdminRequest struct {
	UID   string `json:"uid"`
	Email string `json:"email"`
}

// GetTopNavConfig returns the globally persisted top nav config.
func (h *Handler) GetTopNavConfig(c *gin.Context) {
	configJSON, err := h.service.GetTopNavConfig(c.Request.Context())
	if err != nil {
		zap.L().Error("admin.GetTopNavConfig: failed", zap.Error(err))
		c.Error(appErrors.ErrInternal("admin/get_top_nav_failed", "Failed to fetch top nav config", err))
		return
	}

	if configJSON == "" {
		c.JSON(http.StatusOK, gin.H{"top_nav_config": gin.H{}})
		return
	}

	var parsed any
	if err := json.Unmarshal([]byte(configJSON), &parsed); err != nil {
		zap.L().Warn("admin.GetTopNavConfig: stored JSON malformed", zap.Error(err))
		c.JSON(http.StatusOK, gin.H{"top_nav_config": configJSON})
		return
	}

	c.JSON(http.StatusOK, gin.H{"top_nav_config": parsed})
}

// UpdateTopNavConfig updates the globally persisted top nav config.
func (h *Handler) UpdateTopNavConfig(c *gin.Context) {
	uidVal, exists := c.Get("userID")
	if !exists {
		c.Error(appErrors.ErrUnauthorized("admin/missing_user", "User context missing"))
		return
	}

	var req topNavConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.Error(appErrors.ErrValidation("admin/invalid_payload", "Request body must include top_nav_config", nil))
		return
	}

	if err := h.service.UpdateTopNavConfig(c.Request.Context(), string(req.TopNavConfig), uidVal.(string)); err != nil {
		if errors.Is(err, errInvalidJSON) {
			c.Error(appErrors.ErrValidation("admin/invalid_json", "top_nav_config must be valid JSON", nil))
			return
		}
		zap.L().Error("admin.UpdateTopNavConfig: failed", zap.Error(err))
		c.Error(appErrors.ErrInternal("admin/update_top_nav_failed", "Failed to update top nav config", err))
		return
	}

	c.Status(http.StatusNoContent)
}

// ListSystemSettings returns all system settings.
func (h *Handler) ListSystemSettings(c *gin.Context) {
	settings, err := h.service.ListSystemSettings(c.Request.Context())
	if err != nil {
		zap.L().Error("admin.ListSystemSettings: failed", zap.Error(err))
		c.Error(appErrors.ErrInternal("admin/list_system_settings_failed", "Failed to list system settings", err))
		return
	}
	c.JSON(http.StatusOK, settings)
}

// ListAdminSettings returns admin-managed runtime settings.
func (h *Handler) ListAdminSettings(c *gin.Context) {
	settings, err := h.service.ListAdminSettings(c.Request.Context())
	if err != nil {
		zap.L().Error("admin.ListAdminSettings: failed", zap.Error(err))
		c.Error(appErrors.ErrInternal("admin/list_admin_settings_failed", "Failed to list admin settings", err))
		return
	}
	c.JSON(http.StatusOK, settings)
}

// UpsertSystemSetting creates or updates a single system setting.
func (h *Handler) UpsertSystemSetting(c *gin.Context) {
	key := c.Param("key")
	uidVal, exists := c.Get("userID")
	if !exists {
		c.Error(appErrors.ErrUnauthorized("admin/missing_user", "User context missing"))
		return
	}

	var req systemSettingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.Error(appErrors.ErrValidation("admin/invalid_setting_payload", "value is required", nil))
		return
	}

	if err := h.service.UpdateSystemSetting(c.Request.Context(), key, req.Value, req.Description, uidVal.(string)); err != nil {
		if err.Error() == "invalid setting key" || err.Error() == "value cannot be empty" {
			c.Error(appErrors.ErrValidation("admin/invalid_setting", err.Error(), nil))
			return
		}
		zap.L().Error("admin.UpsertSystemSetting: failed", zap.Error(err), zap.String("key", key))
		c.Error(appErrors.ErrInternal("admin/upsert_system_setting_failed", "Failed to update system setting", err))
		return
	}

	c.Status(http.StatusNoContent)
}

// BootstrapInitialAdmin grants admin role to the first user when no admin exists.
func (h *Handler) BootstrapInitialAdmin(c *gin.Context) {
	var req bootstrapAdminRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.Error(appErrors.ErrValidation("admin/bootstrap_invalid_payload", "uid or email is required", nil))
		return
	}

	secret := c.GetHeader("X-Admin-Bootstrap-Secret")
	promotedUID, err := h.service.BootstrapInitialAdmin(c.Request.Context(), secret, req.UID, req.Email)
	if err != nil {
		switch {
		case errors.Is(err, errBootstrapSecretMissing):
			c.Error(appErrors.ErrForbidden("admin/bootstrap_disabled", "Admin bootstrap is disabled"))
			return
		case errors.Is(err, errBootstrapUnauthorized):
			c.Error(appErrors.ErrUnauthorized("admin/bootstrap_unauthorized", "Invalid bootstrap secret"))
			return
		case errors.Is(err, errBootstrapIdentity):
			c.Error(appErrors.ErrValidation("admin/bootstrap_identity_required", "uid or email is required", nil))
			return
		case errors.Is(err, errBootstrapUserNotFound):
			c.Error(appErrors.ErrValidation("admin/bootstrap_user_not_found", "Target user was not found", nil))
			return
		case errors.Is(err, errAdminAlreadyExists):
			c.Error(appErrors.ErrForbidden("admin/bootstrap_admin_exists", "Bootstrap blocked: admin already exists"))
			return
		default:
			zap.L().Error("admin.BootstrapInitialAdmin: failed", zap.Error(err))
			c.Error(appErrors.ErrInternal("admin/bootstrap_failed", "Failed to bootstrap admin", err))
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"uid": promotedUID, "role": "admin"})
}
