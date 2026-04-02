package user

import (
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/faze3Development/true-cost/Server/internal/infrastructure/audit"
)

// Module bundles the service layer dependencies.
type Module struct {
	Service Service
}

// NewModule initializes the repository and service mapping.
func NewModule(db *gorm.DB, logger *zap.Logger, auditLogger *audit.AuditLogger) *Module {
	repo := NewRepository(db, logger)
	svc := NewService(repo, logger, auditLogger)

	return &Module{
		Service: svc,
	}
}
