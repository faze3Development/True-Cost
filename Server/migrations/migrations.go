package migrations

import (
	"fmt"
	"time"

	"github.com/go-gormigrate/gormigrate/v2"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/faze3Development/true-cost/Server/internal/models"
)

func applyTenantRLS(tx *gorm.DB) error {
	if tx == nil {
		return nil
	}
	if tx.Dialector == nil || tx.Dialector.Name() != "postgres" {
		return nil
	}

	stmts := []string{
		// Enable + FORCE RLS on tenant-scoped tables.
		"ALTER TABLE tenants ENABLE ROW LEVEL SECURITY",
		"ALTER TABLE tenants FORCE ROW LEVEL SECURITY",
		"ALTER TABLE users ENABLE ROW LEVEL SECURITY",
		"ALTER TABLE users FORCE ROW LEVEL SECURITY",
		"ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY",
		"ALTER TABLE system_settings FORCE ROW LEVEL SECURITY",
		"ALTER TABLE admin_nav_configs ENABLE ROW LEVEL SECURITY",
		"ALTER TABLE admin_nav_configs FORCE ROW LEVEL SECURITY",
		"ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY",
		"ALTER TABLE admin_settings FORCE ROW LEVEL SECURITY",
		"ALTER TABLE roles ENABLE ROW LEVEL SECURITY",
		"ALTER TABLE roles FORCE ROW LEVEL SECURITY",
		"ALTER TABLE security_events ENABLE ROW LEVEL SECURITY",
		"ALTER TABLE security_events FORCE ROW LEVEL SECURITY",
		"ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY",
		"ALTER TABLE user_roles FORCE ROW LEVEL SECURITY",
		"ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY",
		"ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY",

		// Drop + recreate policies (idempotent upgrades).
		"DROP POLICY IF EXISTS tenant_isolation_tenants ON tenants",
		"CREATE POLICY tenant_isolation_tenants ON tenants USING (tenant_key = current_setting('app.tenant_key', true)) WITH CHECK (tenant_key = current_setting('app.tenant_key', true))",

		"DROP POLICY IF EXISTS tenant_isolation_users ON users",
		"CREATE POLICY tenant_isolation_users ON users USING (tenant_key = current_setting('app.tenant_key', true)) WITH CHECK (tenant_key = current_setting('app.tenant_key', true))",

		"DROP POLICY IF EXISTS tenant_isolation_system_settings ON system_settings",
		"CREATE POLICY tenant_isolation_system_settings ON system_settings USING (tenant_key = current_setting('app.tenant_key', true)) WITH CHECK (tenant_key = current_setting('app.tenant_key', true))",

		"DROP POLICY IF EXISTS tenant_isolation_admin_nav_configs ON admin_nav_configs",
		"CREATE POLICY tenant_isolation_admin_nav_configs ON admin_nav_configs USING (tenant_key = current_setting('app.tenant_key', true)) WITH CHECK (tenant_key = current_setting('app.tenant_key', true))",

		"DROP POLICY IF EXISTS tenant_isolation_admin_settings ON admin_settings",
		"CREATE POLICY tenant_isolation_admin_settings ON admin_settings USING (tenant_key = current_setting('app.tenant_key', true)) WITH CHECK (tenant_key = current_setting('app.tenant_key', true))",

		"DROP POLICY IF EXISTS tenant_isolation_roles ON roles",
		"CREATE POLICY tenant_isolation_roles ON roles USING (tenant_key = current_setting('app.tenant_key', true)) WITH CHECK (tenant_key = current_setting('app.tenant_key', true))",

		// Make security_events append-only: allow SELECT + INSERT only.
		"DROP POLICY IF EXISTS tenant_security_events_select ON security_events",
		"DROP POLICY IF EXISTS tenant_security_events_insert ON security_events",
		"CREATE POLICY tenant_security_events_select ON security_events FOR SELECT USING (tenant_key = current_setting('app.tenant_key', true))",
		"CREATE POLICY tenant_security_events_insert ON security_events FOR INSERT WITH CHECK (tenant_key = current_setting('app.tenant_key', true))",

		// Join-table isolation.
		"DROP POLICY IF EXISTS tenant_user_roles ON user_roles",
		"CREATE POLICY tenant_user_roles ON user_roles USING (EXISTS (SELECT 1 FROM users u WHERE u.id = user_roles.user_id AND u.tenant_key = current_setting('app.tenant_key', true)) AND EXISTS (SELECT 1 FROM roles r WHERE r.id = user_roles.role_id AND r.tenant_key = current_setting('app.tenant_key', true))) WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = user_roles.user_id AND u.tenant_key = current_setting('app.tenant_key', true)) AND EXISTS (SELECT 1 FROM roles r WHERE r.id = user_roles.role_id AND r.tenant_key = current_setting('app.tenant_key', true)))",

		"DROP POLICY IF EXISTS tenant_role_permissions ON role_permissions",
		"CREATE POLICY tenant_role_permissions ON role_permissions USING (EXISTS (SELECT 1 FROM roles r WHERE r.id = role_permissions.role_id AND r.tenant_key = current_setting('app.tenant_key', true))) WITH CHECK (EXISTS (SELECT 1 FROM roles r WHERE r.id = role_permissions.role_id AND r.tenant_key = current_setting('app.tenant_key', true)))",
	}

	for _, stmt := range stmts {
		if err := tx.Exec(stmt).Error; err != nil {
			return fmt.Errorf("apply tenant RLS: %w", err)
		}
	}

	return nil
}

