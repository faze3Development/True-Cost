"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { useProperties } from "@/hooks/useProperties";
import { fetchPropertyUnits, fetchUnitHistory } from "@/api/properties";
import type { Property } from "@/types/property";
import type { UnitHistoryPoint } from "@/types/unitHistory";
import { buildAnalyticsUrl, buildReportsUrl } from "@/routes";
import { env } from "@/lib/env";
import { useBookmarks } from "@/hooks/useBookmarks";
import { isValidPropertyId } from "@/security";

const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const DEFAULT_BOUNDS = "-180,-90,180,90";
const tabs = ["All Assets", "Apartments", "Commercial", "New Construction"] as const;

type TrendDirection = "up" | "down" | "stable";

type DerivedAsset = {
  id: string;
  title: string;
  city: string;
  neighborhood: string;
  advertised: number;
  trueCost: number;
  delta: number;
  trend: TrendDirection;
  imageUrl?: string;
  badgeLabel?: string;
  insight?: "positive" | "neutral" | "negative";
  propertyType?: string;
};

type Segment = {
  city: string;
  label: string;
  change: number;
  metric: string;
  sentiment: TrendDirection;
};

type SegmentDraft = {
  city: string;
  label: string;
  metric: string;
  change: string;
};

const SEGMENTS_STORAGE_KEY = "saved-assets:user-segments";

function normalizeAssets(data?: Property[]): DerivedAsset[] {
  if (!data) return [];

  return data.map((item) => {
    const advertised = item.advertisedRent || 0;
    const trueCost = item.trueCost || 0;
    const delta = advertised === 0 ? 0 : ((trueCost - advertised) / advertised) * 100;
    const trend: TrendDirection = delta < -0.25 ? "down" : delta > 0.25 ? "up" : "stable";

    return {
      id: item.id,
      title: item.title ?? "Untitled",
      city: item.city,
      neighborhood: item.neighborhood || item.city,
      advertised,
      trueCost,
      delta: Math.round(delta * 10) / 10,
      trend,
      imageUrl:
        item.imageUrl ||
        "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=1200&q=80",
      badgeLabel: item.badgeLabel,
      insight: item.insight,
      propertyType: item.propertyType,
    };
  });
}

function deriveSegments(assets: DerivedAsset[], userSegments: Segment[]): Segment[] {
  const grouped = new Map<string, { deltaSum: number; count: number; label: string }>();

  assets.forEach((asset) => {
    const existing = grouped.get(asset.city) ?? { deltaSum: 0, count: 0, label: asset.neighborhood };
    grouped.set(asset.city, {
      deltaSum: existing.deltaSum + asset.delta,
      count: existing.count + 1,
      label: existing.label || asset.neighborhood,
    });
  });

  const derived = Array.from(grouped.entries())
    .map(([city, info]) => {
      const change = info.count ? info.deltaSum / info.count : 0;
      const sentiment: TrendDirection = change < -0.2 ? "down" : change > 0.2 ? "up" : "stable";
      return {
        city,
        label: info.label,
        change: Math.round(change * 10) / 10,
        metric: `${env.APP_NAME} delta vs advertised`,
        sentiment,
      } satisfies Segment;
    })
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, 3);

  return [...derived, ...userSegments];
}

