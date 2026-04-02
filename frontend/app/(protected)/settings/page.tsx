"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { useMapStyle, MapStyleType } from "@/components/MapStyleProvider";
import TopNavConfigEditor from "@/components/TopNavConfigEditor";
import { type TopNavRuntimeConfig } from "@/routes";

// DEV NOTE: Switched to centralized @/api/user so that all user profile fetch and updates
// reuse the core Axios client with automatic interceptor-based token injection.
import { useAuth } from "@/context/AuthContext";
import { createCheckoutSession, createCustomerPortalSession } from "@/api/stripe";
import { env } from "@/lib/env";

const alerts = [
  { title: "The Elm", detail: "Volatility Threshold: 2.5%", active: true, featured: false },
  { title: "Midtown Market", detail: "Cap Rate Shift > 10bps", active: true, featured: true },
  { title: "Waterfront Portfolio", detail: "All Activity", active: false, featured: false },
];

export default function SettingsPage() {
  const { mapStyle, setMapStyle } = useMapStyle();
  const { user: authUser, dbUser, updateUserSetting } = useAuth();

  useEffect(() => {
    if (dbUser?.settings?.map_style) {
      setMapStyle(dbUser.settings.map_style as MapStyleType);
    }
  }, [dbUser, setMapStyle]);

  const syncSetting = async (key: string, value: unknown): Promise<void> => {
    try {
      await updateUserSetting(key, value);
    } catch (err) {
      console.warn("Failed to persist setting", err);
    }
  };

  const handleTopNavConfigSave = async (config: TopNavRuntimeConfig): Promise<void> => {
    await syncSetting("top_nav_config", config);
  };

  const handleMapStyleChange = (id: MapStyleType) => {
    setMapStyle(id);
    syncSetting("map_style", id);
  };

  const handleManageBilling = async () => {
    try {
      const data = await createCustomerPortalSession(
        `${window.location.origin}/settings`
      );
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Portal error:", err);
      alert("Failed to open billing portal. Please contact support.");
    }
  };

  const handleUpgrade = async () => {
    try {
      if (dbUser?.tier_id === "enterprise") {
        alert("You are on the top tier! To modify your enterprise agreement, please contact support.");
        return;
      }

      const targetTier = dbUser?.tier_id === "pro" ? "enterprise" : "pro";
      const targetPrice = dbUser?.tier_id === "pro" ? env.STRIPE_PRICE_ENTERPRISE : env.STRIPE_PRICE_PRO;

      const response = await createCheckoutSession(
        targetTier,
        targetPrice || "price_dummy",
        window.location.origin + "/settings?success=true",
        window.location.origin + "/settings?canceled=true"
      );
      if (response.session_url) {
        window.location.href = response.session_url;
      }
    } catch (err) {
      console.error("Failed to start checkout:", err);
      alert("Billing system unavailable. Please try again later.");
    }
  };

  if (!dbUser || !authUser) {
    return (
      <AppLayout>
         <div className="flex bg-surface-container-lowest h-[60vh] w-full items-center justify-center">
            <p className="text-on-surface-variant uppercase tracking-widest text-xs font-bold">Synchronizing Profile...</p>
         </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="w-full px-6 py-10 md:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-10">
          <header className="space-y-2">
            <h2 className="text-4xl font-extrabold tracking-tighter">Account Architecture</h2>
            <p className="text-on-surface-variant">Manage your institutional presence and data preferences.</p>
            <div>
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:bg-primary/90"
              >
                <span className="material-symbols-outlined text-sm" aria-hidden>
                  admin_panel_settings
                </span>
                Open Admin Control Center
              </Link>
            </div>
            <div className="lg:hidden rounded-lg bg-surface-container p-4 text-sm text-on-surface-variant">Navigation is docked on desktop.</div>
          </header>

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="space-y-12 lg:col-span-7">
              <section className="relative overflow-hidden bg-surface-container-lowest p-8 shadow-ambient">
                <div className="absolute left-0 top-0 h-full w-1.5 bg-secondary" aria-hidden />
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
                  <div className="relative w-fit">
                    <img
                      src={authUser.photoURL || dbUser.avatar_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuB3yXiG99QhYJfWXwmGfUMC6FqkGVfsmjmMAUVgiVhc5W5lzRBzjb7z3PQROchXIZIiJD51qx24iDOwetoRJIuGI0BkvIt_S0fcbmHQolCl0DSTGDuv5HEmZTQXDJy6G6rjR-5xq3X2J_fQrhuM-2L1eqMbUk4qsIvxssdyXWbcPyNtHjL2dKVd6HRtSHRw3F-B_8zA1nVddX4TQzwxKtQNp_h-cmFie2Ro5lHtcTMSe_ikcKsq5t6RsJKxXj_M6VUa2eyQSgvq_Ljx"}
                      alt={authUser.displayName || dbUser.display_name || "Profile"}
                      className="h-24 w-24 rounded-full object-cover bg-surface-container ghost-border grayscale transition duration-500 hover:grayscale-0"
                    />
                    <button
                      type="button"
                      className="absolute bottom-0 right-0 rounded-full bg-primary px-2 py-1 text-white shadow"
                      aria-label="Edit profile photo"
                    >
                      <span className="material-symbols-outlined text-sm" aria-hidden>
                        edit
                      </span>
                    </button>
                  </div>

                  <div className="flex-1 space-y-6">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="text-2xl font-extrabold tracking-tight">{authUser.displayName || dbUser.display_name || "Anonymous Analyst"}</h3>
                        <p className="mt-1 text-sm font-bold uppercase tracking-widest text-on-tertiary-container">{dbUser.role || "Principal Analyst"}</p>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-secondary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-secondary">
                        Verified Identity
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Email Address</span>
                        <p className="text-sm font-medium">{authUser.email || dbUser.email || "—"}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Contact</span>
                        <p className="text-sm font-medium">+1 (212) 555-0198</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <h4 className="flex items-center gap-4 text-sm font-black uppercase tracking-widest text-on-surface-variant">
                  <span className="h-1 w-12 bg-secondary/20" aria-hidden />
                  Security Infrastructure
                </h4>

                <div className="bg-surface-container shadow-ambient">
                  <div className="flex items-center justify-between border-b border-outline/20 bg-white px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center bg-surface-container-low text-primary">
                        <span className="material-symbols-outlined" aria-hidden>
                          shield_lock
                        </span>
                      </div>
                      <div>
                        <p className="font-bold">Two-Factor Authentication</p>
                        <p className="text-sm text-on-surface-variant">Require secondary verification via SMS</p>
                      </div>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input 
                        type="checkbox" 
                        checked={dbUser.settings?.two_factor_enabled || false}
                        className="peer sr-only" 
                        onChange={(e) => syncSetting("two_factor_enabled", e.target.checked)}
                      />
                      <span className="h-6 w-11 rounded-full bg-surface-container-highest transition peer-checked:bg-secondary after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-full" aria-hidden />
                      <span className="sr-only">Toggle two factor authentication</span>
                    </label>
                  </div>

                  <div className="flex items-center justify-between bg-white px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center bg-surface-container-low text-primary">
                        <span className="material-symbols-outlined" aria-hidden>
                          mail
                        </span>
                      </div>
                      <div>
                        <p className="font-bold">Email Notifications</p>
                        <p className="text-sm text-on-surface-variant">Receive weekly digests and pricing alerts</p>
                      </div>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input 
                        type="checkbox" 
                        checked={dbUser.settings?.email_notifications ?? true}
                        className="peer sr-only" 
                        onChange={(e) => syncSetting("email_notifications", e.target.checked)}
                      />
                      <span className="h-6 w-11 rounded-full bg-surface-container-highest transition peer-checked:bg-secondary after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-full" aria-hidden />
                      <span className="sr-only">Toggle email notifications</span>
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 p-8">
                    <button className="flex items-center justify-center gap-3 bg-surface-container-lowest px-6 py-4 text-xs font-bold uppercase tracking-widest transition hover:bg-white" type="button">
                      <span className="material-symbols-outlined text-sm" aria-hidden>
                        lock_reset
                      </span>
                      Rotate Password
                    </button>
                    <button className="flex items-center justify-center gap-3 bg-surface-container-lowest px-6 py-4 text-xs font-bold uppercase tracking-widest transition hover:bg-white" type="button">
                      <span className="material-symbols-outlined text-sm" aria-hidden>
                        devices
                      </span>
                      Active Sessions
                    </button>
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <h4 className="flex items-center gap-4 text-sm font-black uppercase tracking-widest text-on-surface-variant">
                  <span className="h-1 w-12 bg-secondary/20" aria-hidden />
                  {env.APP_NAME} Intelligence Export
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="group flex cursor-pointer flex-col items-center rounded-lg bg-surface-container-lowest p-6 text-center transition hover:bg-primary-container hover:text-on-primary">
                    <span className="material-symbols-outlined mb-4 text-4xl text-on-surface-variant transition group-hover:text-secondary" aria-hidden>
                      description
                    </span>
                    <p className="text-sm font-bold">Download Full Ledger</p>
                    <p className="mt-2 text-[10px] uppercase tracking-widest opacity-70">PDF Format (Editorial Standard)</p>
                  </div>
                  <div className="group flex cursor-pointer flex-col items-center rounded-lg bg-surface-container-lowest p-6 text-center transition hover:bg-primary-container hover:text-on-primary">
                    <span className="material-symbols-outlined mb-4 text-4xl text-on-surface-variant transition group-hover:text-secondary" aria-hidden>
                      table_chart
                    </span>
                    <p className="text-sm font-bold">Export Analytical Raw</p>
                    <p className="mt-2 text-[10px] uppercase tracking-widest opacity-70">CSV Format (Standardized)</p>
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <h4 className="flex items-center gap-4 text-sm font-black uppercase tracking-widest text-on-surface-variant">
                  <span className="h-1 w-12 bg-secondary/20" aria-hidden />
                  Visualization Preferences
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  {([
                    { id: "dark-matter", label: "Dark Matter", desc: "High contrast UI with minimal light pollution" },
                    { id: "positron", label: "Positron", desc: "Clean & bright for daylight analysis" },
                    { id: "voyager", label: "Voyager", desc: "Detailed street data and POIs" },
                    { id: "satellite", label: "Satellite", desc: "High-resolution global imagery" },
                  ] as const).map((style) => (
                    <div 
                      key={style.id}
                      onClick={() => handleMapStyleChange(style.id as MapStyleType)}
                      className={`group cursor-pointer rounded-lg border-2 p-4 transition-all ${
                        (dbUser.settings?.map_style || "dark-matter") === style.id 
                          ? "border-secondary bg-secondary/10" 
                          : "border-transparent bg-surface-container-lowest hover:border-outline/50"
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <p className={`font-bold ${(dbUser.settings?.map_style || "dark-matter") === style.id ? "text-secondary" : "text-on-surface"}`}>
                          {style.label}
                        </p>
                        <span className={`material-symbols-outlined text-xl ${(dbUser.settings?.map_style || "dark-matter") === style.id ? "text-secondary" : "text-on-surface-variant opacity-0 transition group-hover:opacity-50"}`}>
                          check_circle
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant">{style.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              <TopNavConfigEditor
                savedConfig={dbUser.settings?.top_nav_config}
                onSaveConfig={handleTopNavConfigSave}
              />
            </div>

            <div className="space-y-12 lg:col-span-5">
              <section className="relative overflow-hidden bg-primary-container p-8 text-on-primary shadow-ambient">
                <div className="relative z-10 space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-on-tertiary-container">Current Subscription</p>
                  <h3 className="text-3xl font-extrabold tracking-tighter capitalize">{dbUser.tier_id || "free"} Tier</h3>
                  <p className="text-sm text-on-primary/90">
                    {dbUser.tier_id === "free" ? "Limited Local Market Access" : "Unlimited Portfolio Analysis & API Access"}
                  </p>

                  <div className="space-y-4 rounded bg-white/5 p-4">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="opacity-80">Next Billing Cycle</span>
                      <span className="tabular-nums">Oct 14, 2024</span>
                    </div>
                    <div className="flex justify-between text-xs font-medium">
                      <span className="opacity-80">Annual Committed Total</span>
                      <span className="tabular-nums font-bold text-secondary">
                          {dbUser.tier_id === "free" ? "$0.00" : "$12,400.00"}
                      </span>
                    </div>
                  </div>

                  <button 
                    className="flex w-full items-center justify-center gap-2 rounded bg-white px-4 py-4 text-xs font-black uppercase tracking-widest text-primary-container transition hover:bg-secondary-container hover:text-on-secondary" 
                    type="button"
                    onClick={dbUser.tier_id === "enterprise" ? handleManageBilling : handleUpgrade}
                  >
                    <span className="material-symbols-outlined text-sm" aria-hidden>
                      {dbUser.tier_id === "enterprise" ? "manage_accounts" : "upgrade"}
                    </span>
                    {dbUser.tier_id === "enterprise" ? "Manage Subscription" : "Upgrade Plan"}
                  </button>
                </div>
                <div className="absolute -bottom-12 -right-12 h-48 w-48 rounded-full bg-secondary/15 blur-3xl" aria-hidden />
              </section>

              <section className="space-y-6">
                <h4 className="flex items-center gap-4 text-sm font-black uppercase tracking-widest text-on-surface-variant">
                  <span className="h-1 w-12 bg-secondary/20" aria-hidden />
                  Market Watchlist & Alerts
                </h4>

                <div className="overflow-hidden rounded-lg bg-white shadow-ambient">
                  {alerts.map((alert, idx) => (
                    <div
                      key={alert.title}
                      className={`flex items-center justify-between px-5 py-5 transition-colors ${
                        alert.featured ? "bg-surface-container-lowest" : "bg-white"
                      } ${idx !== alerts.length - 1 ? "border-b border-outline/20" : ""}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`flex h-10 w-10 items-center justify-center ${alert.active ? "bg-secondary/10" : "bg-surface-container-highest"}`}>
                          <span
                            className={`material-symbols-outlined ${alert.active ? "text-secondary" : "text-on-surface-variant"}`}
                            aria-hidden
                          >
                            {alert.active ? "notifications_active" : "notifications_off"}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-sm">{alert.title}</p>
                          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">{alert.detail}</p>
                        </div>
                      </div>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input type="checkbox" defaultChecked={alert.active} className="peer sr-only" />
                        <span className="h-5 w-9 rounded-full bg-surface-container-highest transition peer-checked:bg-secondary after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-full" aria-hidden />
                        <span className="sr-only">Toggle alert for {alert.title}</span>
                      </label>
                    </div>
                  ))}

                  <button className="w-full bg-surface-container/30 px-4 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-on-surface transition hover:text-secondary" type="button">
                    + Add New Asset Watch
                  </button>
                </div>
              </section>
            </div>
          </div>

          <footer className="mt-6 flex flex-col items-start justify-between gap-4 border-t border-outline/20 pt-6 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant sm:flex-row">
            <div>TrueMetric Finance © 2024 Institutional Intelligence</div>
            <div className="flex gap-6">
              <Link href="/support" className="hover:text-primary">
                System Status
              </Link>
              <Link href="/request-access" className="hover:text-primary">
                Compliance API
              </Link>
              <Link href="/legal" className="hover:text-primary">
                Terms of Service
              </Link>
            </div>
          </footer>
        </div>
      </div>
    </AppLayout>
  );
}
