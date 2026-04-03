"use client";

import PropertyCard from "@/components/PropertyCard";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { useState, useEffect, useMemo } from "react";
import type { Property } from "@/types/property";
import clsx from "clsx";
import { env } from "@/lib/env";

export interface FilterChip {
  label: string;
  value: string;
}

export interface ListingsFeedProps {
  properties: Property[];
  resultsCount: number;
  filters?: FilterChip[];
  isLoading?: boolean;
  isError?: boolean;
}

const defaultFilters: FilterChip[] = [
  { label: "Beds", value: "Any" },
  { label: "Baths", value: "Any" },
  { label: `Max ${env.APP_NAME}`, value: "$4,000" },
];

export default function ListingsFeed({ properties, resultsCount, filters = defaultFilters, isLoading, isError }: ListingsFeedProps) {
  const { bookmarkedIds, toggleBookmark } = useBookmarks();
  const [displayLimit, setDisplayLimit] = useState(10);
  const [setRef, isIntersecting] = useIntersectionObserver({ threshold: 0.1 });

  useEffect(() => {
    if (isIntersecting && displayLimit < properties.length) {
      setDisplayLimit((prev) => prev + 10);
    }
  }, [isIntersecting, properties.length, displayLimit]);

  // Reset limit if new results come in
  useEffect(() => {
    setDisplayLimit(10);
  }, [properties]);

  const displayedProperties = useMemo(() => {
    return properties.slice(0, displayLimit);
  }, [properties, displayLimit]);

  return (
    <section className="flex w-full max-w-[520px] flex-col bg-surface-container-low">
      <div className="sticky top-0 z-10 bg-surface/85 px-4 py-4 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Available Listings</p>
            <h1 className="text-xl font-extrabold leading-tight tracking-tight text-on-surface">Map Search</h1>
          </div>
          <span className="tabular-nums text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">
            {resultsCount} Results Found
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter.label}
              type="button"
              className={clsx(
                "flex items-center gap-2 rounded-lg bg-surface-container-lowest px-3 py-2 text-xs font-semibold text-on-surface",
                "ghost-border shadow-ambient transition-colors hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              )}
            >
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">{filter.label}</span>
              <span className="text-sm text-on-surface">{filter.value}</span>
              <span className="material-symbols-outlined text-base text-on-surface-variant" aria-hidden>
                expand_more
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <p className="text-sm text-on-surface-variant">Loading market data…</p>
        ) : isError ? (
          <p className="text-sm text-error">Unable to load properties. Showing any cached data.</p>
        ) : null}

        {displayedProperties.map((property) => (
          <PropertyCard
            key={property.id}
            {...property}
            isBookmarked={bookmarkedIds.has(String(property.id))}
            onBookmark={(e: React.MouseEvent) => {
              toggleBookmark(property.id);
            }}
          />
        ))}

        {displayLimit < properties.length && (
          <div ref={setRef} className="py-6 text-center">
            <span className="material-symbols-outlined animate-spin text-primary" aria-hidden="true">
              progress_activity
            </span>
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mt-2">Loading more listings...</p>
          </div>
        )}
      </div>
    </section>
  );
}