function Sparkline({ propertyId }: { propertyId: string }) {
  // Validate propertyId using centralized validator
  const isValidId = isValidPropertyId(propertyId);

  const { data, isLoading, isError } = useQuery<UnitHistoryPoint[]>({
    queryKey: ["property-sparkline", propertyId],
    queryFn: async () => {
      if (!isValidId) return [];
      const units = await fetchPropertyUnits(propertyId);
      if (!units.length) return [];
      return fetchUnitHistory(String(units[0].id), 45);
    },
    staleTime: 1000 * 60 * 10,
    enabled: isValidId,
  });

  const points = data ?? [];

  if (!isValidId) {
    return (
      <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-surface-container px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
        <span className="material-symbols-outlined text-base" aria-hidden>
          error_outline
        </span>
        Invalid data
      </span>
    );
  }

  if (isError) {
    return (
      <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-error/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-error" aria-label="Error loading history">
        <span className="material-symbols-outlined text-base" aria-hidden>
          warning
        </span>
        Error
      </span>
    );
  }

  if (isLoading) {
    return <div className="mt-2 h-4 w-24 animate-pulse rounded-full bg-surface-container" aria-hidden />;
  }

  if (!points.length) {
    return (
      <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-surface-container px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M4 16l4-4 3 3 5-5" />
          <path d="M3 3l18 18" />
        </svg>
        No history yet
      </span>
    );
  }

  const values = points.map((p) => p.trueCost ?? p.advertisedRent);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const width = 110;
  const height = 28;

  const coords = values.map((value, idx) => {
    const x = (idx / Math.max(values.length - 1, 1)) * width;
    const y = height - ((value - min) / range) * height;
    return { x, y };
  });

  const path = coords
    .map((pt, idx) => `${idx === 0 ? "M" : "L"}${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`)
    .join(" ");

  const areaPath = `${path} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 h-7 w-28 text-secondary" role="img" aria-label={`${env.APP_NAME} trend sparkline`}>
      <defs>
        <linearGradient id={`spark-${propertyId}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.8" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#spark-${propertyId})`} stroke="none" />
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function SavedAssetsClient() {
  const router = useRouter();
  const { bookmarkedIds, toggleBookmark } = useBookmarks();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>(tabs[0]);
  const [userSegments, setUserSegments] = useState<Segment[]>([]);
  const [isAddingSegment, setIsAddingSegment] = useState(false);
  const [draft, setDraft] = useState<SegmentDraft>({ city: "", label: "", metric: "", change: "" });
  const [isHydrated, setIsHydrated] = useState(false);

  const { data, isLoading, isFetching } = useProperties(DEFAULT_BOUNDS, { enabled: true });

  const assets = useMemo(() => normalizeAssets(data), [data]);

  const filteredAssets = useMemo(() => {
    const lowered = search.trim().toLowerCase();

    return assets
      .filter((asset) => bookmarkedIds.has(String(asset.id)))
      .filter((asset) => {
        if (!lowered) return true;
        return (
          asset.title.toLowerCase().includes(lowered) ||
          asset.city.toLowerCase().includes(lowered) ||
          asset.neighborhood.toLowerCase().includes(lowered)
        );
      })
      .filter((asset) => {
        if (activeTab === "All Assets") return true;
        // Match the asset's tagged category to the selected tab.
        return asset.propertyType === activeTab;
      });
  }, [assets, search, activeTab, bookmarkedIds]);

  const segments = useMemo(() => deriveSegments(assets, userSegments), [assets, userSegments]);

  const averageDelta = useMemo(() => {
    if (!filteredAssets.length) return 0;
    const sum = filteredAssets.reduce((acc, asset) => acc + asset.delta, 0);
    return Math.round((sum / filteredAssets.length) * 10) / 10;
  }, [filteredAssets]);

  const handleBookmarkRemove = (id: string) => {
    toggleBookmark(id);
  };

  const handleViewAnalysis = (id: string) => {
    router.push(buildAnalyticsUrl(id));
  };

  const handleAddSegment = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedChange = parseFloat(draft.change);
    if (!draft.city || Number.isNaN(parsedChange)) return;

    const sentiment: TrendDirection = parsedChange < -0.2 ? "down" : parsedChange > 0.2 ? "up" : "stable";
    setUserSegments((prev) => {
      const next = [
        ...prev,
        {
          city: draft.city,
          label: draft.label || draft.city,
          metric: draft.metric || "User segment",
          change: Math.round(parsedChange * 10) / 10,
          sentiment,
        },
      ];
      try {
        localStorage.setItem(SEGMENTS_STORAGE_KEY, JSON.stringify(next));
      } catch (error) {
        console.warn("Failed to persist segments", error);
      }
      return next;
    });
    setDraft({ city: "", label: "", metric: "", change: "" });
    setIsAddingSegment(false);
  };

  // Hydrate saved state from localStorage once on mount.
  useEffect(() => {
    try {
      const savedSegments = localStorage.getItem(SEGMENTS_STORAGE_KEY);
      if (savedSegments) {
        const parsed: Segment[] = JSON.parse(savedSegments);
        setUserSegments(parsed);
      }
    } catch (error) {
      console.warn("Failed to hydrate saved assets state", error);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Avoid rendering mismatches during hydration.
  if (!isHydrated) {
    return null;
  }

  return (
    <AppLayout>
      <div className="flex min-h-full flex-col bg-surface text-on-surface">
        {/* Top Command Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-start bg-surface/90 px-10 py-4 backdrop-blur-2xl">
          <div className="flex w-full max-w-xl items-center gap-3 rounded-full bg-surface-container-low px-4 py-2.5 shadow-ambient">
            <span className="material-symbols-outlined text-on-surface-variant" aria-hidden>
              search
            </span>
            <input
              aria-label="Search saved properties"
              className="w-full bg-transparent text-sm font-medium text-on-surface placeholder:text-on-surface-variant focus:outline-none"
              placeholder="Search saved properties..."
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </header>

        <main className="flex-1 px-10 pb-16 pt-10">
            {/* Hero */}
            <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
              <div className="space-y-2">
                <h1 className="text-4xl font-black tracking-tight text-on-surface">Saved Assets &amp; Watchlist</h1>
                <p className="text-lg text-on-surface-variant">Tracked properties and regional market volatility.</p>
                {isFetching ? (
                  <p className="text-sm text-on-surface-variant">Refreshing latest market deltas…</p>
                ) : null}
              </div>
              <div className="flex items-center gap-1 rounded-2xl bg-surface-container-low p-1">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    className={
                      tab === activeTab
                        ? "rounded-xl bg-surface-container-lowest px-5 py-2 text-sm font-bold text-on-surface shadow-ambient"
                        : "rounded-xl px-5 py-2 text-sm font-semibold text-on-surface-variant transition-colors hover:text-on-surface"
                    }
                    type="button"
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </header>

            <div className="grid grid-cols-1 gap-10 xl:grid-cols-12">
              {/* Asset Grid */}
              <section className="space-y-8 xl:col-span-8" aria-label="Saved assets">
                {isLoading ? (
                  <div className="grid grid-cols-1 gap-8 md:grid-cols-2" aria-hidden>
                    {[1, 2, 3, 4].map((skeleton) => (
                      <div key={skeleton} className="h-72 rounded-2xl bg-surface-container animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                    {filteredAssets.map((asset) => (
                      <article
                        key={asset.id}
                        className="group overflow-hidden rounded-2xl bg-surface-container-lowest shadow-ambient transition-all duration-300 hover:-translate-y-1 hover:shadow-ambient-strong"
                      >
                        <div className="relative h-56 overflow-hidden">
                          <img
                            alt={asset.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            src={asset.imageUrl}
                          />
                          <button
                            aria-label="Remove bookmark"
                            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-on-surface transition-colors hover:text-error"
                            type="button"
                            onClick={() => handleBookmarkRemove(asset.id)}
                          >
                            <span className="material-symbols-outlined" aria-hidden>
                              bookmark_remove
                            </span>
                          </button>
                        </div>

                        <div className={asset.insight === "positive" ? "border-t-2 border-secondary bg-surface" : "bg-surface-container-lowest"}>
                          <div className="space-y-6 px-7 py-6">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="text-xl font-bold tracking-tight text-on-surface">{asset.title}</h3>
                                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                                  {asset.neighborhood}, {asset.city}
                                </p>
                              </div>
                              <div className="text-right">
                                <div
                                  className={`flex items-center justify-end gap-1 text-sm font-bold ${
                                    asset.delta < 0 ? "text-secondary" : asset.delta > 0 ? "text-error" : "text-on-surface-variant"
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-base" aria-hidden>
                                    {asset.trend === "down"
                                      ? "trending_down"
                                      : asset.trend === "up"
                                        ? "trending_up"
                                        : "horizontal_rule"}
                                  </span>
                                  <span>{asset.delta === 0 ? "Stable" : `${asset.delta > 0 ? "+" : ""}${asset.delta}%`}</span>
                                </div>
                                <Sparkline propertyId={asset.id} />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 rounded-xl bg-surface-container-low p-4">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Advertised</p>
                                <p className="text-sm font-medium text-on-surface-variant line-through tabular-nums">
                                  {formatter.format(asset.advertised)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">{env.APP_NAME}</p>
                                <p className="text-2xl font-black tracking-tight text-secondary tabular-nums">
                                  {formatter.format(asset.trueCost)}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                              {asset.badgeLabel ? (
                                <span className="rounded-full bg-surface-container px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                                  {asset.badgeLabel}
                                </span>
                              ) : (
                                <span className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                                  &nbsp;
                                </span>
                              )}
                              <button
                                type="button"
                                className="w-full rounded-lg bg-gradient-to-r from-primary to-[#0D1C32] px-4 py-3 text-sm font-bold text-white shadow-ambient transition-opacity hover:opacity-90"
                                onClick={() => handleViewAnalysis(asset.id)}
                              >
                                View Analysis
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              {/* Market Segments & Insights */}
              <section className="space-y-6 xl:col-span-4" aria-label="Market segments and insights">
                <div className="rounded-2xl bg-surface-container-low p-6 shadow-ambient">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Market Segments</p>
                      <h3 className="text-2xl font-bold text-on-surface">Volatility Watch</h3>
                    </div>
                    <button
                      type="button"
                      className="text-sm font-semibold text-secondary transition-colors hover:text-secondary/80"
                      aria-label="Add new segment"
                      onClick={() => setIsAddingSegment((open) => !open)}
                    >
                      {isAddingSegment ? "Cancel" : "Add New"}
                    </button>
                  </div>

                  {isAddingSegment ? (
                    <form className="mb-4 grid grid-cols-2 gap-3" onSubmit={handleAddSegment}>
                      <input
                        className="col-span-2 rounded-lg bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none ring-1 ring-transparent focus:ring-secondary"
                        placeholder="City"
                        value={draft.city}
                        onChange={(e) => setDraft((prev) => ({ ...prev, city: e.target.value }))}
                        required
                      />
                      <input
                        className="rounded-lg bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none ring-1 ring-transparent focus:ring-secondary"
                        placeholder="Label"
                        value={draft.label}
                        onChange={(e) => setDraft((prev) => ({ ...prev, label: e.target.value }))}
                      />
                      <input
                        className="rounded-lg bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none ring-1 ring-transparent focus:ring-secondary"
                        placeholder="Metric"
                        value={draft.metric}
                        onChange={(e) => setDraft((prev) => ({ ...prev, metric: e.target.value }))}
                      />
                      <input
                        className="rounded-lg bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none ring-1 ring-transparent focus:ring-secondary"
                        placeholder="Change %"
                        value={draft.change}
                        onChange={(e) => setDraft((prev) => ({ ...prev, change: e.target.value }))}
                        required
                      />
                      <button
                        type="submit"
                        className="col-span-2 rounded-lg bg-secondary px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                      >
                        Save Segment
                      </button>
                    </form>
                  ) : null}

                  <div className="space-y-3">
                    {segments.map((segment) => (
                      <article key={`${segment.city}-${segment.label}`} className="rounded-xl bg-surface-container-lowest px-4 py-3 shadow-ambient">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">{segment.city}</p>
                            <p className="text-base font-semibold text-on-surface">{segment.label}</p>
                            <p className="text-sm text-on-surface-variant">{segment.metric}</p>
                          </div>
                          <div className="text-right">
                            <span
                              className={`text-sm font-bold ${
                                segment.sentiment === "up"
                                  ? "text-secondary"
                                  : segment.sentiment === "down"
                                    ? "text-error"
                                    : "text-on-surface-variant"
                              }`}
                            >
                              {segment.change > 0 ? "+" : ""}
                              {segment.change}%
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 h-1.5 rounded-full bg-surface-container">
                          <div
                            className={`h-full rounded-full ${
                              segment.sentiment === "up"
                                ? "bg-secondary"
                                : segment.sentiment === "down"
                                  ? "bg-error"
                                  : "bg-on-surface-variant/40"
                            }`}
                            style={{ width: `${Math.min(Math.abs(segment.change) * 10, 100)}%` }}
                            aria-hidden
                          />
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <article className="rounded-2xl bg-gradient-to-br from-primary to-[#0D1C32] p-6 text-white shadow-ambient">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/80">Portfolio Insights</p>
                  <h3 className="mt-3 text-2xl font-extrabold tracking-tight">This Month</h3>
                  <p className="mt-3 text-sm text-white/80">
                    Saved assets show an average {averageDelta}% delta between advertised and {env.APP_NAME}.
                  </p>
                  <button
                    type="button"
                    className="mt-6 w-full rounded-lg bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur transition-all hover:bg-white/15"
                    onClick={() => router.push(buildReportsUrl())}
                  >
                    Download Full Summary
                  </button>
                </article>
              </section>
            </div>
          </main>
        </div>
    </AppLayout>
  );
}
