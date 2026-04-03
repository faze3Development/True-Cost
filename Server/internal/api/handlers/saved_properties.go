package handlers

import (
	"net/http"

	"github.com/faze3Development/true-cost/Server/internal/infrastructure/dbctx"
	"github.com/faze3Development/true-cost/Server/internal/models"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// AddSavedProperty bookmarks a property for the user.
func (h *Handler) AddSavedProperty(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	uid := userID.(string)

	propertyID, err := parseIDParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid property ID"})
		return
	}

	user, err := h.User.GetProfile(c.Request.Context(), uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch user"})
		return
	}

	db := dbctx.GetDB(c.Request.Context(), h.DB)

	savedProperty := models.UserSavedProperty{
		UserID:     user.ID,
		PropertyID: propertyID,
	}

	// db.Clauses(clause.OnConflict{DoNothing: true}).Create(&savedProperty)
	// Just use a simple Create. If it fails due to unique constraint, we can ignore or return error.
	if err := db.WithContext(c.Request.Context()).
		Where("user_id = ? AND property_id = ?", user.ID, propertyID).
		FirstOrCreate(&savedProperty).Error; err != nil {
		zap.L().Error("AddSavedProperty: failed to save property", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save property"})
		return
	}

	// Because we might have added one, let's requery or return OK
	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "property saved"})
}

// RemoveSavedProperty removes a bookmarked property for the user.
func (h *Handler) RemoveSavedProperty(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	uid := userID.(string)

	propertyID, err := parseIDParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid property ID"})
		return
	}

	user, err := h.User.GetProfile(c.Request.Context(), uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch user"})
		return
	}

	db := dbctx.GetDB(c.Request.Context(), h.DB)

	if err := db.WithContext(c.Request.Context()).
		Where("user_id = ? AND property_id = ?", user.ID, propertyID).
		Unscoped().
		Delete(&models.UserSavedProperty{}).Error; err != nil {
		zap.L().Error("RemoveSavedProperty: failed to remove saved property", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to remove property"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "property removed"})
}