// Run applies all pending migrations. It is safe to call on every start (idempotent).
func Run(db *gorm.DB) error {
	run := func(migrateDB *gorm.DB, useGormigrateTx bool) error {
		// clone default options so we can override without touching the shared singleton
		opts := *gormigrate.DefaultOptions
		opts.TableName = "schema_migrations"
		opts.IDColumnSize = 64
		opts.UseTransaction = useGormigrateTx
		opts.ValidateUnknownMigrations = true

		m := gormigrate.New(migrateDB, &opts, []*gormigrate.Migration{
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
					if superRole.ID == "" {
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
			{
				ID: "20260402_0006_admin_tenants_rbac_permissions",
				Migrate: func(tx *gorm.DB) error {
					permSeeds := []models.Permission{
						{Key: "admin:tenants:read", Description: "List tenants"},
						{Key: "admin:tenants:write", Description: "Create/update tenants"},
						{Key: "admin:rbac:read", Description: "Read roles and permissions"},
						{Key: "admin:rbac:write", Description: "Manage roles, role permissions, and user-role assignments"},
					}
					for _, seed := range permSeeds {
						row := seed
						if err := tx.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "key"}}, DoUpdates: clause.AssignmentColumns([]string{"description", "updated_at"})}).Create(&row).Error; err != nil {
							return err
						}
					}
					return nil
				},
				Rollback: func(tx *gorm.DB) error {
					// Intentionally left blank: permissions are generally append-only.
					return nil
				},
			},
			{
				ID: "20260402_0007_postgres_rls_tenant_isolation",
				Migrate: func(tx *gorm.DB) error {
					return applyTenantRLS(tx)
				},
				Rollback: func(tx *gorm.DB) error {
					// Intentionally no rollback: disabling RLS/immutability should be a deliberate operator decision.
					return nil
				},
			},
			{
				ID: "20260402_0008_user_saved_properties",
				Migrate: func(tx *gorm.DB) error {
					if err := tx.AutoMigrate(&models.UserSavedProperty{}); err != nil {
						return err
					}
					return nil
				},
				Rollback: func(tx *gorm.DB) error {
					return tx.Migrator().DropTable(&models.UserSavedProperty{})
				},
			},
			{
				ID: "20260402_0009_property_categories",
				Migrate: func(tx *gorm.DB) error {
					if !tx.Migrator().HasColumn(&models.Property{}, "property_type") {
						return tx.Migrator().AddColumn(&models.Property{}, "PropertyType")
					}
					return nil
				},
				Rollback: func(tx *gorm.DB) error {
					if tx.Migrator().HasColumn(&models.Property{}, "property_type") {
						return tx.Migrator().DropColumn(&models.Property{}, "PropertyType")
					}
					return nil
				},
			},
			{
				ID: "20260402_0010_create_logs_schema",
				Migrate: func(tx *gorm.DB) error {
					return tx.Exec("CREATE SCHEMA IF NOT EXISTS logs;").Error
				},
				Rollback: func(tx *gorm.DB) error {
					return tx.Exec("DROP SCHEMA IF EXISTS logs CASCADE;").Error
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
				&models.UserSavedProperty{},
			); err != nil {
				return fmt.Errorf("init schema: %w", err)
			}

			// Seed baseline multi-tenant + RBAC defaults (so InitSchema matches migrations).
			defaultTenant := models.Tenant{TenantKey: "default", Name: "Default", Status: "active"}
			if err := tx.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "tenant_key"}}, DoNothing: true}).Create(&defaultTenant).Error; err != nil {
				return fmt.Errorf("init schema: seed default tenant: %w", err)
			}

			permSeeds := []models.Permission{
				{Key: "admin:top_nav_config:read", Description: "Read tenant top navigation configuration"},
				{Key: "admin:top_nav_config:write", Description: "Update tenant top navigation configuration"},
				{Key: "admin:settings:read", Description: "Read admin-managed settings"},
				{Key: "admin:system_settings:read", Description: "Read tenant system settings"},
				{Key: "admin:system_settings:write", Description: "Write tenant system settings"},
				{Key: "admin:tenants:read", Description: "List tenants"},
				{Key: "admin:tenants:write", Description: "Create/update tenants"},
				{Key: "admin:rbac:read", Description: "Read roles and permissions"},
				{Key: "admin:rbac:write", Description: "Manage roles, role permissions, and user-role assignments"},
			}
			for _, seed := range permSeeds {
				row := seed
				if err := tx.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "key"}}, DoUpdates: clause.AssignmentColumns([]string{"description", "updated_at"})}).Create(&row).Error; err != nil {
					return fmt.Errorf("init schema: seed permissions: %w", err)
				}
			}

			superRole := models.Role{TenantKey: "default", Name: "superadmin", Description: "Full administrative access", IsSuperAdmin: true}
			if err := tx.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "tenant_key"}, {Name: "name"}},
				DoUpdates: clause.AssignmentColumns([]string{"description", "is_super_admin", "updated_at"}),
			}).Create(&superRole).Error; err != nil {
				return fmt.Errorf("init schema: seed superadmin role: %w", err)
			}

			if err := tx.Exec("CREATE SCHEMA IF NOT EXISTS logs;").Error; err != nil {
				return fmt.Errorf("init schema: create logs schema: %w", err)
			}

			if err := applyTenantRLS(tx); err != nil {
				return fmt.Errorf("init schema: apply tenant RLS: %w", err)
			}
			return nil
		})

		if err := m.Migrate(); err != nil {
			return fmt.Errorf("run migrations: %w", err)
		}

		return nil
	}

	// On a fresh Postgres DB, multiple services (api + worker) can start at once
	// and race creating the migration table / applying migrations. Serialize with
	// an advisory transaction lock to avoid duplicate DDL failures.
	if db != nil && db.Dialector != nil && db.Dialector.Name() == "postgres" {
		const migrationsLockID int64 = 702067265 // arbitrary but stable
		return db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Exec("SELECT pg_advisory_xact_lock(?)", migrationsLockID).Error; err != nil {
				return fmt.Errorf("acquire migrations lock: %w", err)
			}
			// We're already inside a transaction; running gormigrate with its own
			// per-migration transactions causes nested transaction issues in GORM.
			return run(tx, false)
		})
	}

	return run(db, true)
}

// TimestampID is a helper to generate sortable IDs if you add new migrations.
func TimestampID(suffix string) string {
	return time.Now().UTC().Format("20060102_150405") + "_" + suffix
}
