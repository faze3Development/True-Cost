"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import TopNavConfigEditor from "@/components/TopNavConfigEditor";
import { type TopNavRuntimeConfig } from "@/routes";

// DEV NOTE: Switched to centralized @/api/admin so that all administrative endpoints and authentication
// headers are managed consistently through the axios client instance.
import { fetchAdminTopNavConfig, updateAdminTopNavConfig } from "@/api/admin";

type UserSettingsPayload = {
  top_nav_config?: unknown;
};

export default function AdminPage() {
  const [settingsPayload, setSettingsPayload] = useState<UserSettingsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string>("");

  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);

      try {
        const data = await fetchAdminTopNavConfig();
        if (data) {
          setSettingsPayload(data);
          setLastSync(new Date().toLocaleTimeString());
        }
      } catch (error) {
        console.warn("Failed to load admin navigation settings", error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadSettings();
  }, []);

  const handleSaveTopNavConfig = async (config: TopNavRuntimeConfig): Promise<void> => {
    try {
      await updateAdminTopNavConfig(config);
    } catch {
      throw new Error("Failed to save top nav configuration.");
    }

    setSettingsPayload({ top_nav_config: config });
    setLastSync(new Date().toLocaleTimeString());
  };

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-7xl px-6 py-10 md:px-10">
        <div className="space-y-8">
          <header className="space-y-3 bg-surface-container p-8 shadow-ambient">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              Admin Workspace
            </p>
            <h1 className="text-4xl font-extrabold tracking-tighter text-on-surface">Navigation Control Center</h1>
            <p className="max-w-3xl text-sm text-on-surface-variant">
              Choose a sidebar/page context, then drag and drop top-nav options, hide/show paths, and save.
              The header updates instantly and persists to profile settings.
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-on-surface-variant">
              <span className="rounded-full bg-secondary/10 px-3 py-1 text-secondary">Drag + Drop Ordering</span>
              <span className="rounded-full bg-secondary/10 px-3 py-1 text-secondary">Context-Based Menus</span>
              <span className="rounded-full bg-secondary/10 px-3 py-1 text-secondary">Show/Hide By Route</span>
              {lastSync ? (
                <span className="rounded-full bg-surface-container-lowest px-3 py-1">Last sync: {lastSync}</span>
              ) : null}
            </div>
          </header>

          {isLoading ? (
            <section className="bg-surface-container p-8 shadow-ambient">
              <p className="text-sm font-semibold text-on-surface-variant">Loading admin configuration...</p>
            </section>
          ) : (
            <TopNavConfigEditor
              savedConfig={settingsPayload?.top_nav_config}
              onSaveConfig={handleSaveTopNavConfig}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
