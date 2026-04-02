package rbac

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/faze3Development/true-cost/Server/internal/infrastructure/dbctx"
	"github.com/faze3Development/true-cost/Server/internal/infrastructure/tenant"
	"github.com/faze3Development/true-cost/Server/internal/models"
)

var (
	ErrRoleNotFound      = errors.New("role not found")
	ErrRoleAlreadyExists = errors.New("role already exists")
	ErrUserNotFound      = errors.New("user not found")
)

type UnknownPermissionKeysError struct {
	Missing []string
}

func (e *UnknownPermissionKeysError) Error() string {
	if e == nil || len(e.Missing) == 0 {
		return "unknown permission keys"
	}
	return "unknown permission keys: " + strings.Join(e.Missing, ", ")
}

type UnknownRoleIDsError struct {
	Missing []uint
}

func (e *UnknownRoleIDsError) Error() string {
	if e == nil || len(e.Missing) == 0 {
		return "unknown role IDs"
	}
	parts := make([]string, 0, len(e.Missing))
	for _, id := range e.Missing {
		parts = append(parts, fmt.Sprintf("%d", id))
	}
	return "unknown role IDs: " + strings.Join(parts, ", ")
}

// Repository provides persistence operations for roles/permissions.
type Repository interface {
	EnsureBootstrapSuperAdmin(ctx context.Context, uid string) error
	UserHasPermission(ctx context.Context, uid, permissionKey string) (bool, error)
	ListRoles(ctx context.Context) ([]models.Role, error)
	CreateRole(ctx context.Context, name, description string) (*models.Role, error)
	ListPermissions(ctx context.Context) ([]models.Permission, error)
	SetRolePermissions(ctx context.Context, roleID uint, permissionKeys []string) error
	SetUserRoles(ctx context.Context, userUID string, roleIDs []uint, assignedByUID string) error
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
	db := dbctx.GetDB(ctx, r.db)

	return db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
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
	db := dbctx.GetDB(ctx, r.db)

	// Superadmin bypass
	var superCount int64
	if err := db.WithContext(ctx).
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
	if err := db.WithContext(ctx).
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

func (r *repository) ListRoles(ctx context.Context) ([]models.Role, error) {
	tenantKey := tenant.FromContext(ctx)
	db := dbctx.GetDB(ctx, r.db)
	var roles []models.Role
	if err := db.WithContext(ctx).Where("tenant_key = ?", tenantKey).Order("name ASC").Find(&roles).Error; err != nil {
		return nil, err
	}
	return roles, nil
}

func (r *repository) CreateRole(ctx context.Context, name, description string) (*models.Role, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, fmt.Errorf("role name is required")
	}

	tenantKey := tenant.FromContext(ctx)
	db := dbctx.GetDB(ctx, r.db)
	role := models.Role{
		TenantKey:    tenantKey,
		Name:         name,
		Description:  strings.TrimSpace(description),
		IsSuperAdmin: false,
	}

	res := db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "tenant_key"}, {Name: "name"}},
		DoNothing: true,
	}).Create(&role)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, ErrRoleAlreadyExists
	}
	return &role, nil
}

func (r *repository) ListPermissions(ctx context.Context) ([]models.Permission, error) {
	var perms []models.Permission
	db := dbctx.GetDB(ctx, r.db)
	if err := db.WithContext(ctx).Order("key ASC").Find(&perms).Error; err != nil {
		return nil, err
	}
	return perms, nil
}

func (r *repository) SetRolePermissions(ctx context.Context, roleID uint, permissionKeys []string) error {
	tenantKey := tenant.FromContext(ctx)
	db := dbctx.GetDB(ctx, r.db)

	uniqueKeys := make([]string, 0, len(permissionKeys))
	seen := make(map[string]struct{}, len(permissionKeys))
	for _, k := range permissionKeys {
		k = strings.TrimSpace(k)
		if k == "" {
			continue
		}
		if _, ok := seen[k]; ok {
			continue
		}
		seen[k] = struct{}{}
		uniqueKeys = append(uniqueKeys, k)
	}

	return db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var role models.Role
		if err := tx.Where("id = ? AND tenant_key = ?", roleID, tenantKey).First(&role).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrRoleNotFound
			}
			return err
		}

		// Clear all permissions when an empty list is provided.
		if len(uniqueKeys) == 0 {
			return tx.Where("role_id = ?", roleID).Delete(&models.RolePermission{}).Error
		}

		var perms []models.Permission
		if err := tx.Where("key IN ?", uniqueKeys).Find(&perms).Error; err != nil {
			return err
		}

		found := make(map[string]struct{}, len(perms))
		for _, p := range perms {
			found[p.Key] = struct{}{}
		}
		missing := make([]string, 0)
		for _, k := range uniqueKeys {
			if _, ok := found[k]; !ok {
				missing = append(missing, k)
			}
		}
		if len(missing) > 0 {
			return &UnknownPermissionKeysError{Missing: missing}
		}

		if err := tx.Where("role_id = ?", roleID).Delete(&models.RolePermission{}).Error; err != nil {
			return err
		}

		rows := make([]models.RolePermission, 0, len(perms))
		for _, p := range perms {
			rows = append(rows, models.RolePermission{RoleID: roleID, PermissionID: p.ID})
		}
		return tx.Create(&rows).Error
	})
}

func (r *repository) SetUserRoles(ctx context.Context, userUID string, roleIDs []uint, assignedByUID string) error {
	userUID = strings.TrimSpace(userUID)
	if userUID == "" {
		return fmt.Errorf("user uid is required")
	}
	assignedByUID = strings.TrimSpace(assignedByUID)
	if assignedByUID == "" {
		assignedByUID = "system"
	}

	tenantKey := tenant.FromContext(ctx)
	db := dbctx.GetDB(ctx, r.db)

	uniqueRoleIDs := make([]uint, 0, len(roleIDs))
	seen := make(map[uint]struct{}, len(roleIDs))
	for _, id := range roleIDs {
		if id == 0 {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		uniqueRoleIDs = append(uniqueRoleIDs, id)
	}

	return db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var user models.User
		if err := tx.Where("uid = ? AND tenant_key = ?", userUID, tenantKey).First(&user).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrUserNotFound
			}
			return err
		}

		if len(uniqueRoleIDs) == 0 {
			return tx.Where("user_id = ?", user.ID).Delete(&models.UserRole{}).Error
		}

		var roles []models.Role
		if err := tx.Where("id IN ? AND tenant_key = ?", uniqueRoleIDs, tenantKey).Find(&roles).Error; err != nil {
			return err
		}
		found := make(map[uint]struct{}, len(roles))
		for _, r := range roles {
			found[r.ID] = struct{}{}
		}
		missing := make([]uint, 0)
		for _, id := range uniqueRoleIDs {
			if _, ok := found[id]; !ok {
				missing = append(missing, id)
			}
		}
		if len(missing) > 0 {
			return &UnknownRoleIDsError{Missing: missing}
		}

		if err := tx.Where("user_id = ?", user.ID).Delete(&models.UserRole{}).Error; err != nil {
			return err
		}

		rows := make([]models.UserRole, 0, len(uniqueRoleIDs))
		for _, id := range uniqueRoleIDs {
			rows = append(rows, models.UserRole{UserID: user.ID, RoleID: id, AssignedByUID: assignedByUID})
		}
		return tx.Create(&rows).Error
	})
}
