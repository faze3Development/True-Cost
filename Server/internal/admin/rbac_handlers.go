package admin

import (
	"errors"
	"net/http"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"

	appErrors "github.com/faze3Development/true-cost/Server/internal/infrastructure/errors"
	infraRBAC "github.com/faze3Development/true-cost/Server/internal/infrastructure/rbac"
)

var roleNamePattern = regexp.MustCompile(`^[a-z0-9][a-z0-9._-]{1,63}$`)

type createRoleRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

type setRolePermissionsRequest struct {
	PermissionKeys []string `json:"permission_keys"`
}

type setUserRolesRequest struct {
	RoleIDs []string `json:"role_ids"`
}

// ListRoles returns tenant-scoped RBAC roles.
func (h *Handler) ListRoles(c *gin.Context) {
	roles, err := h.service.ListRoles(c.Request.Context())
	if err != nil {
		zap.L().Error("admin.ListRoles: failed", zap.Error(err))
		c.Error(appErrors.ErrInternal("admin/list_roles_failed", "Failed to list roles", err))
		return
	}
	c.JSON(http.StatusOK, roles)
}

// CreateRole creates a tenant-scoped RBAC role.
func (h *Handler) CreateRole(c *gin.Context) {
	uidVal, exists := c.Get("userID")
	if !exists {
		c.Error(appErrors.ErrUnauthorized("admin/missing_user", "User context missing"))
		return
	}
	adminUID, _ := uidVal.(string)

	var req createRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.Error(appErrors.ErrValidation("admin/invalid_role_payload", "name is required", nil))
		return
	}

	name := strings.ToLower(strings.TrimSpace(req.Name))
	if !roleNamePattern.MatchString(name) {
		c.Error(appErrors.ErrValidation("admin/invalid_role_name", "Role name must be 2-64 chars of [a-z0-9._-]", nil))
		return
	}

	created, err := h.service.CreateRole(c.Request.Context(), name, strings.TrimSpace(req.Description), adminUID)
	if err != nil {
		switch {
		case errors.Is(err, infraRBAC.ErrRoleAlreadyExists):
			c.Error(appErrors.ErrConflict("admin/role_exists", "Role already exists", gin.H{"name": name}))
			return
		default:
			zap.L().Error("admin.CreateRole: failed", zap.Error(err))
			c.Error(appErrors.ErrInternal("admin/create_role_failed", "Failed to create role", err))
			return
		}
	}

	c.JSON(http.StatusCreated, created)
}

// ListPermissions returns all known permission keys.
func (h *Handler) ListPermissions(c *gin.Context) {
	perms, err := h.service.ListPermissions(c.Request.Context())
	if err != nil {
		zap.L().Error("admin.ListPermissions: failed", zap.Error(err))
		c.Error(appErrors.ErrInternal("admin/list_permissions_failed", "Failed to list permissions", err))
		return
	}
	c.JSON(http.StatusOK, perms)
}

// SetRolePermissions replaces the role's permissions with the provided list.
func (h *Handler) SetRolePermissions(c *gin.Context) {
	uidVal, exists := c.Get("userID")
	if !exists {
		c.Error(appErrors.ErrUnauthorized("admin/missing_user", "User context missing"))
		return
	}
	adminUID, _ := uidVal.(string)

	roleIDRaw := strings.TrimSpace(c.Param("roleID"))
	parsed, err := uuid.Parse(roleIDRaw)
	if err != nil || parsed == uuid.Nil {
		c.Error(appErrors.ErrValidation("admin/invalid_role_id", "Invalid role ID", nil))
		return
	}
	roleID := parsed.String()

	var req setRolePermissionsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.Error(appErrors.ErrValidation("admin/invalid_role_permissions_payload", "Invalid request payload", nil))
		return
	}
	if req.PermissionKeys == nil {
		c.Error(appErrors.ErrValidation("admin/missing_permission_keys", "permission_keys is required", nil))
		return
	}

	if err := h.service.SetRolePermissions(c.Request.Context(), roleID, req.PermissionKeys, adminUID); err != nil {
		var unknownPerms *infraRBAC.UnknownPermissionKeysError
		switch {
		case errors.Is(err, infraRBAC.ErrRoleNotFound):
			c.Error(appErrors.ErrNotFound("admin/role_not_found", "Role not found"))
			return
		case errors.As(err, &unknownPerms):
			c.Error(appErrors.ErrValidation("admin/unknown_permissions", "One or more permission keys are unknown", gin.H{"missing": unknownPerms.Missing}))
			return
		default:
			zap.L().Error("admin.SetRolePermissions: failed", zap.Error(err))
			c.Error(appErrors.ErrInternal("admin/set_role_permissions_failed", "Failed to update role permissions", err))
			return
		}
	}

	c.Status(http.StatusNoContent)
}

// SetUserRoles replaces the user's assigned roles with the provided list.
func (h *Handler) SetUserRoles(c *gin.Context) {
	uidVal, exists := c.Get("userID")
	if !exists {
		c.Error(appErrors.ErrUnauthorized("admin/missing_user", "User context missing"))
		return
	}
	adminUID, _ := uidVal.(string)

	targetUID := strings.TrimSpace(c.Param("uid"))
	if targetUID == "" {
		c.Error(appErrors.ErrValidation("admin/invalid_user_uid", "User uid is required", nil))
		return
	}

	var req setUserRolesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.Error(appErrors.ErrValidation("admin/invalid_user_roles_payload", "Invalid request payload", nil))
		return
	}
	if req.RoleIDs == nil {
		c.Error(appErrors.ErrValidation("admin/missing_role_ids", "role_ids is required", nil))
		return
	}

	if err := h.service.SetUserRoles(c.Request.Context(), targetUID, req.RoleIDs, adminUID); err != nil {
		var unknownRoleIDs *infraRBAC.UnknownRoleIDsError
		switch {
		case errors.Is(err, infraRBAC.ErrUserNotFound):
			c.Error(appErrors.ErrNotFound("admin/user_not_found", "User not found"))
			return
		case errors.As(err, &unknownRoleIDs):
			c.Error(appErrors.ErrValidation("admin/unknown_role_ids", "One or more role IDs are unknown", gin.H{"missing": unknownRoleIDs.Missing}))
			return
		default:
			zap.L().Error("admin.SetUserRoles: failed", zap.Error(err))
			c.Error(appErrors.ErrInternal("admin/set_user_roles_failed", "Failed to update user roles", err))
			return
		}
	}

	c.Status(http.StatusNoContent)
}
