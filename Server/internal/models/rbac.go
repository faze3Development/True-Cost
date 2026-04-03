package models

import "time"

// Role is a tenant-scoped RBAC role.
// Users can have multiple roles.
type Role struct {
	BaseModel
	TenantKey    string `gorm:"not null;default:'default';uniqueIndex:ux_roles_tenant_key_name" json:"tenant_key"`
	Name         string `gorm:"not null;uniqueIndex:ux_roles_tenant_key_name" json:"name"`
	Description  string `gorm:"type:text" json:"description"`
	IsSuperAdmin bool   `gorm:"not null;default:false" json:"is_super_admin"`
}

// Permission is a global permission key.
// Roles acquire permissions through the role_permissions join table.
type Permission struct {
	BaseModel
	Key         string `gorm:"uniqueIndex;not null" json:"key"`
	Description string `gorm:"type:text" json:"description"`
}

// UserRole assigns a Role to a User.
type UserRole struct {
	UserID        string    `gorm:"type:uuid;primaryKey" json:"user_id"`
	RoleID        string    `gorm:"type:uuid;primaryKey" json:"role_id"`
	AssignedByUID string    `gorm:"index" json:"assigned_by_uid"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// RolePermission assigns a Permission to a Role.
type RolePermission struct {
	RoleID       string    `gorm:"type:uuid;primaryKey" json:"role_id"`
	PermissionID string    `gorm:"type:uuid;primaryKey" json:"permission_id"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}
