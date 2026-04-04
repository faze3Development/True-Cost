package audit

import (
	"context"
	"fmt"

	"github.com/faze3Development/true-cost/Server/internal/infrastructure/dbctx"
	"github.com/faze3Development/true-cost/Server/internal/infrastructure/tenant"
	"github.com/faze3Development/true-cost/Server/internal/models"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// Repository defines data access methods for audit logs.
type Repository interface {
	LogAccessDenial(ctx context.Context, log *models.AuditLog) error
	GetAuditLogs(ctx context.Context, filters map[string]interface{}) ([]models.AuditLog, error)
}

type repository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewRepository creates a new audit repository wrapper around GORM.
func NewRepository(db *gorm.DB, logger *zap.Logger) Repository {
	return &repository{
		db:     db,
		logger: logger,
	}
}

// LogAccessDenial records an access denial attempt to the audit log table.
// Logs are immutable once written and indexed for fast querying.
func (r *repository) LogAccessDenial(ctx context.Context, log *models.AuditLog) error {
	tenantKey := tenant.FromContext(ctx)
	db := dbctx.GetDB(ctx, r.db)

	// Ensure tenant key is set
	if log.TenantKey == "" {
		log.TenantKey = tenantKey
	}

	if err := db.WithContext(ctx).Create(log).Error; err != nil {
		r.logger.Error("failed to log access denial",
			zap.String("action", log.Action),
			zap.String("resource", log.Resource),
			zap.Error(err))
		return fmt.Errorf("error logging access denial: %w", err)
	}

	return nil
}

// GetAuditLogs retrieves audit logs with optional filters.
// Useful for security reviews and compliance reporting.
func (r *repository) GetAuditLogs(ctx context.Context, filters map[string]interface{}) ([]models.AuditLog, error) {
	var logs []models.AuditLog
	tenantKey := tenant.FromContext(ctx)
	db := dbctx.GetDB(ctx, r.db)

	// Always filter by tenant
	db = db.Where("tenant_key = ?", tenantKey)

	// Apply additional filters
	for key, value := range filters {
		db = db.Where(fmt.Sprintf("%s = ?", key), value)
	}

	// Order by creation time descending (newest first)
	if err := db.WithContext(ctx).Order("created_at DESC").Find(&logs).Error; err != nil {
		r.logger.Error("failed to fetch audit logs", zap.Error(err))
		return nil, fmt.Errorf("error fetching audit logs: %w", err)
	}

	return logs, nil
}
