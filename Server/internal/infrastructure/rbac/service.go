package rbac

import "context"

// Service implements RBAC operations used by middleware and bootstrap flows.
type Service interface {
	EnsureBootstrapSuperAdmin(ctx context.Context, uid string) error
	HasPermission(ctx context.Context, uid, permissionKey string) (bool, error)
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
