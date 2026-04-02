package rbac

import "gorm.io/gorm"

// Module bundles the RBAC service.
type Module struct {
	Service Service
}

func NewModule(db *gorm.DB) *Module {
	repo := NewRepository(db)
	svc := NewService(repo)
	return &Module{Service: svc}
}
