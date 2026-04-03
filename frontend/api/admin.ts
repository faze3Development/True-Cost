import { apiClient } from "./client";
import { type TopNavRuntimeConfig } from "@/routes";

export type BaseModel = {
  id: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: unknown;
};

export type Tenant = BaseModel & {
  tenant_key: string;
  name: string;
  status: string;
};

export type SystemSetting = BaseModel & {
  tenant_key: string;
  key: string;
  value: string;
  description?: string;
};

export type AdminSetting = BaseModel & {
  tenant_key: string;
  key: string;
  value: string;
  description?: string;
  updated_by_uid?: string;
};

export type Role = BaseModel & {
  tenant_key: string;
  name: string;
  description?: string;
  is_super_admin: boolean;
};

export type Permission = BaseModel & {
  key: string;
  description?: string;
};

export const fetchAdminTopNavConfig = async () => {
  const response = await apiClient.get("/admin/top-nav-config");
  return response.data;
};

export const updateAdminTopNavConfig = async (config: TopNavRuntimeConfig) => {
  const response = await apiClient.put("/admin/top-nav-config", config);
  return response.data;
};

export const fetchTenants = async (): Promise<Tenant[]> => {
  const response = await apiClient.get<Tenant[]>("/admin/tenants");
  return response.data;
};

export const createTenant = async (payload: { tenant_key: string; name: string; status?: string }): Promise<Tenant> => {
  const response = await apiClient.post<Tenant>("/admin/tenants", payload);
  return response.data;
};

export const updateTenant = async (tenantKey: string, payload: { name?: string; status?: string }): Promise<Tenant> => {
  const response = await apiClient.put<Tenant>(`/admin/tenants/${encodeURIComponent(tenantKey)}`, payload);
  return response.data;
};

export const fetchSystemSettings = async (): Promise<SystemSetting[]> => {
  const response = await apiClient.get<SystemSetting[]>("/admin/system-settings");
  return response.data;
};

export const upsertSystemSetting = async (
  key: string,
  payload: { value: string; description?: string }
): Promise<void> => {
  await apiClient.put(`/admin/system-settings/${encodeURIComponent(key)}`, payload);
};

export const fetchAdminSettings = async (): Promise<AdminSetting[]> => {
  const response = await apiClient.get<AdminSetting[]>("/admin/settings");
  return response.data;
};

export const fetchRoles = async (): Promise<Role[]> => {
  const response = await apiClient.get<Role[]>("/admin/rbac/roles");
  return response.data;
};

export const createRole = async (payload: { name: string; description?: string }): Promise<Role> => {
  const response = await apiClient.post<Role>("/admin/rbac/roles", payload);
  return response.data;
};

export const fetchPermissions = async (): Promise<Permission[]> => {
  const response = await apiClient.get<Permission[]>("/admin/rbac/permissions");
  return response.data;
};

export const setRolePermissions = async (
  roleID: string,
  payload: { permission_keys: string[] }
): Promise<void> => {
  await apiClient.put(`/admin/rbac/roles/${encodeURIComponent(roleID)}/permissions`, payload);
};

export const setUserRoles = async (uid: string, payload: { role_ids: string[] }): Promise<void> => {
  await apiClient.put(`/admin/rbac/users/${encodeURIComponent(uid)}/roles`, payload);
};
