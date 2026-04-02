package user

import (
	"context"
	"fmt"

	"github.com/faze3Development/true-cost/Server/internal/infrastructure/audit"
	"github.com/faze3Development/true-cost/Server/internal/models"
	"go.uber.org/zap"
)

// Service defines the business logic operations for the user identity and tiers.
type Service interface {
	GetProfile(ctx context.Context, uid string) (*models.User, error)
	GetOrCreateUser(ctx context.Context, uid, email, displayName string) (*models.User, error)
	UpdateProfile(ctx context.Context, uid string, updates map[string]interface{}) (*models.User, error)
	CheckQuota(ctx context.Context, uid, resourceType string, cost int) error
	IncrementUsage(ctx context.Context, uid, resourceType string, amount int) error

	// Subscription operations
	UpdateSubscription(ctx context.Context, uid, tierID, customerID, subscriptionID string) error
	CancelSubscription(ctx context.Context, customerID, subscriptionID string) error
}

type service struct {
	repo        Repository
	logger      *zap.Logger
	auditLogger *audit.AuditLogger
}

// NewService instantiates a new user service.
func NewService(repo Repository, logger *zap.Logger, auditLogger *audit.AuditLogger) Service {
	return &service{
		repo:        repo,
		logger:      logger,
		auditLogger: auditLogger,
	}
}

func (s *service) GetProfile(ctx context.Context, uid string) (*models.User, error) {
	return s.repo.GetUserByUID(ctx, uid)
}

func (s *service) GetOrCreateUser(ctx context.Context, uid, email, displayName string) (*models.User, error) {
	user, err := s.repo.GetOrCreateUser(ctx, uid, email, displayName)
	if err == nil {
		_ = s.auditLogger.LogAuthenticationSuccess(ctx, uid, "login", "unknown", "system")
	}
	return user, err
}

func (s *service) UpdateProfile(ctx context.Context, uid string, updates map[string]interface{}) (*models.User, error) {
	user, err := s.repo.UpdateUser(ctx, uid, updates)
	if err == nil {
		_ = s.auditLogger.LogSecurityEvent(ctx, audit.SecurityEvent{
			EventType: "user_profile_updated",
			Severity:  audit.SeverityInfo,
			UserID:    uid,
			EventData: map[string]interface{}{
				"updates": updates,
			},
		})
	}
	return user, err
}

func (s *service) CheckQuota(ctx context.Context, uid, resourceType string, cost int) error {
	user, err := s.repo.GetUserByUID(ctx, uid)
	if err != nil {
		return fmt.Errorf("failed to fetch user: %w", err)
	}

	tier, err := s.repo.GetTierByID(ctx, user.TierID)
	if err != nil {
		return fmt.Errorf("failed to fetch tier: %w", err)
	}

	// Calculate how much they've used so far
	used := 0
	for _, usage := range user.ResourceUsage {
		if usage.ResourceType == resourceType {
			used = usage.Used
			break
		}
	}

	// Map resource types to limits on the Tier
	var limit int
	switch resourceType {
	case "reports":
		limit = tier.MaxReports
	case "alerts":
		limit = tier.MaxAlerts
	default:
		// Default to denying unknown resources if not strictly mapped, or allowing if you want free reign
		return fmt.Errorf("unknown resource type: %s", resourceType)
	}

	if limit == -1 {
		return nil // -1 means unlimited
	}

	if used+cost > limit {
		_ = s.auditLogger.LogAuthorizationDenied(ctx, uid, resourceType, "quota_exceeded", "system")
		return fmt.Errorf("quota exceeded for %s: limit %d, used %d, requested %d", resourceType, limit, used, cost)
	}

	return nil
}

func (s *service) IncrementUsage(ctx context.Context, uid, resourceType string, amount int) error {
	// Normally we would check quota again synchronously here to avoid race conditions,
	// but for simplicity in GORM we are just incrementing via the repo.
	if err := s.CheckQuota(ctx, uid, resourceType, amount); err != nil {
		return err
	}
	return s.repo.IncrementResourceUsage(ctx, uid, resourceType, amount)
}

func (s *service) UpdateSubscription(ctx context.Context, uid, tierID, customerID, subscriptionID string) error {
	updates := map[string]interface{}{
		"tier_id":                tierID,
		"stripe_customer_id":     customerID,
		"stripe_subscription_id": subscriptionID,
	}
	_, err := s.repo.UpdateUser(ctx, uid, updates)
	if err == nil {
		s.logger.Info("User subscription updated", zap.String("uid", uid), zap.String("tier", tierID))
		_ = s.auditLogger.LogSecurityEvent(ctx, audit.SecurityEvent{
			EventType: "subscription_created",
			Severity:  audit.SeverityInfo,
			UserID:    uid,
			EventData: updates,
		})
	}
	return err
}

func (s *service) CancelSubscription(ctx context.Context, customerID, subscriptionID string) error {
	user, err := s.repo.GetUserByStripeCustomer(ctx, customerID)
	if err != nil {
		return err
	}

	// We safely downgrade them to the free tier
	updates := map[string]interface{}{
		"tier_id":                "free",
		"stripe_subscription_id": nil,
	}
	_, err = s.repo.UpdateUser(ctx, user.UID, updates)
	if err == nil {
		s.logger.Info("User subscription cancelled", zap.String("uid", user.UID))
		_ = s.auditLogger.LogSecurityEvent(ctx, audit.SecurityEvent{
			EventType: "subscription_cancelled",
			Severity:  audit.SeverityWarning,
			UserID:    user.UID,
			EventData: map[string]interface{}{
				"old_subscription_id": subscriptionID,
			},
		})
	}
	return err
}
