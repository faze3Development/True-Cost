package admin

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"regexp"
	"strings"

	"github.com/faze3Development/true-cost/Server/internal/infrastructure/audit"
	"github.com/faze3Development/true-cost/Server/internal/models"
	"gorm.io/gorm"
)

var (
	settingKeyPattern         = regexp.MustCompile(`^[a-zA-Z0-9._-]{2,120}$`)
	errInvalidJSON            = errors.New("invalid JSON payload")
	errBootstrapSecretMissing = errors.New("bootstrap secret not configured")
	errBootstrapUnauthorized  = errors.New("invalid bootstrap secret")
	errBootstrapIdentity      = errors.New("either uid or email is required")
	errBootstrapUserNotFound  = errors.New("bootstrap target user not found")
)

// Service defines business operations for administrative configuration.
type Service interface {
	GetTopNavConfig(ctx context.Context) (string, error)
	UpdateTopNavConfig(ctx context.Context, configJSON, updatedByUID string) error
	ListSystemSettings(ctx context.Context) ([]models.SystemSetting, error)
	UpdateSystemSetting(ctx context.Context, key, value, description, updatedByUID string) error
	ListAdminSettings(ctx context.Context) ([]models.AdminSetting, error)
	ListTenants(ctx context.Context) ([]models.Tenant, error)
	CreateTenant(ctx context.Context, tenantKey, name, status, createdByUID string) (*models.Tenant, error)
	UpdateTenant(ctx context.Context, tenantKey string, name, status *string, updatedByUID string) (*models.Tenant, error)
	BootstrapInitialAdmin(ctx context.Context, bootstrapSecret, uid, email string) (string, error)
	ListRoles(ctx context.Context) ([]models.Role, error)
	CreateRole(ctx context.Context, name, description, createdByUID string) (*models.Role, error)
	ListPermissions(ctx context.Context) ([]models.Permission, error)
	SetRolePermissions(ctx context.Context, roleID string, permissionKeys []string, updatedByUID string) error
	SetUserRoles(ctx context.Context, userUID string, roleIDs []string, assignedByUID string) error
}

// RBACManager exposes RBAC operations needed by admin endpoints.
type RBACManager interface {
	EnsureBootstrapSuperAdmin(ctx context.Context, uid string) error
	ListRoles(ctx context.Context) ([]models.Role, error)
	CreateRole(ctx context.Context, name, description string) (*models.Role, error)
	ListPermissions(ctx context.Context) ([]models.Permission, error)
	SetRolePermissions(ctx context.Context, roleID string, permissionKeys []string) error
	SetUserRoles(ctx context.Context, userUID string, roleIDs []string, assignedByUID string) error
}

type service struct {
	repo            Repository
	auditLogger     *audit.AuditLogger
	bootstrapSecret string
	rbac            RBACManager
}

// NewService creates an admin service.
func NewService(repo Repository, auditLogger *audit.AuditLogger, bootstrapSecret string, rbac RBACManager) Service {
	return &service{repo: repo, auditLogger: auditLogger, bootstrapSecret: bootstrapSecret, rbac: rbac}
}

func (s *service) GetTopNavConfig(ctx context.Context) (string, error) {
	return s.repo.GetTopNavConfig(ctx)
}

func (s *service) UpdateTopNavConfig(ctx context.Context, configJSON, updatedByUID string) error {
	trimmed := strings.TrimSpace(configJSON)
	if trimmed == "" {
		trimmed = "{}"
	}
	if !json.Valid([]byte(trimmed)) {
		return errInvalidJSON
	}
	previous, err := s.repo.GetTopNavConfig(ctx)
	if err != nil {
		return err
	}

	if err := s.repo.UpsertTopNavConfig(ctx, trimmed, updatedByUID); err != nil {
		return err
	}

	if s.auditLogger != nil {
		_ = s.auditLogger.LogAdminAction(ctx, audit.AdminAction{
			AdminID:    updatedByUID,
			ActionType: "top_nav_config_updated",
			TargetUser: "system",
			PreviousData: map[string]interface{}{
				"top_nav_config": previous,
			},
			NewData: map[string]interface{}{
				"top_nav_config": trimmed,
			},
		})
	}

	return nil
}

func (s *service) ListSystemSettings(ctx context.Context) ([]models.SystemSetting, error) {
	return s.repo.ListSystemSettings(ctx)
}

func (s *service) UpdateSystemSetting(ctx context.Context, key, value, description, updatedByUID string) error {
	key = strings.TrimSpace(key)
	if !settingKeyPattern.MatchString(key) {
		return errors.New("invalid setting key")
	}
	if strings.TrimSpace(value) == "" {
		return errors.New("value cannot be empty")
	}

	var previousValue string
	if existing, err := s.repo.ListSystemSettings(ctx); err == nil {
		for _, setting := range existing {
			if setting.Key == key {
				previousValue = setting.Value
				break
			}
		}
	}

	if err := s.repo.UpsertSystemSetting(ctx, key, value, description, updatedByUID); err != nil {
		return err
	}

	if s.auditLogger != nil {
		_ = s.auditLogger.LogAdminAction(ctx, audit.AdminAction{
			AdminID:    updatedByUID,
			ActionType: "system_setting_upserted",
			TargetUser: "system",
			PreviousData: map[string]interface{}{
				"key":   key,
				"value": previousValue,
			},
			NewData: map[string]interface{}{
				"key":         key,
				"value":       value,
				"description": description,
			},
		})
	}

	return nil
}

func (s *service) ListAdminSettings(ctx context.Context) ([]models.AdminSetting, error) {
	return s.repo.ListAdminSettings(ctx)
}

func (s *service) ListTenants(ctx context.Context) ([]models.Tenant, error) {
	return s.repo.ListTenants(ctx)
}

