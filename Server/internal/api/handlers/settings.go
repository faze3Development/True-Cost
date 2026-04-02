package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"github.com/faze3Development/true-cost/Server/internal/infrastructure/tenant"
	"github.com/faze3Development/true-cost/Server/internal/models"
)

// GetUserSettings returns the settings for the currently authenticated user.
func (h *Handler) GetUserSettings(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	uid := userID.(string)

	// The auth middleware guarantees this user exists if the token is valid.
	user, err := h.User.GetProfile(c.Request.Context(), uid)
	if err != nil {
		zap.L().Error("GetUserSettings: user service failed to retrieve profile", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch user context"})
		return
	}

	c.JSON(http.StatusOK, user)
}

// UpdateUserSettings updates the settings for the currently authenticated user.
func (h *Handler) UpdateUserSettings(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	uid := userID.(string)

	var input map[string]interface{}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	// For GORM, we want to construct a map of fields to dynamically update inside the embedded struct.
	// Since UpdateProfile takes a map[string]interface{}.
	updates := make(map[string]interface{})

	if raw, ok := input["theme"]; ok {
		theme, ok := raw.(string)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "theme must be a string"})
			return
		}
		updates["settings_theme"] = theme
	}
	if raw, ok := input["map_style"]; ok {
		mapStyle, ok := raw.(string)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "map_style must be a string"})
			return
		}
		updates["settings_map_style"] = mapStyle
	}
	if raw, ok := input["email_notifications"]; ok {
		enabled, ok := raw.(bool)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "email_notifications must be a boolean"})
			return
		}
		updates["settings_email_notifications"] = enabled
	}
	if raw, ok := input["two_factor_enabled"]; ok {
		enabled, ok := raw.(bool)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "two_factor_enabled must be a boolean"})
			return
		}
		updates["settings_two_factor_enabled"] = enabled
	}

	if raw, ok := input["top_nav_config"]; ok {
		switch value := raw.(type) {
		case string:
			updates["settings_top_nav_config"] = value
		default:
			encoded, err := json.Marshal(value)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "top_nav_config must be serializable JSON"})
				return
			}
			updates["settings_top_nav_config"] = string(encoded)
		}
	}

	user, err := h.User.UpdateProfile(c.Request.Context(), uid, updates)
	if err != nil {
		zap.L().Error("UpdateUserSettings: user service update failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update user settings"})
		return
	}

	c.JSON(http.StatusOK, user)
}

// GetSystemSettings returns the global system-level settings.
func (h *Handler) GetSystemSettings(c *gin.Context) {
	tenantKey := tenant.FromContext(c.Request.Context())
	var settings []models.SystemSetting
	if err := h.DB.Where("tenant_key = ?", tenantKey).Find(&settings).Error; err != nil {
		zap.L().Error("GetSystemSettings: db query failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch system settings"})
		return
	}

	// Convert to a simple key-value map for the frontend
	sysConfig := make(map[string]string)
	for _, s := range settings {
		sysConfig[s.Key] = s.Value
	}

	c.JSON(http.StatusOK, sysConfig)
}
