"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { fetchMarketAnalysis } from "@/api/market-analysis";
import { env } from "@/lib/env";
function getVolatilityWidthClass(value: number) {
  if (value >= 8) return "w-5/6";
  if (value >= 6) return "w-2/3";
  if (value >= 4) return "w-1/2";
  if (value >= 2) return "w-1/3";
  return "w-1/4";
}

export default function MarketAnalysis() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["market-analysis"],
    queryFn: () => fetchMarketAnalysis(),
    staleTime: 1000 * 60 * 5,
  });

  const metrics = data?.metrics ?? [];
  const neighborhoods = data?.neighborhoods ?? [];
  const alerts = data?.alerts ?? [];

  return (
    <AppLayout>
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mb-12 flex flex-col">
          <div className="mb-2 flex items-end justify-between">
            <h2 className="text-4xl font-black tracking-tighter text-primary">
              Market Analysis
            </h2>
            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-slate-500">
              <span>{data ? `Updated ${new Date(data.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Loading live data"}</span>
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Data</span>
            </div>
          </div>
          <p className="max-w-2xl text-lg font-medium leading-relaxed text-slate-500">
            Visualizing institutional divergence and supply velocity across prime Manhattan sub-markets.
          </p>
        </div>

        {isError ? (
          <div className="mb-12 rounded-sm border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            Market analysis data could not be loaded from the backend.
          </div>
        ) : null}

        <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-36 animate-pulse rounded-sm bg-surface-container-lowest shadow-[0_4px_24px_rgba(20,29,35,0.04)]"
                />
              ))
            : metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="flex flex-col rounded-sm border-t-2 border-emerald-500 bg-surface-container-lowest p-8 shadow-[0_4px_24px_rgba(20,29,35,0.04)] transition-shadow hover:shadow-[0_8px_32px_rgba(20,29,35,0.08)]"
                >
                  <span className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {metric.label}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black tracking-tight text-primary">
                      {metric.value}
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        metric.changeType === "positive"
                          ? "text-emerald-600"
                          : metric.changeType === "negative"
                            ? "text-error"
                            : "text-slate-400"
                      }`}
                    >
                      {metric.change}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">{metric.description}</p>
                </div>
              ))}
        </div>

        <div className="grid grid-cols-12 items-start gap-8">
          <div className="col-span-12 space-y-8 lg:col-span-8">
            <div className="rounded-sm bg-surface-container-low p-8 shadow-[0_2px_8px_rgba(20,29,35,0.02)]">
              <div className="mb-8 flex items-center justify-between">
                <h3 className="text-xl font-bold tracking-tight text-primary">
                  Comparative Neighborhood Ledger
                </h3>
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-emerald-600 transition-opacity hover:opacity-70"
                >
                  Export CSV <span className="material-symbols-outlined text-sm">download</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-surface-container-highest">
                    <tr>
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-600">
                        Market Segment
                      </th>
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-600">
                        Avg. Listing
                      </th>
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-600">
                        Volatility Index
                      </th>
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-600">
                        {env.APP_NAME} Divergence
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-transparent">
                    {isLoading
                      ? Array.from({ length: 4 }).map((_, index) => (
                          <tr key={index} className="bg-surface-container-lowest">
                            <td className="px-6 py-5" colSpan={4}>
                              <div className="h-4 animate-pulse rounded-full bg-surface-container-high" />
                            </td>
                          </tr>
                        ))
                      : neighborhoods.map((neighborhood, index) => (
                          <tr
                            key={neighborhood.name}
                            className={
                              index % 2 === 0
                                ? "bg-surface-container-lowest transition-colors hover:bg-slate-50"
                                : "bg-surface transition-colors"
                            }
                          >
                            <td className="py-5 px-6 font-bold text-primary">
                              {neighborhood.name}
                            </td>
                            <td className="py-5 px-6 font-mono text-slate-600">
                              ${neighborhood.avgListing.toLocaleString()}
                            </td>
                            <td className="py-5 px-6">
                              <div className="flex items-center gap-3">
                                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                                  <div
                                    className={`h-full bg-emerald-500 ${getVolatilityWidthClass(neighborhood.volatilityIndex)}`}
                                  />
                                </div>
                                <span className="text-xs font-bold text-slate-600">
                                  {neighborhood.volatilityIndex.toFixed(1)}
                                </span>
                              </div>
                            </td>
                            <td
                              className={`py-5 px-6 font-bold ${
                                neighborhood.trueCostDivergence < 0
                                  ? "text-error"
                                  : neighborhood.trueCostDivergence > 0
                                    ? "text-emerald-600"
                                    : "text-slate-400"
                              }`}
                            >
                              {neighborhood.trueCostDivergence < 0 ? "-" : "+"} $
                              {Math.abs(neighborhood.trueCostDivergence).toLocaleString()} ({neighborhood.divergenceLabel})
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-sm bg-surface-container-lowest p-8 shadow-[0_4px_24px_rgba(20,29,35,0.04)]">
              <div className="mb-10 flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-primary">
                    Historical Concession Trends
                  </h3>
                  <p className="text-sm font-medium text-slate-400">
                    Monthly volume of &quot;Free Month&quot; lease incentives (chart integration follows the library step).
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="rounded-sm bg-primary px-3 py-1 text-[10px] font-black uppercase text-white">
                    Market Rate
                  </span>
                  <span className="rounded-sm bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase text-emerald-700">
                    {env.APP_NAME} Avg
                  </span>
                </div>
              </div>
              <div className="relative flex h-64 w-full items-center justify-center rounded-sm bg-gradient-to-b from-slate-50 to-slate-100">
                <p className="text-sm text-slate-400">Chart library integration is next.</p>
              </div>
              <div className="mt-4 flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span>Jan &apos;23</span>
                <span>Mar &apos;23</span>
                <span>Jun &apos;23</span>
                <span>Sep &apos;23</span>
                <span>Dec &apos;23</span>
                <span>Feb &apos;24</span>
              </div>
            </div>
          </div>

          <div className="col-span-12 space-y-8 lg:col-span-4">
            <div className="rounded-sm bg-primary-container p-8 text-white shadow-[0_4px_24px_rgba(20,29,35,0.08)]">
              <div className="mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400">campaign</span>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-300">
                  Market Volatility Alerts
                </h3>
              </div>
              <div className="space-y-6">
                {isLoading
                  ? Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="h-16 animate-pulse rounded-sm bg-white/5" />
                    ))
                  : alerts.map((alert) => (
                      <div key={`${alert.type}-${alert.title}`} className="flex gap-4 group">
                        <div
                          className={`shrink-0 h-12 w-1 rounded-full ${
                            alert.severity === "critical"
                              ? "bg-emerald-500"
                              : alert.severity === "warning"
                                ? "bg-red-400"
                                : "bg-slate-500"
                          }`}
                        />
                        <div>
                          <p
                            className={`mb-1 text-xs font-bold uppercase tracking-widest ${
                              alert.severity === "critical"
                                ? "text-emerald-400"
                                : alert.severity === "warning"
                                  ? "text-red-400"
                                  : "text-slate-400"
                            }`}
                          >
                            {alert.title}
                          </p>
                          <p className="text-sm font-medium leading-snug">{alert.description}</p>
                        </div>
                      </div>
                    ))}
              </div>
              <Link
                href="/alerts"
                className="mt-10 flex w-full items-center justify-center rounded-sm border border-white/10 bg-white/5 py-3 text-xs font-black uppercase tracking-widest transition-colors hover:bg-white/10"
              >
                View All Signals
              </Link>
            </div>

            <div className="flex h-[400px] flex-col overflow-hidden rounded-sm bg-surface-container-highest shadow-[0_2px_8px_rgba(20,29,35,0.02)]">
              <div className="p-8">
                <h3 className="text-lg font-bold tracking-tight text-primary">
                  Supply Distribution
                </h3>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  Market-rate vs Rent-controlled concentration
                </p>
              </div>
              <div className="relative flex flex-1 items-center justify-center bg-slate-200">
                <div className="absolute inset-0 bg-slate-300 opacity-20" />
                <div className="absolute left-1/3 top-1/4 h-32 w-32 animate-pulse rounded-full bg-emerald-500/30 blur-3xl" />
                <div className="absolute bottom-1/3 right-1/4 h-40 w-40 rounded-full bg-emerald-600/20 blur-3xl" />
                <div className="relative z-10 rounded-sm bg-white p-3 shadow-xl">
                  <p className="mb-1 text-[8px] font-black uppercase tracking-widest text-slate-400">
                    Derived Snapshot
                  </p>
                  <p className="text-xs font-bold text-primary">
                    {data ? `${data.neighborhoods[0]?.name ?? "Top Cluster"}` : "Loading market data"}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between bg-white p-4">
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-[9px] font-bold uppercase text-slate-500">
                      High Supply
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-primary/40" />
                    <span className="text-[9px] font-bold uppercase text-slate-500">
                      Controlled
                    </span>
                  </div>
                </div>
                <button type="button" className="text-slate-400 transition-colors hover:text-primary">
                  <span className="material-symbols-outlined text-lg">zoom_out_map</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-20 flex items-center justify-between border-t border-slate-200/50 pt-12 text-slate-400">
          <div className="flex items-center gap-8">
            <span className="text-[10px] font-black uppercase tracking-widest">
              © {new Date().getFullYear()} {env.APP_NAME} Institutional
            </span>
            <Link href="#" className="text-[10px] font-black uppercase tracking-widest transition-colors hover:text-primary">
              Data Methodology
            </Link>
            <Link href="#" className="text-[10px] font-black uppercase tracking-widest transition-colors hover:text-primary">
              Privacy Protocol
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold">Terminal ID: NYC-8492-Z</span>
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
      </main>
    </AppLayout>
  );
}
