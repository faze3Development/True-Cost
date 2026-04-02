package models

import "gorm.io/gorm"

// Tenant represents an isolated customer/account boundary in a multi-tenant deployment.
// For now we identify tenants by a stable string key (e.g. "default").
type Tenant struct {
	gorm.Model
	TenantKey string `gorm:"uniqueIndex;not null" json:"tenant_key"`
	Name      string `gorm:"not null" json:"name"`
	Status    string `gorm:"not null;default:'active'" json:"status"`
}
