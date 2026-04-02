package rbac

import (
	"context"

	"github.com/faze3Development/true-cost/Server/internal/models"
)

// Service implements RBAC operations used by middleware and bootstrap flows.
type Service interface {
	EnsureBootstrapSuperAdmin(ctx context.Context, uid string) error
	HasPermission(ctx context.Context, uid, permissionKey string) (bool, error)
	ListRoles(ctx context.Context) ([]models.Role, error)
	CreateRole(ctx context.Context, name, description string) (*models.Role, error)
	ListPermissions(ctx context.Context) ([]models.Permission, error)
	SetRolePermissions(ctx context.Context, roleID uint, permissionKeys []string) error
	SetUserRoles(ctx context.Context, userUID string, roleIDs []uint, assignedByUID string) error
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) EnsureBootstrapSuperAdmin(ctx context.Context, uid string) error {
	return s.repo.EnsureBootstrapSuperAdmin(ctx, uid)
}

func (s *service) HasPermission(ctx context.Context, uid, permissionKey string) (bool, error) {
	return s.repo.UserHasPermission(ctx, uid, permissionKey)
}

func (s *service) ListRoles(ctx context.Context) ([]models.Role, error) {
	return s.repo.ListRoles(ctx)
}

func (s *service) CreateRole(ctx context.Context, name, description string) (*models.Role, error) {
	return s.repo.CreateRole(ctx, name, description)
}

func (s *service) ListPermissions(ctx context.Context) ([]models.Permission, error) {
	return s.repo.ListPermissions(ctx)
}

func (s *service) SetRolePermissions(ctx context.Context, roleID uint, permissionKeys []string) error {
	return s.repo.SetRolePermissions(ctx, roleID, permissionKeys)
}

func (s *service) SetUserRoles(ctx context.Context, userUID string, roleIDs []uint, assignedByUID string) error {
	return s.repo.SetUserRoles(ctx, userUID, roleIDs, assignedByUID)
}
