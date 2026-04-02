package rbac

import (
	"context"
	"fmt"
	"strings"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/faze3Development/true-cost/Server/internal/infrastructure/tenant"
	"github.com/faze3Development/true-cost/Server/internal/models"
)

// Repository provides persistence operations for roles/permissions.
type Repository interface {
	EnsureBootstrapSuperAdmin(ctx context.Context, uid string) error
	UserHasPermission(ctx context.Context, uid, permissionKey string) (bool, error)
}

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) EnsureBootstrapSuperAdmin(ctx context.Context, uid string) error {
	uid = strings.TrimSpace(uid)
	if uid == "" {
		return fmt.Errorf("uid is required")
	}
	tenantKey := tenant.FromContext(ctx)

	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var user models.User
		if err := tx.Where("uid = ? AND tenant_key = ?", uid, tenantKey).First(&user).Error; err != nil {
			return err
		}

		role := models.Role{
			TenantKey:    tenantKey,
			Name:         SuperAdminRoleName,
			Description:  "Full administrative access",
			IsSuperAdmin: true,
		}

		if err := tx.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "tenant_key"}, {Name: "name"}},
			DoUpdates: clause.AssignmentColumns([]string{"description", "is_super_admin", "updated_at"}),
		}).Create(&role).Error; err != nil {
			return err
		}

		if role.ID == 0 {
			if err := tx.Where("tenant_key = ? AND name = ?", tenantKey, SuperAdminRoleName).First(&role).Error; err != nil {
				return err
			}
		}

		userRole := models.UserRole{
			UserID:        user.ID,
			RoleID:        role.ID,
			AssignedByUID: uid,
		}

		return tx.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "user_id"}, {Name: "role_id"}},
			DoNothing: true,
		}).Create(&userRole).Error
	})
}

func (r *repository) UserHasPermission(ctx context.Context, uid, permissionKey string) (bool, error) {
	uid = strings.TrimSpace(uid)
	permissionKey = strings.TrimSpace(permissionKey)
	if uid == "" || permissionKey == "" {
		return false, nil
	}

	tenantKey := tenant.FromContext(ctx)

	// Superadmin bypass
	var superCount int64
	if err := r.db.WithContext(ctx).
		Table("users").
		Joins("JOIN user_roles ur ON ur.user_id = users.id").
		Joins("JOIN roles r ON r.id = ur.role_id").
		Where("users.uid = ? AND users.tenant_key = ? AND r.tenant_key = ? AND r.is_super_admin = TRUE", uid, tenantKey, tenantKey).
		Count(&superCount).Error; err != nil {
		return false, err
	}
	if superCount > 0 {
		return true, nil
	}

	var permCount int64
	if err := r.db.WithContext(ctx).
		Table("users").
		Joins("JOIN user_roles ur ON ur.user_id = users.id").
		Joins("JOIN roles r ON r.id = ur.role_id").
		Joins("JOIN role_permissions rp ON rp.role_id = r.id").
		Joins("JOIN permissions p ON p.id = rp.permission_id").
		Where("users.uid = ? AND users.tenant_key = ? AND r.tenant_key = ? AND p.key = ?", uid, tenantKey, tenantKey, permissionKey).
		Count(&permCount).Error; err != nil {
		return false, err
	}

	return permCount > 0, nil
}
