package admin

import (
	"context"
	"errors"
	"strings"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/faze3Development/true-cost/Server/internal/infrastructure/dbctx"
	"github.com/faze3Development/true-cost/Server/internal/infrastructure/tenant"
	"github.com/faze3Development/true-cost/Server/internal/models"
)

const (
	topNavScope = "global_top_nav"
	topNavKey   = "top_nav_config"
)

var errAdminAlreadyExists = errors.New("admin already exists")

var (
	errTenantAlreadyExists = errors.New("tenant already exists")
	errTenantNotFound      = errors.New("tenant not found")
)

// Repository provides persistence methods for admin configuration.
type Repository interface {
	GetTopNavConfig(ctx context.Context) (string, error)
	UpsertTopNavConfig(ctx context.Context, configJSON, updatedByUID string) error
	ListSystemSettings(ctx context.Context) ([]models.SystemSetting, error)
	UpsertSystemSetting(ctx context.Context, key, value, description, updatedByUID string) error
	ListAdminSettings(ctx context.Context) ([]models.AdminSetting, error)
	ListTenants(ctx context.Context) ([]models.Tenant, error)
	CreateTenant(ctx context.Context, tenantKey, name, status string) (*models.Tenant, error)
	UpdateTenant(ctx context.Context, tenantKey string, name, status *string) (*models.Tenant, error)
	BootstrapInitialAdmin(ctx context.Context, uid, email string) (string, string, error)
	SetUserRole(ctx context.Context, uid, role string) error
}

type repository struct {
	db *gorm.DB
}

// NewRepository creates a new admin repository.
func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) GetTopNavConfig(ctx context.Context) (string, error) {
	tenantKey := tenant.FromContext(ctx)
	db := dbctx.GetDB(ctx, r.db)
	var cfg models.AdminNavConfig
	err := db.WithContext(ctx).Where("tenant_key = ? AND scope = ?", tenantKey, topNavScope).First(&cfg).Error
	if err == nil {
		return cfg.ConfigJSON, nil
	}
	if err != nil && err != gorm.ErrRecordNotFound {
		return "", err
	}

	var setting models.SystemSetting
	err = db.WithContext(ctx).Where("tenant_key = ? AND key = ?", tenantKey, topNavKey).First(&setting).Error
	if err == nil {
		return setting.Value, nil
	}
	if err == gorm.ErrRecordNotFound {
		return "", nil
	}
	return "", err
}

func (r *repository) UpsertTopNavConfig(ctx context.Context, configJSON, updatedByUID string) error {
	tenantKey := tenant.FromContext(ctx)
	db := dbctx.GetDB(ctx, r.db)
	return db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		adminRow := models.AdminNavConfig{
			TenantKey:    tenantKey,
			Scope:        topNavScope,
			ConfigJSON:   configJSON,
			UpdatedByUID: updatedByUID,
		}

		if err := tx.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "tenant_key"}, {Name: "scope"}},
			DoUpdates: clause.AssignmentColumns([]string{"config_json", "updated_by_uid", "updated_at"}),
		}).Create(&adminRow).Error; err != nil {
			return err
		}

		systemRow := models.SystemSetting{
			TenantKey:   tenantKey,
			Key:         topNavKey,
			Value:       configJSON,
			Description: "Global top navigation runtime configuration",
		}

		if err := tx.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "tenant_key"}, {Name: "key"}},
			DoUpdates: clause.AssignmentColumns([]string{"value", "description", "updated_at"}),
		}).Create(&systemRow).Error; err != nil {
			return err
		}

		adminSetting := models.AdminSetting{
			TenantKey:    tenantKey,
			Key:          topNavKey,
			Value:        configJSON,
			Description:  "Global top navigation runtime configuration",
			UpdatedByUID: updatedByUID,
		}

		if err := tx.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "tenant_key"}, {Name: "key"}},
			DoUpdates: clause.AssignmentColumns([]string{"value", "description", "updated_by_uid", "updated_at"}),
		}).Create(&adminSetting).Error; err != nil {
			return err
		}

		return nil
	})
}

func (r *repository) ListSystemSettings(ctx context.Context) ([]models.SystemSetting, error) {
	tenantKey := tenant.FromContext(ctx)
	db := dbctx.GetDB(ctx, r.db)
	var settings []models.SystemSetting
	if err := db.WithContext(ctx).Where("tenant_key = ?", tenantKey).Order("key ASC").Find(&settings).Error; err != nil {
		return nil, err
	}
	return settings, nil
}

