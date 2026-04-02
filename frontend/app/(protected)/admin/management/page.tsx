"use client";

import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/AppLayout";
import {
  type AdminSetting,
  type Permission,
  type Role,
  type SystemSetting,
  type Tenant,
} from "@/api/admin";
import {
  useTenants,
  useSystemSettings,
  useAdminSettings,
  useRoles,
  usePermissions,
  useCreateTenant,
  useUpdateTenant,
  useUpsertSystemSetting,
  useCreateRole,
  useSetRolePermissions,
  useSetUserRoles,
  ADMIN_KEYS
} from "@/hooks/useAdmin";
import { useQueryClient } from "@tanstack/react-query";

type LoadState = "idle" | "loading" | "loaded" | "error";

type ApiErrorLike = {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
};

const getErrorMessage = (err: unknown, fallback: string): string => {
  const candidate = err as ApiErrorLike;
  return candidate?.response?.data?.message || candidate?.message || fallback;
};

export default function AdminManagementPage() {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string>("");

  const { data: tenants = [], isLoading: isLoadingTenants, isError: isErrorTenants } = useTenants();
  const { data: systemSettings = [], isLoading: isLoadingSystem, isError: isErrorSystem } = useSystemSettings();
  const { data: adminSettings = [], isLoading: isLoadingAdmin, isError: isErrorAdmin } = useAdminSettings();
  const { data: roles = [], isLoading: isLoadingRoles, isError: isErrorRoles } = useRoles();
  const { data: permissions = [], isLoading: isLoadingPermissions, isError: isErrorPermissions } = usePermissions();

  const loadState = isLoadingTenants || isLoadingSystem || isLoadingAdmin || isLoadingRoles || isLoadingPermissions ? "loading" : 
                    isErrorTenants || isErrorSystem || isErrorAdmin || isErrorRoles || isErrorPermissions ? "error" : "loaded";

  const [newTenantKey, setNewTenantKey] = useState("default");
  const [newTenantName, setNewTenantName] = useState("");
  const [newTenantStatus, setNewTenantStatus] = useState("active");

  const [newSettingKey, setNewSettingKey] = useState("");
  const [newSettingValue, setNewSettingValue] = useState("");
  const [newSettingDescription, setNewSettingDescription] = useState("");

  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");

  const [selectedRoleId, setSelectedRoleId] = useState<number | "">("");
  const [selectedPermissionKeys, setSelectedPermissionKeys] = useState<string[]>([]);

  const [targetUserUID, setTargetUserUID] = useState("");
  const [selectedUserRoleIds, setSelectedUserRoleIds] = useState<number[]>([]);

  const sortedPermissions = useMemo(() => {
    return [...permissions].sort((a, b) => a.key.localeCompare(b.key));
  }, [permissions]);

  const loadAll = async (): Promise<void> => {
    setErrorMessage("");
    queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.all });
  };

  const createTenantMutation = useCreateTenant();
  const updateTenantMutation = useUpdateTenant();
  const upsertSystemSettingMutation = useUpsertSystemSetting();
  const createRoleMutation = useCreateRole();
  const setRolePermissionsMutation = useSetRolePermissions();
  const setUserRolesMutation = useSetUserRoles();

  const onCreateTenant = async (): Promise<void> => {
    setErrorMessage("");
    try {
      await createTenantMutation.mutateAsync({
        tenant_key: newTenantKey,
        name: newTenantName,
        status: newTenantStatus,
      });
      setNewTenantName("");
    } catch (err) {
      setErrorMessage(getErrorMessage(err, "Failed to create tenant"));
    }
  };

  const onUpdateTenant = async (tenantKey: string, name: string, status: string): Promise<void> => {
    setErrorMessage("");
    try {
      await updateTenantMutation.mutateAsync({ tenantKey, payload: { name, status } });
    } catch (err) {
      setErrorMessage(getErrorMessage(err, "Failed to update tenant"));
    }
  };

  const onUpsertSystemSetting = async (key: string, value: string, description: string): Promise<void> => {
    setErrorMessage("");
    try {
      await upsertSystemSettingMutation.mutateAsync({ key, payload: { value, description } });
    } catch (err) {
      setErrorMessage(getErrorMessage(err, "Failed to update system setting"));
    }
  };

  const onCreateSystemSetting = async (): Promise<void> => {
    if (!newSettingKey.trim()) {
      setErrorMessage("Setting key is required");
      return;
    }

    await onUpsertSystemSetting(newSettingKey, newSettingValue, newSettingDescription);
    setNewSettingKey("");
    setNewSettingValue("");
    setNewSettingDescription("");
  };

  const onCreateRole = async (): Promise<void> => {
    setErrorMessage("");
    try {
      await createRoleMutation.mutateAsync({ name: newRoleName, description: newRoleDescription });
      setNewRoleName("");
      setNewRoleDescription("");
    } catch (err) {
      setErrorMessage(getErrorMessage(err, "Failed to create role"));
    }
  };

  const onSetRolePermissions = async (): Promise<void> => {
    if (!selectedRoleId) {
      setErrorMessage("Select a role first");
      return;
    }

    setErrorMessage("");
    try {
      await setRolePermissionsMutation.mutateAsync({ roleID: selectedRoleId as number, payload: { permission_keys: selectedPermissionKeys } });
      setSelectedPermissionKeys([]);
      setSelectedRoleId("");
    } catch (err) {
      setErrorMessage(getErrorMessage(err, "Failed to update role permissions"));
    }
  };

  const onSetUserRoles = async (): Promise<void> => {
    if (!targetUserUID.trim()) {
      setErrorMessage("User UID is required");
      return;
    }

    setErrorMessage("");
    try {
      await setUserRolesMutation.mutateAsync({ uid: targetUserUID, payload: { role_ids: selectedUserRoleIds } });
      setTargetUserUID("");
      setSelectedUserRoleIds([]);
    } catch (err) {
      setErrorMessage(getErrorMessage(err, "Failed to update user roles"));
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-7xl px-6 py-10 md:px-10">
        <div className="space-y-8">
          <header className="space-y-3 bg-surface-container p-8 shadow-ambient">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Admin Workspace</p>
            <h1 className="text-4xl font-extrabold tracking-tighter text-on-surface">Management Operations</h1>
            <p className="max-w-3xl text-sm text-on-surface-variant">
              Tenant-scoped administration for system settings, tenant metadata, and RBAC.
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-on-surface-variant">
              {loadState === "loading" ? (
                <span className="rounded-full bg-secondary/10 px-3 py-1 text-secondary">Loading…</span>
              ) : null}
              {errorMessage ? (
                <span className="rounded-full bg-surface-container-lowest px-3 py-1 text-on-surface-variant">
                  {errorMessage}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => void loadAll()}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:bg-primary/90"
              >
                Refresh
              </button>
            </div>
          </header>

          <section className="space-y-4 bg-surface-container p-8 shadow-ambient">
            <h2 className="text-lg font-black uppercase tracking-widest text-on-surface-variant">Tenants</h2>
            <p className="text-sm text-on-surface-variant">
              This API is intentionally tenant self-only: you can view and manage only the current tenant.
            </p>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-7">
                {tenants.length === 0 ? (
                  <div className="bg-surface-container-lowest p-6">
                    <p className="text-sm font-semibold text-on-surface-variant">No tenants found for this context.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tenants.map((t) => (
                      <TenantCard
                        key={t.tenant_key}
                        tenant={t}
                        onUpdate={onUpdateTenant}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4 lg:col-span-5">
                <div className="bg-surface-container-lowest p-6">
                  <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Create Tenant</p>
                  <div className="mt-4 space-y-3">
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Tenant Key</span>
                      <input
                        value={newTenantKey}
                        onChange={(e) => setNewTenantKey(e.target.value)}
                        className="mt-1 w-full bg-white px-3 py-2 text-sm shadow-ambient focus:outline-none"
                        placeholder="default"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Name</span>
                      <input
                        value={newTenantName}
                        onChange={(e) => setNewTenantName(e.target.value)}
                        className="mt-1 w-full bg-white px-3 py-2 text-sm shadow-ambient focus:outline-none"
                        placeholder="Tenant display name"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Status</span>
                      <input
                        value={newTenantStatus}
                        onChange={(e) => setNewTenantStatus(e.target.value)}
                        className="mt-1 w-full bg-white px-3 py-2 text-sm shadow-ambient focus:outline-none"
                        placeholder="active"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void onCreateTenant()}
                      className="w-full rounded-lg bg-secondary px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:bg-secondary/90"
                    >
                      Create
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4 bg-surface-container p-8 shadow-ambient">
            <h2 className="text-lg font-black uppercase tracking-widest text-on-surface-variant">System Settings</h2>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-7">
                {systemSettings.length === 0 ? (
                  <div className="bg-surface-container-lowest p-6">
                    <p className="text-sm font-semibold text-on-surface-variant">No system settings found.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {systemSettings.map((setting) => (
                      <SystemSettingCard
                        key={setting.key}
                        setting={setting}
                        onSave={onUpsertSystemSetting}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4 lg:col-span-5">
                <div className="bg-surface-container-lowest p-6">
                  <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Create / Upsert</p>
                  <div className="mt-4 space-y-3">
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Key</span>
                      <input
                        value={newSettingKey}
                        onChange={(e) => setNewSettingKey(e.target.value)}
                        className="mt-1 w-full bg-white px-3 py-2 text-sm shadow-ambient focus:outline-none"
                        placeholder="feature.flag"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Value</span>
                      <input
                        value={newSettingValue}
                        onChange={(e) => setNewSettingValue(e.target.value)}
                        className="mt-1 w-full bg-white px-3 py-2 text-sm shadow-ambient focus:outline-none"
                        placeholder="enabled"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Description</span>
                      <textarea
                        value={newSettingDescription}
                        onChange={(e) => setNewSettingDescription(e.target.value)}
                        className="mt-1 w-full bg-white px-3 py-2 text-sm shadow-ambient focus:outline-none"
                        rows={3}
                        placeholder="Optional"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void onCreateSystemSetting()}
                      className="w-full rounded-lg bg-secondary px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:bg-secondary/90"
                    >
                      Save
                    </button>
                  </div>
                </div>

                <div className="bg-surface-container-lowest p-6">
                  <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Admin Settings (Read Only)</p>
                  <div className="mt-4 space-y-3">
                    {adminSettings.length === 0 ? (
                      <p className="text-sm text-on-surface-variant">No admin settings found.</p>
                    ) : (
                      <ul className="space-y-2">
                        {adminSettings.map((s) => (
                          <li key={s.key} className="bg-white p-3 shadow-ambient">
                            <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant">{s.key}</p>
                            <p className="mt-1 text-sm font-semibold text-on-surface">{s.value}</p>
                            {s.description ? (
                              <p className="mt-1 text-xs text-on-surface-variant">{s.description}</p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4 bg-surface-container p-8 shadow-ambient">
            <h2 className="text-lg font-black uppercase tracking-widest text-on-surface-variant">RBAC</h2>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-7">
                <div className="bg-surface-container-lowest p-6">
                  <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Roles</p>
                  <div className="mt-4 space-y-3">
                    {roles.length === 0 ? (
                      <p className="text-sm text-on-surface-variant">No roles found.</p>
                    ) : (
                      <ul className="space-y-2">
                        {roles.map((role) => (
                          <li key={role.ID} className="bg-white p-4 shadow-ambient">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-sm font-extrabold tracking-tight text-on-surface">{role.name}</p>
                                {role.description ? (
                                  <p className="mt-1 text-xs text-on-surface-variant">{role.description}</p>
                                ) : null}
                              </div>
                              <span className="rounded-full bg-surface-container-lowest px-3 py-1 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                                ID: {role.ID}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="bg-surface-container-lowest p-6">
                  <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Permissions</p>
                  <div className="mt-4 space-y-2">
                    {sortedPermissions.length === 0 ? (
                      <p className="text-sm text-on-surface-variant">No permissions found.</p>
                    ) : (
                      <ul className="max-h-72 space-y-2 overflow-auto pr-2">
                        {sortedPermissions.map((perm) => (
                          <li key={perm.key} className="bg-white p-3 shadow-ambient">
                            <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant">{perm.key}</p>
                            {perm.description ? (
                              <p className="mt-1 text-xs text-on-surface-variant">{perm.description}</p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4 lg:col-span-5">
                <div className="bg-surface-container-lowest p-6">
                  <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Create Role</p>
                  <div className="mt-4 space-y-3">
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Name</span>
                      <input
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                        className="mt-1 w-full bg-white px-3 py-2 text-sm shadow-ambient focus:outline-none"
                        placeholder="analyst"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Description</span>
                      <textarea
                        value={newRoleDescription}
                        onChange={(e) => setNewRoleDescription(e.target.value)}
                        className="mt-1 w-full bg-white px-3 py-2 text-sm shadow-ambient focus:outline-none"
                        rows={3}
                        placeholder="Optional"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void onCreateRole()}
                      className="w-full rounded-lg bg-secondary px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:bg-secondary/90"
                    >
                      Create
                    </button>
                  </div>
                </div>

                <div className="bg-surface-container-lowest p-6">
                  <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Set Role Permissions</p>
                  <p className="mt-2 text-xs text-on-surface-variant">
                    This operation replaces the role’s permissions with the selected keys.
                  </p>
                  <div className="mt-4 space-y-3">
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Role</span>
                      <select
                        value={selectedRoleId}
                        onChange={(e) => setSelectedRoleId(e.target.value ? Number(e.target.value) : "")}
                        className="mt-1 w-full bg-white px-3 py-2 text-sm shadow-ambient focus:outline-none"
                      >
                        <option value="">Select role…</option>
                        {roles.map((role) => (
                          <option key={role.ID} value={role.ID}>
                            {role.name} (ID {role.ID})
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="max-h-64 overflow-auto bg-white p-3 shadow-ambient">
                      {sortedPermissions.length === 0 ? (
                        <p className="text-sm text-on-surface-variant">No permissions available.</p>
                      ) : (
                        <ul className="space-y-2">
                          {sortedPermissions.map((perm) => {
                            const checked = selectedPermissionKeys.includes(perm.key);
                            return (
                              <li key={perm.key} className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    setSelectedPermissionKeys((prev) =>
                                      e.target.checked
                                        ? [...prev, perm.key]
                                        : prev.filter((k) => k !== perm.key)
                                    );
                                  }}
                                  className="mt-1"
                                />
                                <div>
                                  <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant">{perm.key}</p>
                                  {perm.description ? (
                                    <p className="mt-1 text-xs text-on-surface-variant">{perm.description}</p>
                                  ) : null}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => void onSetRolePermissions()}
                      className="w-full rounded-lg bg-secondary px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:bg-secondary/90"
                    >
                      Update Permissions
                    </button>
                  </div>
                </div>

                <div className="bg-surface-container-lowest p-6">
                  <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Set User Roles</p>
                  <p className="mt-2 text-xs text-on-surface-variant">
                    Provide the user UID and choose roles. This replaces the user’s assigned roles.
                  </p>
                  <div className="mt-4 space-y-3">
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">User UID</span>
                      <input
                        value={targetUserUID}
                        onChange={(e) => setTargetUserUID(e.target.value)}
                        className="mt-1 w-full bg-white px-3 py-2 text-sm shadow-ambient focus:outline-none"
                        placeholder="firebase uid"
                      />
                    </label>

                    <div className="max-h-48 overflow-auto bg-white p-3 shadow-ambient">
                      {roles.length === 0 ? (
                        <p className="text-sm text-on-surface-variant">No roles available.</p>
                      ) : (
                        <ul className="space-y-2">
                          {roles.map((role) => {
                            const checked = selectedUserRoleIds.includes(role.ID);
                            return (
                              <li key={role.ID} className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    setSelectedUserRoleIds((prev) =>
                                      e.target.checked
                                        ? [...prev, role.ID]
                                        : prev.filter((id) => id !== role.ID)
                                    );
                                  }}
                                />
                                <span className="text-sm font-semibold text-on-surface">{role.name}</span>
                                <span className="text-xs text-on-surface-variant">(ID {role.ID})</span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => void onSetUserRoles()}
                      className="w-full rounded-lg bg-secondary px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:bg-secondary/90"
                    >
                      Update User Roles
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}

type TenantCardProps = {
  tenant: Tenant;
  onUpdate: (tenantKey: string, name: string, status: string) => Promise<void>;
};

function TenantCard({ tenant, onUpdate }: TenantCardProps) {
  const [name, setName] = useState(tenant.name);
  const [status, setStatus] = useState(tenant.status);

  useEffect(() => {
    setName(tenant.name);
    setStatus(tenant.status);
  }, [tenant.name, tenant.status]);

  return (
    <div className="bg-white p-6 shadow-ambient">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Tenant</p>
          <p className="mt-1 text-lg font-extrabold tracking-tight text-on-surface">{tenant.tenant_key}</p>
        </div>
        <span className="rounded-full bg-surface-container-lowest px-3 py-1 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
          Status: {tenant.status}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full bg-surface-container-lowest px-3 py-2 text-sm focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Status</span>
          <input
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 w-full bg-surface-container-lowest px-3 py-2 text-sm focus:outline-none"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={() => void onUpdate(tenant.tenant_key, name, status)}
        className="mt-4 rounded-lg bg-primary px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:bg-primary/90"
      >
        Save Tenant
      </button>
    </div>
  );
}

type SystemSettingCardProps = {
  setting: SystemSetting;
  onSave: (key: string, value: string, description: string) => Promise<void>;
};

function SystemSettingCard({ setting, onSave }: SystemSettingCardProps) {
  const [value, setValue] = useState(setting.value);
  const [description, setDescription] = useState(setting.description ?? "");

  useEffect(() => {
    setValue(setting.value);
    setDescription(setting.description ?? "");
  }, [setting.value, setting.description]);

  return (
    <div className="bg-white p-6 shadow-ambient">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Key</p>
          <p className="mt-1 text-sm font-extrabold tracking-tight text-on-surface">{setting.key}</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Value</span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="mt-1 w-full bg-surface-container-lowest px-3 py-2 text-sm focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full bg-surface-container-lowest px-3 py-2 text-sm focus:outline-none"
            rows={3}
          />
        </label>
      </div>

      <button
        type="button"
        onClick={() => void onSave(setting.key, value, description)}
        className="mt-4 rounded-lg bg-primary px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:bg-primary/90"
      >
        Save Setting
      </button>
    </div>
  );
}
