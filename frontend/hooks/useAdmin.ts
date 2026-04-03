import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchTenants,
  createTenant,
  updateTenant,
  fetchSystemSettings,
  upsertSystemSetting,
  fetchAdminSettings,
  fetchRoles,
  createRole,
  fetchPermissions,
  setRolePermissions,
  setUserRoles,
  type Tenant,
  type SystemSetting,
  type AdminSetting,
  type Role,
  type Permission,
} from "@/api/admin";

// Define Cache Keys
export const ADMIN_KEYS = {
  all: ["admin"] as const,
  tenants: () => [...ADMIN_KEYS.all, "tenants"] as const,
  systemSettings: () => [...ADMIN_KEYS.all, "systemSettings"] as const,
  adminSettings: () => [...ADMIN_KEYS.all, "adminSettings"] as const,
  roles: () => [...ADMIN_KEYS.all, "roles"] as const,
  permissions: () => [...ADMIN_KEYS.all, "permissions"] as const,
};

// Query Hooks
export function useTenants() {
  return useQuery<Tenant[]>({
    queryKey: ADMIN_KEYS.tenants(),
    queryFn: fetchTenants,
  });
}

export function useSystemSettings() {
  return useQuery<SystemSetting[]>({
    queryKey: ADMIN_KEYS.systemSettings(),
    queryFn: fetchSystemSettings,
  });
}

export function useAdminSettings() {
  return useQuery<AdminSetting[]>({
    queryKey: ADMIN_KEYS.adminSettings(),
    queryFn: fetchAdminSettings,
  });
}

export function useRoles() {
  return useQuery<Role[]>({
    queryKey: ADMIN_KEYS.roles(),
    queryFn: fetchRoles,
  });
}

export function usePermissions() {
  return useQuery<Permission[]>({
    queryKey: ADMIN_KEYS.permissions(),
    queryFn: fetchPermissions,
  });
}

// Mutation Hooks
export function useCreateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTenant,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.tenants() }),
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantKey, payload }: { tenantKey: string; payload: { name?: string; status?: string } }) =>
      updateTenant(tenantKey, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.tenants() }),
  });
}

export function useUpsertSystemSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, payload }: { key: string; payload: { value: string; description?: string } }) =>
      upsertSystemSetting(key, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.systemSettings() }),
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRole,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.roles() }),
  });
}

export function useSetRolePermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roleID, payload }: { roleID: string; payload: { permission_keys: string[] } }) =>
      setRolePermissions(roleID, payload),
  });
}

export function useSetUserRoles() {
  return useMutation({
    mutationFn: ({ uid, payload }: { uid: string; payload: { role_ids: string[] } }) =>
      setUserRoles(uid, payload),
  });
}
