package stripe

import (
	"context"
	"encoding/json"
	"io"
	"net/http"

	"github.com/faze3Development/true-cost/Server/internal/infrastructure/errors"
	"github.com/stripe/stripe-go/v81"
	"github.com/stripe/stripe-go/v81/webhook"
	"go.uber.org/zap"
)

// WebhookService processes incoming webhooks from Stripe
type WebhookService struct {
	svc *Service
	logger *zap.Logger
}

func NewWebhookService(svc *Service, logger *zap.Logger) *WebhookService {
	return &WebhookService{
		svc: svc,
		logger: logger,
	}
}

// UserSubscriptionUpdater abstracts the actual implementation of how users are modified in db
type UserSubscriptionUpdater interface {
	UpdateSubscription(ctx context.Context, userID, tierID, customerID, subscriptionID string) error
	CancelSubscription(ctx context.Context, customerID, subscriptionID string) error
}

func (w *WebhookService) HandleWebhook(req *http.Request, updater UserSubscriptionUpdater) (*stripe.Event, error) {
	if !w.svc.IsConfigured() {
		return nil, errors.ErrInternal("stripe/unconfigured", "Payment system not configured", nil)
	}

	const MaxBodyBytes = int64(65536)
	req.Body = http.MaxBytesReader(nil, req.Body, MaxBodyBytes)
	payload, err := io.ReadAll(req.Body)
	if err != nil {
		return nil, errors.ErrValidation("stripe/payload_too_large", "Error reading request body", err)
	}

	sigHeader := req.Header.Get("Stripe-Signature")
	event, err := webhook.ConstructEvent(payload, sigHeader, w.svc.config.StripeWebhookSecret)
	if err != nil {
		w.logger.Warn("Failed to verify Stripe signature", zap.Error(err))
		return nil, errors.ErrUnauthorized("stripe/invalid_signature", "Invalid signature")
	}

	switch event.Type {
	case "checkout.session.completed":
		var session stripe.CheckoutSession
		if err := json.Unmarshal(event.Data.Raw, &session); err != nil {
			return nil, errors.ErrValidation("stripe/invalid_session", "Failed to decode session", err)
		}

		// Only process subscription creation
		if session.Mode != stripe.CheckoutSessionModeSubscription {
			w.logger.Info("Ignored non-subscription checkout session completion", zap.String("session_id", session.ID))
			return &event, nil
		}

		userID := session.Metadata["user_id"]
		tierID := session.Metadata["tier_id"]
		customerID := session.Customer.ID
		subID := session.Subscription.ID

		if userID != "" && tierID != "" {
			err = updater.UpdateSubscription(req.Context(), userID, tierID, customerID, subID)
			if err != nil {
				w.logger.Error("Failed to fulfill subscription order", zap.Error(err), zap.String("user", userID))
				return nil, errors.ErrInternal("stripe/fulfill_failed", "Failed to fulfill subscription order", err)
			}
			w.logger.Info("Subscription created successfully via webhook", zap.String("user", userID), zap.String("tier", tierID))
		}

	case "customer.subscription.deleted":
		var subscription stripe.Subscription
		if err := json.Unmarshal(event.Data.Raw, &subscription); err != nil {
			return nil, errors.ErrValidation("stripe/invalid_subscription", "Failed to decode subscription", err)
		}

		err = updater.CancelSubscription(req.Context(), subscription.Customer.ID, subscription.ID)
		if err != nil {
			w.logger.Error("Failed to cancel subscription", zap.Error(err), zap.String("sub", subscription.ID))
			return nil, errors.ErrInternal("stripe/cancel_failed", "Failed to properly cancel subscription", err)
		}
		w.logger.Info("Subscription cancelled successfully via webhook", zap.String("sub", subscription.ID))
	}

	return &event, nil
}
