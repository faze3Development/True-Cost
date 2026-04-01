import Link from "next/link";
import TopNavigation from "@/components/TopNavigation";
import Sidebar from "@/components/Sidebar";

const topNavLinks = [
  { label: "Market Map", href: "/" },
  { label: "Property Insights", href: "#" },
  { label: "Cost Calculator", href: "/pages/truecost" },
  { label: "Settings", href: "/pages/settings", active: true },
];

const alerts = [
  { title: "The Elm", detail: "Volatility Threshold: 2.5%", active: true, featured: false },
  { title: "Midtown Market", detail: "Cap Rate Shift > 10bps", active: true, featured: true },
  { title: "Waterfront Portfolio", detail: "All Activity", active: false, featured: false },
];

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <TopNavigation navLinks={topNavLinks} />

      <div className="flex pt-16">
        <Sidebar />

        <main className="w-full px-6 py-10 md:px-10 lg:ml-64">
          <div className="mx-auto flex max-w-6xl flex-col gap-10">
            <header className="space-y-2">
              <h2 className="text-4xl font-extrabold tracking-tighter">Account Architecture</h2>
              <p className="text-on-surface-variant">Manage your institutional presence and data preferences.</p>
              <div className="lg:hidden rounded-lg bg-surface-container p-4 text-sm text-on-surface-variant">Navigation is docked on desktop.</div>
            </header>

            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
              <div className="space-y-12 lg:col-span-7">
                <section className="relative overflow-hidden bg-surface-container-lowest p-8 shadow-ambient">
                  <div className="absolute left-0 top-0 h-full w-1.5 bg-secondary" aria-hidden />
                  <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
                    <div className="relative w-fit">
                      <img
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuB3yXiG99QhYJfWXwmGfUMC6FqkGVfsmjmMAUVgiVhc5W5lzRBzjb7z3PQROchXIZIiJD51qx24iDOwetoRJIuGI0BkvIt_S0fcbmHQolCl0DSTGDuv5HEmZTQXDJy6G6rjR-5xq3X2J_fQrhuM-2L1eqMbUk4qsIvxssdyXWbcPyNtHjL2dKVd6HRtSHRw3F-B_8zA1nVddX4TQzwxKtQNp_h-cmFie2Ro5lHtcTMSe_ikcKsq5t6RsJKxXj_M6VUa2eyQSgvq_Ljx"
                        alt="Alexander Sterling"
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
                          <h3 className="text-2xl font-extrabold tracking-tight">Alexander Sterling</h3>
                          <p className="mt-1 text-sm font-bold uppercase tracking-widest text-on-tertiary-container">Principal Analyst</p>
                        </div>
                        <span className="inline-flex items-center rounded-full bg-secondary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-secondary">
                          Verified Identity
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Email Address</span>
                          <p className="text-sm font-medium">a.sterling@truemetric.finance</p>
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

                  <div className="space-y-8 bg-surface-container p-8 shadow-ambient">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-bold text-on-surface">Two-Factor Authentication</p>
                        <p className="mt-1 text-xs text-on-surface-variant">Add an extra layer of security to your institutional account.</p>
                      </div>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input type="checkbox" defaultChecked className="peer sr-only" />
                        <span className="h-6 w-11 rounded-full bg-surface-container-highest transition peer-checked:bg-secondary after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-full" aria-hidden />
                        <span className="sr-only">Toggle two factor authentication</span>
                      </label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
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
                    TrueCost Intelligence Export
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
              </div>

              <div className="space-y-12 lg:col-span-5">
                <section className="relative overflow-hidden bg-primary-container p-8 text-on-primary shadow-ambient">
                  <div className="relative z-10 space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-on-tertiary-container">Current Subscription</p>
                    <h3 className="text-3xl font-extrabold tracking-tighter">Institutional Tier</h3>
                    <p className="text-sm text-on-primary/90">Unlimited Portfolio Analysis & API Access</p>

                    <div className="space-y-4 rounded bg-white/5 p-4">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="opacity-80">Next Billing Cycle</span>
                        <span className="tabular-nums">Oct 14, 2024</span>
                      </div>
                      <div className="flex justify-between text-xs font-medium">
                        <span className="opacity-80">Annual Committed Total</span>
                        <span className="tabular-nums font-bold text-secondary">$12,400.00</span>
                      </div>
                    </div>

                    <button className="flex w-full items-center justify-center gap-2 rounded bg-white px-4 py-4 text-xs font-black uppercase tracking-widest text-primary-container transition hover:bg-secondary-container hover:text-on-secondary" type="button">
                      <span className="material-symbols-outlined text-sm" aria-hidden>
                        download
                      </span>
                      Download Last Invoice
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
                <Link href="#" className="hover:text-primary">
                  System Status
                </Link>
                <Link href="#" className="hover:text-primary">
                  Compliance API
                </Link>
                <Link href="#" className="hover:text-primary">
                  Terms of Service
                </Link>
              </div>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