func (s *service) CreateTenant(ctx context.Context, tenantKey, name, status, createdByUID string) (*models.Tenant, error) {
	tenantRow, err := s.repo.CreateTenant(ctx, tenantKey, name, status)
	if err != nil {
		return nil, err
	}

	if s.auditLogger != nil {
		_ = s.auditLogger.LogAdminAction(ctx, audit.AdminAction{
			AdminID:    createdByUID,
			ActionType: "tenant_created",
			TargetUser: tenantKey,
			NewData: map[string]interface{}{
				"tenant_key": tenantRow.TenantKey,
				"name":       tenantRow.Name,
				"status":     tenantRow.Status,
			},
		})
	}

	return tenantRow, nil
}

func (s *service) UpdateTenant(ctx context.Context, tenantKey string, name, status *string, updatedByUID string) (*models.Tenant, error) {
	updated, err := s.repo.UpdateTenant(ctx, tenantKey, name, status)
	if err != nil {
		return nil, err
	}

	if s.auditLogger != nil {
		newData := map[string]interface{}{
			"tenant_key": updated.TenantKey,
			"name":       updated.Name,
			"status":     updated.Status,
		}
		_ = s.auditLogger.LogAdminAction(ctx, audit.AdminAction{
			AdminID:    updatedByUID,
			ActionType: "tenant_updated",
			TargetUser: tenantKey,
			NewData:    newData,
		})
	}

	return updated, nil
}

func (s *service) BootstrapInitialAdmin(ctx context.Context, bootstrapSecret, uid, email string) (string, error) {
	if strings.TrimSpace(s.bootstrapSecret) == "" {
		return "", errBootstrapSecretMissing
	}

	if subtle.ConstantTimeCompare([]byte(strings.TrimSpace(bootstrapSecret)), []byte(strings.TrimSpace(s.bootstrapSecret))) != 1 {
		return "", errBootstrapUnauthorized
	}

	uid = strings.TrimSpace(uid)
	email = strings.TrimSpace(email)
	if uid == "" && email == "" {
		return "", errBootstrapIdentity
	}

	promotedUID, previousRole, err := s.repo.BootstrapInitialAdmin(ctx, uid, email)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", errBootstrapUserNotFound
		}
		return "", err
	}

	if s.rbac != nil {
		if err := s.rbac.EnsureBootstrapSuperAdmin(ctx, promotedUID); err != nil {
			// Best-effort rollback so bootstrap can be retried.
			_ = s.repo.SetUserRole(ctx, promotedUID, previousRole)
			return "", err
		}
	}

	if s.auditLogger != nil {
		_ = s.auditLogger.LogAdminAction(ctx, audit.AdminAction{
			AdminID:    promotedUID,
			ActionType: "bootstrap_initial_admin",
			TargetUser: promotedUID,
			PreviousData: map[string]interface{}{
				"role": previousRole,
			},
			NewData: map[string]interface{}{
				"role": "admin",
			},
			Reason: "initial admin bootstrap",
		})
	}

	return promotedUID, nil
}

func (s *service) ListRoles(ctx context.Context) ([]models.Role, error) {
	if s.rbac == nil {
		return nil, errors.New("rbac service not configured")
	}
	return s.rbac.ListRoles(ctx)
}

func (s *service) CreateRole(ctx context.Context, name, description, createdByUID string) (*models.Role, error) {
	if s.rbac == nil {
		return nil, errors.New("rbac service not configured")
	}
	role, err := s.rbac.CreateRole(ctx, name, description)
	if err != nil {
		return nil, err
	}

	if s.auditLogger != nil {
		_ = s.auditLogger.LogAdminAction(ctx, audit.AdminAction{
			AdminID:    createdByUID,
			ActionType: "rbac_role_created",
			TargetUser: role.Name,
			NewData: map[string]interface{}{
				"role_id":       role.ID,
				"tenant_key":    role.TenantKey,
				"name":          role.Name,
				"description":   role.Description,
				"is_superadmin": role.IsSuperAdmin,
			},
		})
	}

	return role, nil
}

func (s *service) ListPermissions(ctx context.Context) ([]models.Permission, error) {
	if s.rbac == nil {
		return nil, errors.New("rbac service not configured")
	}
	return s.rbac.ListPermissions(ctx)
}

func (s *service) SetRolePermissions(ctx context.Context, roleID string, permissionKeys []string, updatedByUID string) error {
	if s.rbac == nil {
		return errors.New("rbac service not configured")
	}
	if err := s.rbac.SetRolePermissions(ctx, roleID, permissionKeys); err != nil {
		return err
	}
	if s.auditLogger != nil {
		_ = s.auditLogger.LogAdminAction(ctx, audit.AdminAction{
			AdminID:    updatedByUID,
			ActionType: "rbac_role_permissions_updated",
			TargetUser: "role",
			NewData: map[string]interface{}{
				"role_id":         roleID,
				"permission_keys": permissionKeys,
			},
		})
	}
	return nil
}

func (s *service) SetUserRoles(ctx context.Context, userUID string, roleIDs []string, assignedByUID string) error {
	if s.rbac == nil {
		return errors.New("rbac service not configured")
	}
	if err := s.rbac.SetUserRoles(ctx, userUID, roleIDs, assignedByUID); err != nil {
		return err
	}
	if s.auditLogger != nil {
		_ = s.auditLogger.LogAdminAction(ctx, audit.AdminAction{
			AdminID:    assignedByUID,
			ActionType: "rbac_user_roles_updated",
			TargetUser: userUID,
			NewData: map[string]interface{}{
				"user_uid": userUID,
				"role_ids": roleIDs,
			},
		})
	}
	return nil
}
