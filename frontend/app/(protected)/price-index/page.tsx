"use client";

import Link from "next/link";
import { buildPropertyUrl } from "@/routes";
import AppLayout from "@/components/AppLayout";
import { env } from "@/lib/env";

interface PriceIndexMetric {
  label: string;
  value: string;
  change: number;
  description: string;
  trend: "up" | "down" | "stable";
}

interface PropertyPriceData {
  id: string;
  name: string;
  location: string;
  currentRent: number;
  trueRent: number;
  change: number;
  velocity: "High" | "Medium" | "Low";
  seasonality: "Optimal Window" | "Peak" | "Off-Peak";
  concessionScore: number;
}

const metrics: PriceIndexMetric[] = [
  {
    label: "Market Index",
    value: "$2,450",
    change: -8.4,
    description: "90-day average",
    trend: "down",
  },
  {
    label: "Concession Velocity",
    value: "High",
    change: 12.5,
    description: "Month-over-month",
    trend: "up",
  },
  {
    label: "Average Vacancy",
    value: "14 days",
    change: 3.2,
    description: "Typical lease-up time",
    trend: "down",
  },
  {
    label: "Peak Seasonality",
    value: "July",
    change: -14.2,
    description: "vs current month",
    trend: "down",
  },
];

const propertyData: PropertyPriceData[] = [
  {
    id: "1",
    name: "The Elm",
    location: "Buckhead, Atlanta",
    currentRent: 2145,
    trueRent: 2088,
    change: -8.4,
    velocity: "High",
    seasonality: "Optimal Window",
    concessionScore: 8.5,
  },
  {
    id: "2",
    name: "Midtown Market",
    location: "Midtown, Atlanta",
    currentRent: 2350,
    trueRent: 2301,
    change: -4.2,
    velocity: "Medium",
    seasonality: "Peak",
    concessionScore: 6.2,
  },
  {
    id: "3",
    name: "Heritage Lofts",
    location: "East Atlanta",
    currentRent: 1850,
    trueRent: 1820,
    change: 2.1,
    velocity: "Low",
    seasonality: "Off-Peak",
    concessionScore: 4.1,
  },
];

export default function PriceIndexPage() {
  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[1400px] px-8 pb-20 pt-8">
        {/* Header */}
        <header className="mb-12">
          <h1 className="mb-2 text-5xl font-black tracking-tight text-on-surface">
            Price Index Analysis
          </h1>
          <p className="max-w-2xl text-lg font-medium text-on-surface-variant">
            Market-wide rental pricing trends and institutional market delta analysis.
          </p>
        </header>

        {/* Key Metrics Grid */}
        <section className="mb-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-lg bg-surface-container-lowest p-6 border border-outline/15 shadow-sm"
            >
              <div className="mb-3 flex items-start justify-between">
                <span className="font-label text-xs uppercase tracking-widest font-bold text-on-surface-variant">
                  {metric.label}
                </span>
                <span
                  className={`flex items-center gap-1 text-sm font-bold ${
                    metric.trend === "down"
                      ? "text-secondary"
                      : metric.trend === "up"
                        ? "text-error"
                        : "text-on-surface-variant"
                  }`}
                >
                  {metric.change > 0 ? "↑" : "↓"} {Math.abs(metric.change)}%
                </span>
              </div>
              <div className="mb-2">
                <span className="text-3xl font-extrabold tracking-tighter tabular-nums">
                  {metric.value}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant">{metric.description}</p>
            </div>
          ))}
        </section>

        {/* Price History Chart Section */}
        <section className="mb-16 rounded-lg bg-surface-container-lowest p-8 shadow-sm">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <span className="font-label text-xs uppercase tracking-widest font-bold text-on-tertiary-container block mb-2">
                90-Day Market Delta
              </span>
              <h2 className="text-2xl font-bold">Pricing Trajectory</h2>
            </div>
            <div className="flex gap-2 rounded-lg bg-surface-container-low p-1">
              <button className="rounded-md bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary shadow-sm">
                90D
              </button>
              <button className="px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-on-tertiary-container transition-colors hover:text-primary">
                180D
              </button>
              <button className="px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-on-tertiary-container transition-colors hover:text-primary">
                1Y
              </button>
              <button className="px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-on-tertiary-container transition-colors hover:text-primary">
                ALL
              </button>
            </div>
          </div>
          <div className="h-64 rounded-lg bg-gradient-to-b from-surface-container-low to-surface-container-lowest flex items-center justify-center">
            <p className="text-on-surface-variant">Chart placeholder - integrate with charting library</p>
          </div>
          <div className="mt-6 flex gap-6">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-on-tertiary-container" />
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                Advertised Rent
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-secondary" />
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                {env.APP_NAME} (Net Effective)
              </span>
            </div>
          </div>
        </section>

        {/* Property Listings */}
        <section>
          <h2 className="mb-8 text-2xl font-bold tracking-tight text-on-surface">
            Market Properties
          </h2>
          <div className="space-y-4">
            {propertyData.map((property) => (
              <Link
                key={property.id}
                href={buildPropertyUrl(property.id)}
                className="block rounded-lg bg-surface-container-lowest p-6 border border-outline/15 transition-all hover:shadow-ambient hover:border-secondary/30"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-on-surface">{property.name}</h3>
                    <p className="text-sm text-on-surface-variant flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-base">location_on</span>
                      {property.location}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-extrabold tracking-tighter tabular-nums">
                        ${property.currentRent}
                      </span>
                      <span className={`text-sm font-bold ${property.change < 0 ? "text-secondary" : "text-error"}`}>
                        {property.change < 0 ? "↓" : "↑"} {Math.abs(property.change)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="rounded bg-surface-container-low p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      {env.APP_NAME}
                    </p>
                    <p className="mt-1 text-lg font-bold">${property.trueRent}</p>
                  </div>
                  <div className="rounded bg-surface-container-low p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      Velocity
                    </p>
                    <p className="mt-1 text-lg font-bold">{property.velocity}</p>
                  </div>
                  <div className="rounded bg-surface-container-low p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      Seasonality
                    </p>
                    <p className="mt-1 text-lg font-bold text-secondary">{property.seasonality}</p>
                  </div>
                  <div className="rounded bg-surface-container-low p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      Concession
                    </p>
                    <p className="mt-1 text-lg font-bold">{property.concessionScore} / 10</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
