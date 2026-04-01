"use client";

import Image from "next/image";

export type ConcessionVelocity = "Low" | "Medium" | "High" | "Extreme";

export interface SavedReportCardProps {
  title: string;
  imageSrc: string;
  imageAlt: string;
  concessionVelocity: ConcessionVelocity;
  priceVolatility: string;
}

const VELOCITY_STYLES: Record<ConcessionVelocity, string> = {
  Low: "text-on-surface-variant",
  Medium: "text-on-tertiary-container",
  High: "text-secondary",
  Extreme: "text-secondary font-black",
};

export default function SavedReportCard({
  title,
  imageSrc,
  imageAlt,
  concessionVelocity,
  priceVolatility,
}: SavedReportCardProps) {
  return (
    <article className="bg-surface-container-lowest hover:bg-surface-container-high transition-colors duration-200 p-6 rounded-xl group relative overflow-hidden">
      {/* Hover accent bar — no border, uses color shift only */}
      <div
        className="absolute top-0 left-0 w-full h-[3px] bg-secondary opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        aria-hidden="true"
      />

      <div className="aspect-video mb-5 overflow-hidden rounded-xl">
        <Image
          src={imageSrc}
          alt={imageAlt}
          width={400}
          height={225}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          unoptimized
        />
      </div>

      <h5 className="text-base font-bold mb-4 tracking-tight text-on-surface">{title}</h5>

      <dl className="space-y-3">
        <div className="flex items-center justify-between">
          <dt className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
            Concession Velocity
          </dt>
          <dd className={`text-sm font-black tabular-nums ${VELOCITY_STYLES[concessionVelocity]}`}>
            {concessionVelocity}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
            Price Volatility
          </dt>
          <dd className="text-sm font-black tabular-nums text-on-surface">{priceVolatility}</dd>
        </div>
      </dl>
    </article>
  );
}
