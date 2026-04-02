package db

import (
	"strings"

	"go.uber.org/zap"
	"gorm.io/gorm"
)

// WarnIfSuperuser logs a warning when connected as a Postgres superuser.
// Superusers bypass Row-Level Security (RLS), so tenant isolation policies will not be enforced.
func WarnIfSuperuser(db *gorm.DB) {
	if db == nil || db.Dialector == nil || db.Dialector.Name() != "postgres" {
		return
	}

	var isSuper string
	if err := db.Raw("SHOW is_superuser").Scan(&isSuper).Error; err != nil {
		zap.L().Warn("Failed to determine Postgres superuser status", zap.Error(err))
		return
	}

	if strings.EqualFold(strings.TrimSpace(isSuper), "on") {
		zap.L().Warn("Connected as a Postgres superuser; RLS tenant isolation will be bypassed")
	}
}
