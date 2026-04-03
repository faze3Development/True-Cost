import React from "react";

interface TrendCardData {
  city: string;
  price: string;
  change: string;
  trend: "up" | "flat" | "down";
  sparklinePath: string;
  sparklineFillPath: string;
  strokeColor: string;
  fillColor: string;
  changeColor: string;
  icon: string;
}

const TREND_CARDS: TrendCardData[] = [
  {
    city: "New York City",
    price: "$4,850",
    change: "+2.4%",
    trend: "up",
    icon: "trending_up",
    strokeColor: "rgb(var(--secondary))",
    fillColor: "rgb(var(--secondary) / 0.08)",
    changeColor: "text-secondary",
    sparklinePath: "M0 30 L10 32 L20 28 L30 35 L40 22 L50 25 L60 15 L70 18 L80 10 L90 12 L100 5",
    sparklineFillPath:
      "M0 40 L0 30 L10 32 L20 28 L30 35 L40 22 L50 25 L60 15 L70 18 L80 10 L90 12 L100 5 L100 40 Z",
  },
  {
    city: "Atlanta",
    price: "$2,120",
    change: "Stable",
    trend: "flat",
    icon: "horizontal_rule",
    strokeColor: "rgb(var(--on-surface-variant))",
    fillColor: "rgb(var(--on-surface-variant) / 0.08)",
    changeColor: "text-on-surface-variant",
    sparklinePath: "M0 25 L20 26 L40 24 L60 25 L80 24 L100 25",
    sparklineFillPath: "M0 40 L0 25 L20 26 L40 24 L60 25 L80 24 L100 25 L100 40 Z",
  },
  {
    city: "Jersey City",
    price: "$3,400",
    change: "-1.2%",
    trend: "down",
    icon: "trending_down",
    strokeColor: "rgb(var(--error))",
    fillColor: "rgb(var(--error) / 0.08)",
    changeColor: "text-error",
    sparklinePath: "M0 5 L20 12 L40 8 L60 18 L80 15 L100 22",
    sparklineFillPath: "M0 40 L0 5 L20 12 L40 8 L60 18 L80 15 L100 22 L100 40 Z",
  },
];

function SparklinePlaceholder({
  strokeColor,
  fillColor,
  sparklinePath,
  sparklineFillPath,
}: Pick<TrendCardData, "strokeColor" | "fillColor" | "sparklinePath" | "sparklineFillPath">) {
  return (
    <div className="h-28 mt-auto relative overflow-hidden bg-surface-bright rounded-xl">
      <svg
        className="w-full h-full"
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d={sparklineFillPath} fill={fillColor} stroke="none" />
        <path
          d={sparklinePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function TrendCard({
  city,
  price,
  change,
  icon,
  strokeColor,
  fillColor,
  changeColor,
  sparklinePath,
  sparklineFillPath,
}: TrendCardData) {
  return (
    <article className="bg-surface-container-low p-8 rounded-xl flex flex-col gap-6 hover:bg-surface-container transition-colors duration-200">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            {city}
          </h4>
          <p className="text-3xl font-black tabular-nums mt-1 text-on-surface">
            {price}{" "}
            <span className={`text-sm font-medium tracking-normal ${changeColor}`}>{change}</span>
          </p>
        </div>
        <span
          className={`material-symbols-outlined text-2xl ${changeColor}`}
          aria-hidden="true"
        >
          {icon}
        </span>
      </div>
      <SparklinePlaceholder
        strokeColor={strokeColor}
        fillColor={fillColor}
        sparklinePath={sparklinePath}
        sparklineFillPath={sparklineFillPath}
      />
    </article>
  );
}

export default function MacroTrendsGrid() {
  return (
    <section className="mb-20" aria-labelledby="macro-trends-heading">
      <div className="flex items-baseline justify-between mb-8">
        <h3
          id="macro-trends-heading"
          className="text-2xl font-bold tracking-tight text-on-surface"
        >
          Macro Market Trends
        </h3>
        <span className="text-[10px] font-black uppercase tracking-widest text-secondary bg-secondary-container px-3 py-1 rounded-full">
          Live Feed
        </span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {TREND_CARDS.map((card) => (
          <TrendCard key={card.city} {...card} />
        ))}
      </div>
    </section>
  );
}
