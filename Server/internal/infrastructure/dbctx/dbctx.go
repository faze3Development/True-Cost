package dbctx

import (
	"context"

	"gorm.io/gorm"
)

type contextKey struct{}

// WithDB stores a request-scoped *gorm.DB (typically a transaction) in context.
func WithDB(ctx context.Context, db *gorm.DB) context.Context {
	if ctx == nil {
		ctx = context.Background()
	}
	return context.WithValue(ctx, contextKey{}, db)
}

// FromContext returns the request-scoped *gorm.DB if present.
func FromContext(ctx context.Context) (*gorm.DB, bool) {
	if ctx == nil {
		return nil, false
	}
	db, ok := ctx.Value(contextKey{}).(*gorm.DB)
	if !ok || db == nil {
		return nil, false
	}
	return db, true
}

// GetDB returns the context DB if present, otherwise fallback.
func GetDB(ctx context.Context, fallback *gorm.DB) *gorm.DB {
	if db, ok := FromContext(ctx); ok {
		return db
	}
	return fallback
}
