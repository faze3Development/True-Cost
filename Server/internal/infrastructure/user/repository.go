package user

import (
	"context"
	"fmt"

	"github.com/faze3Development/true-cost/Server/internal/infrastructure/dbctx"
	"github.com/faze3Development/true-cost/Server/internal/infrastructure/tenant"
	"github.com/faze3Development/true-cost/Server/internal/models"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// Repository defines the data access methods for users and tiers.
type Repository interface {
	GetUserByUID(ctx context.Context, uid string) (*models.User, error)
	GetOrCreateUser(ctx context.Context, uid, email, displayName string) (*models.User, error)
	UpdateUser(ctx context.Context, uid string, updates map[string]interface{}) (*models.User, error)
	GetTierByID(ctx context.Context, tierID string) (*models.SubscriptionTier, error)
	IncrementResourceUsage(ctx context.Context, uid, resourceType string, amount int) error
	GetUserByStripeCustomer(ctx context.Context, customerID string) (*models.User, error)
}

type repository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewRepository creates a new user repository wrapper around GORM.
func NewRepository(db *gorm.DB, logger *zap.Logger) Repository {
	return &repository{
		db:     db,
		logger: logger,
	}
}

func (r *repository) GetUserByUID(ctx context.Context, uid string) (*models.User, error) {
	var user models.User
	tenantKey := tenant.FromContext(ctx)
	db := dbctx.GetDB(ctx, r.db)
	if err := db.WithContext(ctx).Preload("SavedProperties").Where("uid = ? AND tenant_key = ?", uid, tenantKey).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("user not found")
		}
		return nil, err
	}
	return &user, nil
}

func (r *repository) GetUserByStripeCustomer(ctx context.Context, customerID string) (*models.User, error) {
	var user models.User
	tenantKey := tenant.FromContext(ctx)
	db := dbctx.GetDB(ctx, r.db)
	if err := db.WithContext(ctx).Where("stripe_customer_id = ? AND tenant_key = ?", customerID, tenantKey).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("user not found for customer %s", customerID)
		}
		return nil, err
	}
	return &user, nil
}

func (r *repository) GetOrCreateUser(ctx context.Context, uid, email, displayName string) (*models.User, error) {
	var user models.User
	tenantKey := tenant.FromContext(ctx)
	db := dbctx.GetDB(ctx, r.db)

	err := db.WithContext(ctx).Where("uid = ? AND tenant_key = ?", uid, tenantKey).First(&user).Error
	if err == nil {
		return &user, nil // found
	}

	if err != gorm.ErrRecordNotFound {
		return nil, fmt.Errorf("error querying user: %w", err)
	}

	// Create new user defaulting to 'free' tier
	user = models.User{
		TenantKey:   tenantKey,
		UID:         uid,
		Email:       email,
		DisplayName: displayName,
		TierID:      "free",
	}

	if err := db.WithContext(ctx).Create(&user).Error; err != nil {
		return nil, fmt.Errorf("error creating user: %w", err)
	}

	return &user, nil
}

func (r *repository) UpdateUser(ctx context.Context, uid string, updates map[string]interface{}) (*models.User, error) {
	if len(updates) == 0 {
		return r.GetUserByUID(ctx, uid)
	}
	tenantKey := tenant.FromContext(ctx)
	db := dbctx.GetDB(ctx, r.db)

	err := db.WithContext(ctx).Model(&models.User{}).Where("uid = ? AND tenant_key = ?", uid, tenantKey).Updates(updates).Error
	if err != nil {
		return nil, err
	}

	return r.GetUserByUID(ctx, uid)
}

func (r *repository) GetTierByID(ctx context.Context, tierID string) (*models.SubscriptionTier, error) {
	var tier models.SubscriptionTier
	db := dbctx.GetDB(ctx, r.db)
	if err := db.WithContext(ctx).Where("id = ?", tierID).First(&tier).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("tier not found")
		}
		return nil, err
	}
	return &tier, nil
}

func (r *repository) IncrementResourceUsage(ctx context.Context, uid, resourceType string, amount int) error {
	var user models.User
	tenantKey := tenant.FromContext(ctx)
	db := dbctx.GetDB(ctx, r.db)
	if err := db.WithContext(ctx).Where("uid = ? AND tenant_key = ?", uid, tenantKey).First(&user).Error; err != nil {
		return err
	}

	// Ensure the embedded slice isn't nil
	if user.ResourceUsage == nil {
		user.ResourceUsage = []models.ResourceUsage{}
	}

	found := false
	for i, tracking := range user.ResourceUsage {
		if tracking.ResourceType == resourceType {
			user.ResourceUsage[i].Used += amount
			found = true
			break
		}
	}

	if !found {
		user.ResourceUsage = append(user.ResourceUsage, models.ResourceUsage{
			ResourceType: resourceType,
			Used:         amount,
		})
	}

	// Save the JSONB / Array back cleanly
	return db.WithContext(ctx).Model(&user).Update("resource_usage", user.ResourceUsage).Error
}
