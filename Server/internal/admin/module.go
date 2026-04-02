package admin

import (
	"gorm.io/gorm"

	"github.com/faze3Development/true-cost/Server/internal/infrastructure/audit"
)

// Module bundles admin dependencies.
type Module struct {
	Service Service
	Handler *Handler
}

// NewModule initializes the admin repository/service/handler stack.
func NewModule(db *gorm.DB, auditLogger *audit.AuditLogger, bootstrapSecret string, rbacManager RBACManager) *Module {
	repo := NewRepository(db)
	svc := NewService(repo, auditLogger, bootstrapSecret, rbacManager)
	h := NewHandler(svc)

	return &Module{
		Service: svc,
		Handler: h,
	}
}
