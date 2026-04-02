package migrations

import (
	"fmt"
	"time"

	"github.com/go-gormigrate/gormigrate/v2"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/faze3Development/true-cost/Server/internal/models"
)

// Run applies all pending migrations. It is safe to call on every start (idempotent).
func Run(db *gorm.DB) error {
	// clone default options so we can override without touching the shared singleton
	opts := *gormigrate.DefaultOptions
	opts.TableName = "schema_migrations"
	opts.IDColumnSize = 64
	opts.UseTransaction = true
	opts.ValidateUnknownMigrations = true

	m := gormigrate.New(db, &opts, []*gormigrate.Migration{
		{
			ID: "20240331_0001_init",
			Migrate: func(tx *gorm.DB) error {
				return tx.AutoMigrate(
					&models.Property{},
					&models.FeeStructure{},
					&models.Unit{},
					&models.PriceRecord{},
				)
			},
			Rollback: func(tx *gorm.DB) error {
				return tx.Migrator().DropTable(
					&models.PriceRecord{},
					&models.Unit{},
					&models.FeeStructure{},
					&models.Property{},
				)
			},
		},
		{
			ID: "20260401_0002_user_and_system_settings",
			Migrate: func(tx *gorm.DB) error {
				return tx.AutoMigrate(
					&models.User{},
					&models.SubscriptionTier{},
					&models.ResourceUsage{},
					&models.UserWatchlistAlert{},
					&models.SystemSetting{},
				)
			},
			Rollback: func(tx *gorm.DB) error {
				return tx.Migrator().DropTable(
					&models.SystemSetting{},
					&models.UserWatchlistAlert{},
					&models.ResourceUsage{},
					&models.SubscriptionTier{},
					&models.User{},
				)
			},
		},
		{
			ID: "20260401_0003_admin_nav_config",
			Migrate: func(tx *gorm.DB) error {
				return tx.AutoMigrate(&models.AdminNavConfig{})
			},
			Rollback: func(tx *gorm.DB) error {
				return tx.Migrator().DropTable(&models.AdminNavConfig{})
			},
		},
		{
			ID: "20260401_0004_admin_settings_and_audit",
			Migrate: func(tx *gorm.DB) error {
				return tx.AutoMigrate(
					&models.AdminSetting{},
					&models.SecurityEvent{},
				)
			},
			Rollback: func(tx *gorm.DB) error {
				return tx.Migrator().DropTable(
					&models.SecurityEvent{},
					&models.AdminSetting{},
				)
			},
		},
		{
			ID: "20260401_0005_tenants_and_rbac",
			Migrate: func(tx *gorm.DB) error {
				if err := tx.AutoMigrate(
					&models.Tenant{},
					&models.Role{},
					&models.Permission{},
					&models.UserRole{},
					&models.RolePermission{},
					&models.User{},
					&models.SystemSetting{},
					&models.AdminNavConfig{},
					&models.AdminSetting{},
					&models.SecurityEvent{},
				); err != nil {
					return err
				}

				// Ensure a default tenant exists.
				defaultTenant := models.Tenant{TenantKey: "default", Name: "Default", Status: "active"}
				if err := tx.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "tenant_key"}}, DoNothing: true}).Create(&defaultTenant).Error; err != nil {
					return err
				}

				// Backfill tenant_key for existing rows (safety).
				if err := tx.Exec("UPDATE users SET tenant_key = 'default' WHERE tenant_key IS NULL OR tenant_key = ''").Error; err != nil {
					return err
				}
				if err := tx.Exec("UPDATE system_settings SET tenant_key = 'default' WHERE tenant_key IS NULL OR tenant_key = ''").Error; err != nil {
					return err
				}
				if err := tx.Exec("UPDATE admin_nav_configs SET tenant_key = 'default' WHERE tenant_key IS NULL OR tenant_key = ''").Error; err != nil {
					return err
				}
				if err := tx.Exec("UPDATE admin_settings SET tenant_key = 'default' WHERE tenant_key IS NULL OR tenant_key = ''").Error; err != nil {
					return err
				}
				if err := tx.Exec("UPDATE security_events SET tenant_key = 'default' WHERE tenant_key IS NULL OR tenant_key = ''").Error; err != nil {
					return err
				}

				// Drop old single-column unique indexes so keys/scopes can be tenant-scoped.
				if err := tx.Exec("DROP INDEX IF EXISTS idx_system_settings_key").Error; err != nil {
					return err
				}
				if err := tx.Exec("DROP INDEX IF EXISTS idx_admin_nav_configs_scope").Error; err != nil {
					return err
				}
				if err := tx.Exec("DROP INDEX IF EXISTS idx_admin_settings_key").Error; err != nil {
					return err
				}

				// Ensure tenant-scoped unique indexes exist (idempotent).
				if err := tx.Exec("CREATE UNIQUE INDEX IF NOT EXISTS ux_system_settings_tenant_key_key ON system_settings (tenant_key, key)").Error; err != nil {
					return err
				}
				if err := tx.Exec("CREATE UNIQUE INDEX IF NOT EXISTS ux_admin_nav_configs_tenant_key_scope ON admin_nav_configs (tenant_key, scope)").Error; err != nil {
					return err
				}
				if err := tx.Exec("CREATE UNIQUE INDEX IF NOT EXISTS ux_admin_settings_tenant_key_key ON admin_settings (tenant_key, key)").Error; err != nil {
					return err
				}
				if err := tx.Exec("CREATE UNIQUE INDEX IF NOT EXISTS ux_roles_tenant_key_name ON roles (tenant_key, name)").Error; err != nil {
					return err
				}

				// Seed baseline permissions.
				permSeeds := []models.Permission{
					{Key: "admin:top_nav_config:read", Description: "Read tenant top navigation configuration"},
					{Key: "admin:top_nav_config:write", Description: "Update tenant top navigation configuration"},
					{Key: "admin:settings:read", Description: "Read admin-managed settings"},
					{Key: "admin:system_settings:read", Description: "Read tenant system settings"},
					{Key: "admin:system_settings:write", Description: "Write tenant system settings"},
				}
				for _, seed := range permSeeds {
					row := seed
					if err := tx.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "key"}}, DoUpdates: clause.AssignmentColumns([]string{"description", "updated_at"})}).Create(&row).Error; err != nil {
						return err
					}
				}

				// Ensure a default-tenant superadmin role exists.
				superRole := models.Role{TenantKey: "default", Name: "superadmin", Description: "Full administrative access", IsSuperAdmin: true}
				if err := tx.Clauses(clause.OnConflict{
					Columns:   []clause.Column{{Name: "tenant_key"}, {Name: "name"}},
					DoUpdates: clause.AssignmentColumns([]string{"description", "is_super_admin", "updated_at"}),
				}).Create(&superRole).Error; err != nil {
					return err
				}
				if superRole.ID == 0 {
					if err := tx.Where("tenant_key = ? AND name = ?", "default", "superadmin").First(&superRole).Error; err != nil {
						return err
					}
				}

				// Assign superadmin role to any existing admin users (backward compatible).
				if err := tx.Exec(`
					INSERT INTO user_roles (user_id, role_id, assigned_by_uid, created_at, updated_at)
					SELECT u.id, r.id, 'system', NOW(), NOW()
					FROM users u
					JOIN roles r ON r.tenant_key = u.tenant_key AND r.name = 'superadmin'
					WHERE u.role = 'admin'
					ON CONFLICT (user_id, role_id) DO NOTHING
				`).Error; err != nil {
					return err
				}

				return nil
			},
			Rollback: func(tx *gorm.DB) error {
				// Best-effort rollback for development environments.
				_ = tx.Migrator().DropTable(&models.RolePermission{}, &models.UserRole{}, &models.Permission{}, &models.Role{}, &models.Tenant{})
				_ = tx.Migrator().DropColumn(&models.User{}, "tenant_key")
				_ = tx.Migrator().DropColumn(&models.SystemSetting{}, "tenant_key")
				_ = tx.Migrator().DropColumn(&models.AdminNavConfig{}, "tenant_key")
				_ = tx.Migrator().DropColumn(&models.AdminSetting{}, "tenant_key")
				_ = tx.Migrator().DropColumn(&models.SecurityEvent{}, "tenant_key")
				return nil
			},
		},
	})

	m.InitSchema(func(tx *gorm.DB) error {
		if err := tx.AutoMigrate(
			&models.Property{},
			&models.FeeStructure{},
			&models.Unit{},
			&models.PriceRecord{},
			&models.User{},
			&models.SubscriptionTier{},
			&models.ResourceUsage{},
			&models.UserWatchlistAlert{},
			&models.SystemSetting{},
			&models.AdminNavConfig{},
			&models.AdminSetting{},
			&models.SecurityEvent{},
			&models.Tenant{},
			&models.Role{},
			&models.Permission{},
			&models.UserRole{},
			&models.RolePermission{},
		); err != nil {
			return fmt.Errorf("init schema: %w", err)
		}
		return nil
	})

	if err := m.Migrate(); err != nil {
		return fmt.Errorf("run migrations: %w", err)
	}

	return nil
}

// TimestampID is a helper to generate sortable IDs if you add new migrations.
func TimestampID(suffix string) string {
	return time.Now().UTC().Format("20060102_150405") + "_" + suffix
}
