package tenant

import (
	"context"
	"regexp"
	"strings"
)

const DefaultTenantKey = "default"

var tenantKeyPattern = regexp.MustCompile(`^[a-z0-9][a-z0-9._-]{1,63}$`)

type contextKey struct{}

func NormalizeTenantKey(value string) string {
	value = strings.TrimSpace(value)
	value = strings.ToLower(value)
	return value
}

func IsValidTenantKey(value string) bool {
	return tenantKeyPattern.MatchString(value)
}

func WithTenantKey(ctx context.Context, tenantKey string) context.Context {
	return context.WithValue(ctx, contextKey{}, tenantKey)
}

func FromContext(ctx context.Context) string {
	if ctx == nil {
		return DefaultTenantKey
	}
	if v, ok := ctx.Value(contextKey{}).(string); ok {
		v = NormalizeTenantKey(v)
		if v != "" {
			return v
		}
	}
	return DefaultTenantKey
}
