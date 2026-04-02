"use client";

import clsx from "clsx";
import Link from "next/link";
import { buildPropertyUrl } from "@/routes";

type Insight = "positive" | "neutral";

export interface PropertyCardProps {
  id: number | string;
  title: string;
  neighborhood: string;
  city: string;
  advertisedRent: number;
  trueCost: number;
  imageUrl: string;
  badgeLabel?: string;
  insight?: Insight;
  isBookmarked?: boolean;
  onBookmark?: (e: React.MouseEvent) => void;
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function PropertyCard({
  id,
  title,
  neighborhood,
  city,
  advertisedRent,
  trueCost,
  imageUrl,
  badgeLabel,
  insight = "neutral",
  isBookmarked = false,
  onBookmark,
}: PropertyCardProps) {
  const accent = insight === "positive" ? "from-secondary to-secondary/80" : "from-tertiary to-tertiary/70";

  return (
    <Link href={buildPropertyUrl(id)} className="block">
      <article
        className={clsx(
          "group relative overflow-hidden rounded-xl bg-surface-container-lowest shadow-ambient transition-all duration-300",
          "hover:shadow-ambient-strong"
        )}
      >
        <div className={clsx("h-1 w-full bg-gradient-to-r", accent)} />
        <div className="relative h-48 overflow-hidden">
          <img
            src={imageUrl}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {badgeLabel ? (
            <div className="absolute top-3 right-3 rounded-lg bg-primary text-on-primary px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] shadow-ambient">
              {badgeLabel}
            </div>
          ) : null}
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-headline text-lg font-bold leading-tight text-on-surface tracking-tight">{title}</h3>
              <p className="mt-1 flex items-center gap-1 text-xs font-medium text-on-surface-variant">
                <span className="material-symbols-outlined text-sm" aria-hidden>
                  location_on
                </span>
                {neighborhood}, {city}
              </p>
            </div>
            <button
              type="button"
              aria-label="Bookmark listing"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onBookmark?.(e);
              }}
              className={clsx(
                "z-10 relative transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                isBookmarked ? "text-secondary hover:text-secondary/80" : "text-on-surface-variant hover:text-secondary"
              )}
            >
              <span 
                className="material-symbols-outlined text-xl" 
                style={isBookmarked ? { fontVariationSettings: "'FILL' 1" } : undefined}
                aria-hidden
              >
                bookmark
              </span>
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 items-end gap-4 rounded-lg bg-surface-container-low p-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Advertised</p>
              <p className="tabular-nums text-sm font-medium text-on-surface-variant line-through">
                {currency.format(advertisedRent)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">True Cost</p>
              <p className="tabular-nums text-2xl font-black leading-none tracking-tight text-secondary">
                {currency.format(trueCost)}
              </p>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
