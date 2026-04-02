package stripe

import (
	"context"
	stderrors "errors"
	"fmt"
	"net/url"

	"github.com/faze3Development/true-cost/Server/internal/config"
	"github.com/faze3Development/true-cost/Server/internal/infrastructure/errors"
	"go.uber.org/zap"

	"github.com/stripe/stripe-go/v81"
	"github.com/stripe/stripe-go/v81/checkout/session"
)

// Service handles Stripe operations.
type Service struct {
	config *config.Config
	logger *zap.Logger
}

// NewService creates a new Stripe service.
func NewService(cfg *config.Config, logger *zap.Logger) *Service {
	if cfg.StripeSecretKey != "" {
		stripe.Key = cfg.StripeSecretKey
	}
	return &Service{
		config: cfg,
		logger: logger,
	}
}

// IsConfigured returns whether Stripe is properly configured.
func (s *Service) IsConfigured() bool {
	return s.config.StripeSecretKey != "" && s.config.StripeWebhookSecret != ""
}

// AppendSessionID validates the given success URL and appends a session_id query
// parameter set to Stripe's {CHECKOUT_SESSION_ID} template variable. Stripe replaces
// this template with the real session ID when redirecting the user after checkout.
func AppendSessionID(successURL string) (string, error) {
	if successURL == "" {
		return "", fmt.Errorf("invalid success URL")
	}

	parsed, err := url.Parse(successURL)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return "", fmt.Errorf("invalid success URL: %w", err)
	}

	q := parsed.Query()
	q.Set("session_id", "{CHECKOUT_SESSION_ID}")
	parsed.RawQuery = q.Encode()

	return parsed.String(), nil
}

// CreateCheckoutSessionInput contains the input for creating a checkout session.
type CreateCheckoutSessionInput struct {
	UserID     string
	TierID     string
	PriceID    string
	SuccessURL string
	CancelURL  string
}

// CreateCheckoutSessionResult contains the result of creating a checkout session.
type CreateCheckoutSessionResult struct {
	SessionID  string
	SessionURL string
}

// CreateCheckoutSession creates a Stripe Checkout session for subscription tier.
func (s *Service) CreateCheckoutSession(ctx context.Context, input CreateCheckoutSessionInput) (*CreateCheckoutSessionResult, error) {
	if !s.IsConfigured() {
		return nil, errors.ErrInternal("stripe/unconfigured", "Payment system not configured", nil)
	}

	modifiedSuccessURL, urlErr := AppendSessionID(input.SuccessURL)
	if urlErr != nil {
		return nil, errors.ErrInternal("stripe/invalid_url", "Invalid success URL", urlErr)
	}

	params := &stripe.CheckoutSessionParams{
		Mode: stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				Price:    stripe.String(input.PriceID),
				Quantity: stripe.Int64(1),
			},
		},
		SuccessURL: stripe.String(modifiedSuccessURL),
		CancelURL:  stripe.String(input.CancelURL),
		ClientReferenceID: stripe.String(input.UserID),
		SubscriptionData: &stripe.CheckoutSessionSubscriptionDataParams{
			Metadata: map[string]string{
				"user_id": input.UserID,
				"tier_id": input.TierID,
			},
		},
		Metadata: map[string]string{
			"user_id": input.UserID,
			"tier_id": input.TierID,
		},
	}

	sess, err := session.New(params)
	if err != nil {
		s.logger.Error("Failed to create checkout session", zap.Error(err), zap.String("userID", input.UserID))
		return nil, errors.ErrInternal("stripe/checkout_failed", "Failed to create checkout session", err)
	}

	s.logger.Info("Checkout session created", zap.String("sessionID", sess.ID), zap.String("userID", input.UserID), zap.String("tier_id", input.TierID))

	return &CreateCheckoutSessionResult{
		SessionID:  sess.ID,
		SessionURL: sess.URL,
	}, nil
}

// VerifySessionResult contains the result of verifying a checkout session.
type VerifySessionResult struct {
	Verified bool
	TierID   string
}

// VerifySession retrieves a Stripe Checkout Session by ID and checks if payment_status is "paid".
func (s *Service) VerifySession(ctx context.Context, sessionID string) (*VerifySessionResult, error) {
	if !s.IsConfigured() {
		return nil, errors.ErrInternal("stripe/unconfigured", "Payment system not configured", nil)
	}

	sess, err := session.Get(sessionID, nil)
	if err != nil {
		var stripeErr *stripe.Error
		if stderrors.As(err, &stripeErr) && stripeErr.Code == stripe.ErrorCodeResourceMissing {
			return &VerifySessionResult{Verified: false}, nil
		}
		s.logger.Error("Failed to verify checkout session", zap.Error(err), zap.String("sessionID", sessionID))
		return nil, errors.ErrInternal("stripe/verify_failed", "Failed to verify session with payment provider", err)
	}

	return &VerifySessionResult{
		Verified: sess.PaymentStatus == stripe.CheckoutSessionPaymentStatusPaid,
		TierID:   sess.Metadata["tier_id"],
	}, nil
}
