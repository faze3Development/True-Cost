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
	BootstrapInitialAdmin(ctx context.Context, bootstrapSecret, uid, email string) (string, error)
}

// RBACBootstrapper assigns RBAC roles required for admin access.
type RBACBootstrapper interface {
	EnsureBootstrapSuperAdmin(ctx context.Context, uid string) error
}

type service struct {
	repo            Repository
	auditLogger     *audit.AuditLogger
	bootstrapSecret string
	rbac            RBACBootstrapper
}

// NewService creates an admin service.
func NewService(repo Repository, auditLogger *audit.AuditLogger, bootstrapSecret string, rbac RBACBootstrapper) Service {
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
