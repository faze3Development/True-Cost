export interface SystemStatusBarProps {
  latencyMs?: number;
  lastRebalance?: string;
  status?: "Optimized" | "Degraded" | "Offline";
}

const STATUS_COLORS: Record<NonNullable<SystemStatusBarProps["status"]>, string> = {
  Optimized: "text-[#10B981]",
  Degraded: "text-amber-500",
  Offline: "text-error",
};

export default function SystemStatusBar({
  latencyMs = 24,
  lastRebalance = "14:02 UTC",
  status = "Optimized",
}: SystemStatusBarProps) {
  return (
    <footer className="mt-16 flex flex-col items-center justify-between gap-4 pt-8 md:flex-row">
      {/* Left: standards label */}
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant">
        Institutional Transparency Standards v4.2
      </p>

      {/* Right: live metrics */}
      <div className="flex items-center gap-6">
        <span className="tabular-nums text-xs font-bold text-on-surface-variant">
          Latency:{" "}
          <span className="text-on-surface">{latencyMs}ms</span>
        </span>

        <span
          className="h-3 w-px bg-on-surface-variant/20"
          aria-hidden="true"
        />

        <span className="tabular-nums text-xs font-bold text-on-surface-variant">
          Last Rebalance:{" "}
          <span className="text-on-surface">{lastRebalance}</span>
        </span>

        <span
          className="h-3 w-px bg-on-surface-variant/20"
          aria-hidden="true"
        />

        <span
          className={`tabular-nums text-xs font-black ${STATUS_COLORS[status]}`}
          aria-label={`System status: ${status}`}
        >
          ● {status}
        </span>
      </div>
    </footer>
  );
}