func (r *repository) UpsertSystemSetting(ctx context.Context, key, value, description, updatedByUID string) error {
	tenantKey := tenant.FromContext(ctx)
	db := dbctx.GetDB(ctx, r.db)
	return db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		setting := models.SystemSetting{
			TenantKey:   tenantKey,
			Key:         key,
			Value:       value,
			Description: description,
		}

		if err := tx.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "tenant_key"}, {Name: "key"}},
			DoUpdates: clause.AssignmentColumns([]string{"value", "description", "updated_at"}),
		}).Create(&setting).Error; err != nil {
			return err
		}

		adminSetting := models.AdminSetting{
			TenantKey:    tenantKey,
			Key:          key,
			Value:        value,
			Description:  description,
			UpdatedByUID: updatedByUID,
		}

		return tx.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "tenant_key"}, {Name: "key"}},
			DoUpdates: clause.AssignmentColumns([]string{"value", "description", "updated_by_uid", "updated_at"}),
		}).Create(&adminSetting).Error
	})
}

func (r *repository) ListAdminSettings(ctx context.Context) ([]models.AdminSetting, error) {
	tenantKey := tenant.FromContext(ctx)
	db := dbctx.GetDB(ctx, r.db)
	var settings []models.AdminSetting
	if err := db.WithContext(ctx).Where("tenant_key = ?", tenantKey).Order("key ASC").Find(&settings).Error; err != nil {
		return nil, err
	}
	return settings, nil
}

func (r *repository) ListTenants(ctx context.Context) ([]models.Tenant, error) {
	// Least-privilege: tenants can only view their own tenant record.
	currentTenantKey := tenant.FromContext(ctx)
	db := dbctx.GetDB(ctx, r.db)
	var current models.Tenant
	if err := db.WithContext(ctx).Where("tenant_key = ?", currentTenantKey).First(&current).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return []models.Tenant{}, nil
		}
		return nil, err
	}
	return []models.Tenant{current}, nil
}

func (r *repository) CreateTenant(ctx context.Context, tenantKey, name, status string) (*models.Tenant, error) {
	tenantKey = strings.TrimSpace(tenantKey)
	name = strings.TrimSpace(name)
	status = strings.TrimSpace(status)
	if status == "" {
		status = "active"
	}

	row := models.Tenant{TenantKey: tenantKey, Name: name, Status: status}
	db := dbctx.GetDB(ctx, r.db)
	res := db.WithContext(ctx).Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "tenant_key"}}, DoNothing: true}).Create(&row)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, errTenantAlreadyExists
	}
	return &row, nil
}

func (r *repository) UpdateTenant(ctx context.Context, tenantKey string, name, status *string) (*models.Tenant, error) {
	updates := make(map[string]interface{})
	if name != nil {
		trimmed := strings.TrimSpace(*name)
		if trimmed != "" {
			updates["name"] = trimmed
		}
	}
	if status != nil {
		trimmed := strings.TrimSpace(*status)
		if trimmed != "" {
			updates["status"] = trimmed
		}
	}

	if len(updates) == 0 {
		// Nothing to update; return the current row if it exists.
		var existing models.Tenant
		db := dbctx.GetDB(ctx, r.db)
		if err := db.WithContext(ctx).Where("tenant_key = ?", tenantKey).First(&existing).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return nil, errTenantNotFound
			}
			return nil, err
		}
		return &existing, nil
	}

	db := dbctx.GetDB(ctx, r.db)
	res := db.WithContext(ctx).Model(&models.Tenant{}).Where("tenant_key = ?", tenantKey).Updates(updates)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, errTenantNotFound
	}

	var updated models.Tenant
	if err := db.WithContext(ctx).Where("tenant_key = ?", tenantKey).First(&updated).Error; err != nil {
		return nil, err
	}
	return &updated, nil
}

func (r *repository) BootstrapInitialAdmin(ctx context.Context, uid, email string) (string, string, error) {
	var promotedUID string
	var previousRole string
	tenantKey := tenant.FromContext(ctx)
	db := dbctx.GetDB(ctx, r.db)

	err := db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var existingAdmins int64
		if err := tx.Model(&models.User{}).Where("role = ? AND tenant_key = ?", "admin", tenantKey).Count(&existingAdmins).Error; err != nil {
			return err
		}
		if existingAdmins > 0 {
			return errAdminAlreadyExists
		}

		var user models.User
		query := tx.Model(&models.User{}).Where("tenant_key = ?", tenantKey)
		if uid != "" {
			query = query.Where("uid = ?", uid)
		} else {
			query = query.Where("email = ?", email)
		}

		if err := query.First(&user).Error; err != nil {
			return err
		}

		previousRole = user.Role
		promotedUID = user.UID

		if user.Role != "admin" {
			if err := tx.Model(&models.User{}).Where("id = ?", user.ID).Update("role", "admin").Error; err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		return "", "", err
	}

	return promotedUID, previousRole, nil
}

func (r *repository) SetUserRole(ctx context.Context, uid, role string) error {
	tenantKey := tenant.FromContext(ctx)
	db := dbctx.GetDB(ctx, r.db)
	return db.WithContext(ctx).Model(&models.User{}).
		Where("uid = ? AND tenant_key = ?", uid, tenantKey).
		Update("role", role).Error
}
