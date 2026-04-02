"use client";

import React from "react";
import AppLayout from "@/components/AppLayout";
import Link from "next/link";
import { useParams } from "next/navigation";
import { env } from "@/lib/env";
import { useProperty } from "@/hooks/useProperty";
import { usePropertyUnits } from "@/hooks/usePropertyUnits";
import { useUnitHistory } from "@/hooks/useUnitHistory";
import { useBookmarks } from "@/hooks/useBookmarks";
import PriceHistoryChart from "@/components/PriceHistoryChart";
import clsx from "clsx";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export default function PropertyDetailsPage() {
  const params = useParams();
  const id = params?.id as string;
  const { bookmarkedIds, toggleBookmark } = useBookmarks();

  const {
    data: property,
    isLoading: propertyLoading,
    isError: propertyError,
  } = useProperty(id);
  const {
    data: units,
    isLoading: unitsLoading,
    isError: unitsError,
  } = usePropertyUnits(id);

  const unit = units?.[0];
  const {
    data: history,
    isLoading: historyLoading,
    isError: historyError,
  } = useUnitHistory(unit?.id?.toString() || "");

  const hasLoadError = propertyError || unitsError || historyError;
  const hasUnits = Boolean(units && units.length > 0);
  const hasHistory = Boolean(history && history.length > 0);

  const latestHistory = history?.[history.length - 1];

  const propertyName = property?.name || (propertyLoading ? "Loading Property..." : "Property Not Found");
  const unitName = unit ? `Unit ${unit.unitNumber}` : (unitsLoading ? "Loading Unit..." : "No Units");
  const specs = unit ? `${unit.bedrooms} Bed / ${unit.bathrooms} Bath` : "";
  const area = unit?.squareFeet ? `${unit.squareFeet} SQ FT` : "N/A";

  const advertisedRent = latestHistory?.advertisedRent || 0;
  const trueCost = latestHistory?.trueCost || 0;

  // Calculate specific fees if available
  const trashFee = property?.fee_structure?.trash_fee || 0;
  const amenityFee = property?.fee_structure?.amenity_fee || 0;
  const packageFee = property?.fee_structure?.package_fee || 0;
  const waterSewerFee = property?.fee_structure?.water_sewer_fee || 0;
  const petRent = property?.fee_structure?.pet_rent || 0;
  const parkingCost = property?.fee_structure?.parking_fee || 0;
  const moveInFee = property?.fee_structure?.move_in_fee || 0;
  const moveOutFee = property?.fee_structure?.move_out_fee || 0;
  const hasDeposit = property?.fee_structure?.has_deposit;
  const hasPetDeposit = property?.fee_structure?.has_pet_deposit;

  const mandatoryFees = trashFee + amenityFee + packageFee + waterSewerFee;

  const concessionText = latestHistory?.concession || "";
  const amortizedSavings = trueCost - (advertisedRent + mandatoryFees); // Usually negative if savings

  return (
    <AppLayout>
      <div className="flex-1 p-6 md:p-10 max-w-[1440px] mx-auto w-full">
        {/* Breadcrumbs & Header */}
        <nav className="mb-6 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">
          <Link className="hover:text-primary transition-colors" href="/market-analysis">
            Market Map
          </Link>
          <span className="material-symbols-outlined text-[10px]" aria-hidden="true">
            chevron_right
          </span>
          <span className="hover:text-primary transition-colors cursor-pointer">
            {propertyName}
          </span>
          <span className="material-symbols-outlined text-[10px]" aria-hidden="true">
            chevron_right
          </span>
          <span className="text-on-surface">{unitName}</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Left Column: Data Visuals */}
          <div className="flex-1 min-w-0">
            <header className="mb-10 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-4xl md:text-5xl font-black text-on-surface tracking-tighter mb-2">
                  {propertyName} {specs && `- ${specs}`}
                </h1>
                <p className="text-on-surface-variant font-medium flex items-center gap-2">
                  <span
                    className="material-symbols-outlined text-secondary"
                    aria-hidden="true"
                  >
                    verified
                  </span>
                  Institutional Grade Unit Analysis — Sector: High-Density Urban
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleBookmark(id)}
                className="flex items-center gap-2 rounded-full bg-surface-container hover:bg-surface-container-high px-4 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60 shrink-0"
              >
                <span 
                  className={clsx("material-symbols-outlined", bookmarkedIds.has(id) ? "text-secondary" : "text-on-surface-variant")}
                  style={bookmarkedIds.has(id) ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  bookmark
                </span>
                <span className="text-sm font-bold uppercase tracking-widest text-on-surface hidden md:inline">
                  {bookmarkedIds.has(id) ? "Saved" : "Save"}
                </span>
              </button>
            </header>

            {hasLoadError ? (
              <div className="mb-8 rounded-lg border border-error/20 bg-error/5 px-4 py-3 text-sm text-error">
                We could not load part of this unit dataset. This is commonly caused by an expired login token while calling protected API routes.
              </div>
            ) : null}

            {/* 90-Day Market Delta Chart Section */}
            <div className="bg-surface-container-low rounded-xl p-8 mb-10">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-1">
                    90-Day Market Delta
                  </h2>
                  <p className="text-2xl font-black text-on-surface">
                    Advertised vs. Net Effective
                  </p>
                </div>
                <div className="flex bg-surface-container-lowest p-1 rounded-lg gap-1">
                  <button className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider bg-primary text-on-primary rounded-md">
                    90D
                  </button>
                  <button className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-on-surface-variant hover:bg-surface-container-high transition-colors rounded-md">
                    180D
                  </button>
                  <button className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-on-surface-variant hover:bg-surface-container-high transition-colors rounded-md">
                    1Y
                  </button>
                  <button className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-on-surface-variant hover:bg-surface-container-high transition-colors rounded-md">
                    ALL
                  </button>
                </div>
              </div>

              <div className="relative w-full overflow-hidden rounded-lg bg-surface-container-lowest p-6">
                {unit?.id ? (
                  <PriceHistoryChart unitId={String(unit.id)} daysRange={90} />
                ) : (
                  <div className="flex h-[320px] items-center justify-center px-6 text-center">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                        {unitsLoading
                          ? "Loading unit records..."
                          : historyLoading
                            ? "Loading price history..."
                            : hasLoadError
                              ? "Chart data could not be loaded"
                              : !hasUnits
                                ? "No units are attached to this property"
                                : !hasHistory
                                  ? "No unit history available yet"
                                  : "Chart data unavailable"}
                      </p>
                      {!unitsLoading && !hasLoadError && !hasUnits ? (
                        <p className="mt-2 text-sm text-on-surface-variant">
                          Add at least one unit and related price records for this property to render the 90-day delta chart.
                        </p>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* TrueCost Calculator Section */}
            <section className="mb-12">
              <h2 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-6">
                Financial Audit &amp; {env.APP_NAME} Breakdown
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="flex justify-between items-center py-4 border-b border-outline-variant/10">
                    <span className="text-sm font-semibold text-on-surface-variant">
                      Advertised Rent
                    </span>
                    <span className="text-lg font-black text-on-surface tabular-nums">
                      {currency.format(advertisedRent)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-4 border-b border-outline-variant/10">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-on-surface-variant">
                        Amortized Savings
                      </span>
                      {concessionText && (
                        <span className="bg-secondary-container text-on-secondary-container text-[10px] px-2 py-0.5 rounded font-black uppercase">
                          {concessionText}
                        </span>
                      )}
                    </div>
                    <span className="text-lg font-black text-secondary tabular-nums">
                      {amortizedSavings < 0 ? "-" : "+"}{currency.format(Math.abs(amortizedSavings))}
                    </span>
                  </div>
                  <div className="flex flex-col py-4 border-b border-outline-variant/10">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-on-surface-variant">
                        Mandatory Fees
                      </span>
                      <span className="text-lg font-black text-error tabular-nums">
                        +{currency.format(mandatoryFees)}
                      </span>
                    </div>
                    {mandatoryFees > 0 && (
                      <div className="mt-2 space-y-1 pl-4 border-l-2 border-outline-variant/20">
                        {trashFee > 0 && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-on-surface-variant/80">Trash Valet</span>
                            <span className="text-error/80">+{currency.format(trashFee)}</span>
                          </div>
                        )}
                        {amenityFee > 0 && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-on-surface-variant/80">Amenity Access</span>
                            <span className="text-error/80">+{currency.format(amenityFee)}</span>
                          </div>
                        )}
                        {packageFee > 0 && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-on-surface-variant/80">Package Locker</span>
                            <span className="text-error/80">+{currency.format(packageFee)}</span>
                          </div>
                        )}
                        {waterSewerFee > 0 && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-on-surface-variant/80">Water &amp; Sewer</span>
                            <span className="text-error/80">+{currency.format(waterSewerFee)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {(moveInFee > 0 || moveOutFee > 0 || hasDeposit || hasPetDeposit) && (
                    <div className="flex flex-col py-4 border-b border-outline-variant/10">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-on-surface-variant">
                          One-Time Liabilities
                        </span>
                        <span className="text-lg font-black text-on-surface tabular-nums">
                          {currency.format(moveInFee + moveOutFee)}
                        </span>
                      </div>
                      <div className="mt-2 space-y-1 pl-4 border-l-2 border-outline-variant/20">
                        {moveInFee > 0 && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-on-surface-variant/80">Move-in Fee</span>
                            <span className="text-on-surface/80">+{currency.format(moveInFee)}</span>
                          </div>
                        )}
                        {moveOutFee > 0 && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-on-surface-variant/80">Move-out Fee</span>
                            <span className="text-on-surface/80">+{currency.format(moveOutFee)}</span>
                          </div>
                        )}
                        {hasDeposit && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-on-surface-variant/80">Security Deposit</span>
                            <span className="text-on-surface/80">Required</span>
                          </div>
                        )}
                        {hasPetDeposit && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-on-surface-variant/80">Pet Deposit</span>
                            <span className="text-on-surface/80">Required</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="bg-primary p-8 rounded-xl flex flex-col justify-between">
                  <div>
                    <span className="text-on-primary-container text-[10px] font-black uppercase tracking-widest block mb-2">
                      Final Institutional Valuation
                    </span>
                    <h3 className="text-white text-sm font-medium leading-relaxed opacity-70">
                      Calculated monthly liability including concessions, amenity premiums, and mandatory service bundles.
                    </h3>
                  </div>
                  <div className="mt-8">
                    <p className="text-on-primary-container text-xs font-bold uppercase tracking-wider mb-1">
                      {env.APP_NAME}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black text-white tabular-nums tracking-tighter">
                        {currency.format(trueCost)}
                      </span>
                      <span className="text-on-primary-container text-sm font-bold">
                        /MO
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Verified Data Footer */}
            <div className="bg-surface-container-highest/30 p-6 rounded-lg flex gap-4 items-start">
              <span className="material-symbols-outlined text-secondary text-3xl" aria-hidden="true">
                policy
              </span>
              <div>
                <h4 className="text-sm font-black uppercase tracking-tight text-on-surface mb-1">
                  Verified Institutional Data Stamp
                </h4>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  This asset pricing has been verified through direct ledger integration and real-time scrapers. Last synchronized: 14 minutes ago. Accuracy confidence interval: 99.8%.
                </p>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Spec & Tracking */}
          <aside className="w-full lg:w-80 flex flex-col gap-8">
            {/* Unit Specifications */}
            <div className="bg-surface-container-low rounded-xl overflow-hidden">
              <div className="bg-surface-container-high px-6 py-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-on-surface">
                  Unit Specification
                </h3>
              </div>
              <div className="p-6 space-y-5">
                <div className="flex justify-between">
                  <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    Total Area
                  </span>
                  <span className="text-sm font-black text-on-surface">{area}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    Floor / Tier
                  </span>
                  <span className="text-sm font-black text-on-surface">TBD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    Parking Cost
                  </span>
                  <span className="text-sm font-black text-on-surface">{currency.format(parkingCost)} / MO</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    Pet Rent
                  </span>
                  <span className="text-sm font-black text-on-surface">{currency.format(petRent)} / MO</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    Ceiling Height
                  </span>
                  <span className="text-sm font-black text-on-surface">10&apos; 6&quot;</span>
                </div>
              </div>
            </div>

            {/* Watching Widget */}
            <div className="bg-white rounded-xl p-8 border-l-4 border-primary shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <span className="material-symbols-outlined text-primary" aria-hidden="true">
                  visibility
                </span>
                <h3 className="text-xs font-black uppercase tracking-widest text-on-surface">
                  Institutional Intent
                </h3>
              </div>
              <div className="mb-4">
                <span className="text-4xl font-black text-on-surface tabular-nums">12</span>
                <span className="text-on-surface-variant font-bold text-sm ml-2">Watching</span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed mb-6 italic">
                Twelve other institutional portfolios are currently tracking this specific unit ID for acquisition or lease-up trends.
              </p>
              <button className="w-full bg-primary text-on-primary py-3 px-4 font-bold uppercase tracking-widest text-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-sm" aria-hidden="true">
                  add
                </span>
                Track Unit
              </button>
            </div>

            {/* Quick Map Snapshot */}
            <div className="bg-surface-container-low rounded-xl overflow-hidden h-48 relative">
              <img
                alt="Neighborhood location map"
                className="w-full h-full object-cover grayscale opacity-60"
                src={property?.image_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuDksTIubSvCZyevqYX_iiUG5SJGCOe0hGrKxaAXfRctLlcsJqRoKcRE7HHF4PhbzEiAXsTJyZAeur0oQk_yYd8yJI6cicKvx08jpzQOz0I90AujDpAAatR3evjW9mTwsjpB37d71nRwZhO2qrsIi_iTVkUTYifSU5Y3naxx8TlVnykVUzleyOLYtAWKpj54cmowR54DiGKzTgO-k4lm5RVs1IgVLVrLlRmvaAhsZt8n2vyvw2UbMRF17bqrrE6IgOfYYC_xgu8GxoOo"}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-sm" aria-hidden="true">
                  location_on
                </span>
                <span className="text-[10px] font-black uppercase tracking-tight text-on-surface">
                  District View
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
