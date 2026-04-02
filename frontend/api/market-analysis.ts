import { fetchPropertyUnits, fetchProperties, fetchUnitHistory, type ApiPropertyResponse } from "./properties";
import { env } from "@/lib/env";

export interface MarketMetric {
  label: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  description: string;
}

export interface NeighborhoodData {
  name: string;
  avgListing: number;
  volatilityIndex: number;
  trueCostDivergence: number;
  divergenceLabel: "High" | "Fair" | "Med" | "Stable";
}

export interface MarketAlert {
  type: "supply" | "pricing" | "incentive";
  title: string;
  description: string;
  severity: "critical" | "warning" | "info";
}

export interface MarketAnalysisSnapshot {
  updatedAt: string;
  metrics: MarketMetric[];
  neighborhoods: NeighborhoodData[];
  alerts: MarketAlert[];
}

const DEFAULT_BOUNDS = "-180,-90,180,90";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function spreadLabel(value: number): "High" | "Fair" | "Med" | "Stable" {
  const amount = Math.abs(value);

  if (amount >= 400) return "High";
  if (amount >= 200) return "Fair";
  if (amount >= 80) return "Med";
  return "Stable";
}

function computeVolatility(values: number[]) {
  if (!values.length) return 0;

  const mean = average(values);
  if (mean === 0) return 0;

  const variance = average(values.map((value) => (value - mean) ** 2));
  const deviation = Math.sqrt(variance);
  return clamp((deviation / mean) * 10, 0, 10);
}

function buildAlerts(neighborhoods: NeighborhoodData[], properties: ApiPropertyResponse[], concessionRate: number): MarketAlert[] {
  const strongestSpread = neighborhoods[0];
  const weakestSpread = neighborhoods[neighborhoods.length - 1];
  const verifiedCount = properties.filter((property) => property.isVerified).length;

  return [
    {
      type: "supply",
      title: "Supply Surge",
      description: strongestSpread
        ? `${strongestSpread.name} is carrying the largest ${env.APP_NAME} spread at ${money.format(Math.abs(strongestSpread.trueCostDivergence))}.`
        : "No supply concentration signals were detected in the current snapshot.",
      severity: strongestSpread && Math.abs(strongestSpread.trueCostDivergence) >= 300 ? "critical" : "info",
    },
    {
      type: "pricing",
      title: "Pricing Alert",
      description: weakestSpread
        ? `${weakestSpread.name} is the tightest market in the set at ${money.format(Math.abs(weakestSpread.trueCostDivergence))} of divergence.`
        : "Pricing spread data is not yet available.",
      severity: properties.length > 0 && concessionRate < 25 ? "warning" : "info",
    },
    {
      type: "incentive",
      title: "Incentive Shift",
      description: `${concessionRate.toFixed(1)}% of the current snapshot shows rent concessions or a favorable ${env.APP_NAME} gap. ${verifiedCount} listings are verified in this market view.`,
      severity: concessionRate >= 40 ? "critical" : "info",
    },
  ];
}

function formatMetricValue(value: number) {
  return money.format(Math.round(value));
}

export async function fetchMarketAnalysis(bounds: string = DEFAULT_BOUNDS): Promise<MarketAnalysisSnapshot> {
  const properties = await fetchProperties(bounds);

  const grouped = new Map<
    string,
    {
      listings: ApiPropertyResponse[];
      listingPrices: number[];
      spreads: number[];
    }
  >();

  for (const property of properties) {
    const key = property.neighborhood?.trim() || property.city?.trim() || "Unassigned";
    const bucket = grouped.get(key) ?? {
      listings: [],
      listingPrices: [],
      spreads: [],
    };

    bucket.listings.push(property);
    bucket.listingPrices.push(property.advertisedRent);
    bucket.spreads.push(property.advertisedRent - property.trueCost);
    grouped.set(key, bucket);
  }

  const neighborhoods = Array.from(grouped.entries())
    .map(([name, bucket]) => {
      const avgListing = average(bucket.listingPrices);
      const avgSpread = average(bucket.spreads);
      const volatilityIndex = computeVolatility(bucket.spreads);

      return {
        name,
        avgListing: Math.round(avgListing),
        volatilityIndex: Number(volatilityIndex.toFixed(1)),
        trueCostDivergence: Math.round(avgSpread),
        divergenceLabel: spreadLabel(avgSpread),
      } satisfies NeighborhoodData;
    })
    .sort((left, right) => Math.abs(right.trueCostDivergence) - Math.abs(left.trueCostDivergence))
    .slice(0, 4);

  const averageMarketRent = average(properties.map((property) => property.advertisedRent));
  const averageTrueCost = average(properties.map((property) => property.trueCost));
  const concessionRate = properties.length
    ? (properties.filter((property) => property.advertisedRent > property.trueCost).length / properties.length) * 100
    : 0;
  const verifiedCoverage = properties.length
    ? (properties.filter((property) => property.isVerified).length / properties.length) * 100
    : 0;

  const marketPremium = averageTrueCost > 0 ? ((averageMarketRent - averageTrueCost) / averageTrueCost) * 100 : 0;
  const demandVelocity = clamp(10 - Math.abs(marketPremium) * 1.2 + verifiedCoverage / 15, 1, 10);

  const metrics: MarketMetric[] = [
    {
      label: "Avg. Market Rent",
      value: formatMetricValue(averageMarketRent),
      change: `${marketPremium >= 0 ? "+" : ""}${marketPremium.toFixed(1)}%`,
      changeType: marketPremium >= 0 ? "positive" : "negative",
      description: "Average advertised rent in the current market snapshot",
    },
    {
      label: `Avg. ${env.APP_NAME}`,
      value: formatMetricValue(averageTrueCost),
      change: `${marketPremium <= 0 ? "+" : "-"}${Math.abs(marketPremium).toFixed(1)}%`,
      changeType: marketPremium <= 0 ? "positive" : "negative",
      description: "Average net effective rent after mandatory fees",
    },
    {
      label: "Demand Velocity",
      value: demandVelocity.toFixed(1),
      change: demandVelocity >= 7 ? "Strong" : demandVelocity >= 4.5 ? "Balanced" : "Soft",
      changeType: demandVelocity >= 7 ? "positive" : demandVelocity >= 4.5 ? "neutral" : "negative",
      description: "Derived from spread compression and verified coverage",
    },
    {
      label: "Concession Rate %",
      value: `${concessionRate.toFixed(1)}%`,
      change: `${verifiedCoverage.toFixed(1)}% verified`,
      changeType: verifiedCoverage >= 60 ? "positive" : verifiedCoverage >= 30 ? "neutral" : "negative",
      description: `Listings where the advertised rent exceeds ${env.APP_NAME}`,
    },
  ];

  const alerts = buildAlerts(neighborhoods, properties, concessionRate);

  return {
    updatedAt: new Date().toISOString(),
    metrics,
    neighborhoods,
    alerts,
  };
}