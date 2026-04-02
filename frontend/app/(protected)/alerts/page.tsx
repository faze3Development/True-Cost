"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { fetchMarketAnalysis } from "@/api/market-analysis";

export default function AlertsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["market-analysis", "alerts"],
    queryFn: () => fetchMarketAnalysis(),
    staleTime: 1000 * 60 * 5,
  });

  const alerts = data?.alerts ?? [];

  return (
    <AppLayout>
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mb-12 flex items-end justify-between">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-500">
              Signals
            </p>
            <h1 className="text-4xl font-black tracking-tighter text-primary">
              Market Alerts
            </h1>
            <p className="mt-3 max-w-2xl text-lg font-medium leading-relaxed text-slate-500">
              Derived from the live market snapshot so the alerts page stays in sync with the analysis view.
            </p>
          </div>
          <Link
            href="/market-analysis"
            className="rounded-sm border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-primary transition-colors hover:bg-slate-50"
          >
            Back to Market Analysis
          </Link>
        </div>

        {isError ? (
          <div className="mb-8 rounded-sm border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            Alerts could not be loaded from the backend snapshot.
          </div>
        ) : null}

        <section className="mb-10 grid gap-6 md:grid-cols-3">
          <div className="rounded-sm bg-surface-container-lowest p-6 shadow-[0_4px_24px_rgba(20,29,35,0.04)]">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Signals Generated
            </span>
            <p className="mt-3 text-3xl font-black text-primary">
              {isLoading ? "--" : alerts.length}
            </p>
          </div>
          <div className="rounded-sm bg-surface-container-lowest p-6 shadow-[0_4px_24px_rgba(20,29,35,0.04)]">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Severity Mix
            </span>
            <p className="mt-3 text-3xl font-black text-primary">Live</p>
          </div>
          <div className="rounded-sm bg-surface-container-lowest p-6 shadow-[0_4px_24px_rgba(20,29,35,0.04)]">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Snapshot Status
            </span>
            <p className="mt-3 text-3xl font-black text-primary">Current</p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          {isLoading
            ? Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-44 animate-pulse rounded-sm bg-surface-container-lowest" />
              ))
            : alerts.map((alert) => (
                <article
                  key={`${alert.type}-${alert.title}`}
                  className="rounded-sm border border-slate-200 bg-surface-container-lowest p-6 shadow-[0_4px_24px_rgba(20,29,35,0.04)]"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <span
                      className={`text-xs font-black uppercase tracking-widest ${
                        alert.severity === "critical"
                          ? "text-emerald-600"
                          : alert.severity === "warning"
                            ? "text-red-500"
                            : "text-slate-500"
                      }`}
                    >
                      {alert.type}
                    </span>
                    <span className="rounded-full bg-surface-container px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      {alert.severity}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-primary">{alert.title}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-slate-500">{alert.description}</p>
                </article>
              ))}
        </section>
      </main>
    </AppLayout>
  );
}