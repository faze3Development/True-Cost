import Link from "next/link";

interface DistrictMapButtonProps {
  district: string;
  href?: string;
  className?: string;
}

export default function DistrictMapButton({
  district,
  href = "/market-analysis",
  className = "",
}: DistrictMapButtonProps) {
  const resolvedDistrict = district?.trim() || "District View";

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-lg bg-white/90 px-3 py-1.5 backdrop-blur transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${className}`.trim()}
      aria-label={`Open map for ${resolvedDistrict}`}
      title={`Open map for ${resolvedDistrict}`}
    >
      <span className="material-symbols-outlined text-primary text-sm" aria-hidden="true">
        location_on
      </span>
      <span className="text-[10px] font-black uppercase tracking-tight text-on-surface">
        {resolvedDistrict}
      </span>
    </Link>
  );
}
