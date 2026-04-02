package handlers

import (
	"net/http"

	"github.com/faze3Development/true-cost/Server/internal/infrastructure/stripe"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// CheckoutRequest represents the payload for creating a checkout session
type CheckoutRequest struct {
	TierID     string `json:"tier_id" binding:"required"`
	PriceID    string `json:"price_id" binding:"required"`
	SuccessURL string `json:"success_url" binding:"required,url"`
	CancelURL  string `json:"cancel_url" binding:"required,url"`
}

// CreateCheckoutSession initializes a Stripe Checkout for a subscription.
func (h *Handler) CreateCheckoutSession(c *gin.Context) {
	if h.Stripe == nil || !h.Stripe.IsConfigured() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Payment system not configured"})
		return
	}

	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req CheckoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}

	result, err := h.Stripe.CreateCheckoutSession(c.Request.Context(), stripe.CreateCheckoutSessionInput{
		UserID:     userID.(string),
		TierID:     req.TierID,
		PriceID:    req.PriceID,
		SuccessURL: req.SuccessURL,
		CancelURL:  req.CancelURL,
	})

	if err != nil {
		zap.L().Error("Failed to create checkout session", zap.Error(err), zap.String("userID", userID.(string)))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize checkout"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"session_id":  result.SessionID,
		"session_url": result.SessionURL,
	})
}

// StripeWebhook handles asynchronous events from Stripe.
func (h *Handler) StripeWebhook(c *gin.Context) {
	if h.Webhook == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Payment system not configured"})
		return
	}

	// Read event and act on it
	event, err := h.Webhook.HandleWebhook(c.Request, h.User)
	if err != nil {
		zap.L().Error("Webhook handling failed", zap.Error(err))
		// Log the error but Return 400 or 500 depending on nature of error
		c.JSON(http.StatusBadRequest, gin.H{"error": "Webhook processing failed"})
		return
	}

	zap.L().Info("Stripe Webhook Processed", zap.String("eventType", string(event.Type)))
	c.JSON(http.StatusOK, gin.H{"status": "received"})
}

// PortalRequest represents the payload for creating a customer portal session
type PortalRequest struct {
	ReturnURL string `json:"return_url" binding:"required,url"`
}

// CreateCustomerPortalSession initializes a Stripe Billing Portal session.
func (h *Handler) CreateCustomerPortalSession(c *gin.Context) {
	if h.Stripe == nil || !h.Stripe.IsConfigured() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Payment system not configured"})
		return
	}

	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req PortalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}

	dbUser, err := h.User.GetProfile(c.Request.Context(), userID.(string))
	if err != nil || dbUser == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "User not found"})
		return
	}

	if dbUser.StripeCustomerID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No billing customer found for user"})
		return
	}

	url, err := h.Stripe.CreateCustomerPortalSession(c.Request.Context(), dbUser.StripeCustomerID, req.ReturnURL)
	if err != nil {
		zap.L().Error("Failed to create portal session", zap.Error(err), zap.String("userID", userID.(string)))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize billing portal"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"url": url,
	})
}
