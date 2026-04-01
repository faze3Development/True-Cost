"use client";

import { useUnitHistory } from "@/hooks/useUnitHistory";
import type { UnitHistoryPoint } from "@/types/unitHistory";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";

interface ChartProps {
  unitId: string;
  daysRange?: number;
}

const EditorialTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as UnitHistoryPoint;

    return (
      <div className="w-56 rounded border border-white/10 bg-[#293138] p-4 text-xs text-[#e9f2fb] shadow-xl backdrop-blur-sm">
        <p className="mb-2 font-bold uppercase tracking-widest opacity-70">{label}</p>

        <div className="mb-1 flex justify-between">
          <span>Advertised:</span>
          <span className="tabular-nums font-bold">${data.advertisedRent.toLocaleString()}</span>
        </div>

        <div className="mt-2 flex justify-between border-t border-white/10 pt-2 text-[#10B981]">
          <span className="font-bold">True Cost:</span>
          <span className="tabular-nums font-bold">${data.trueCost.toLocaleString()}</span>
        </div>

        {data.concession ? (
          <p className="mt-3 text-[10px] italic leading-tight text-[#a5c8ff]">Trigger: {data.concession}</p>
        ) : null}
      </div>
    );
  }

  return null;
};

export default function PriceHistoryChart({ unitId, daysRange = 90 }: ChartProps) {
  const { data: historyData, isLoading } = useUnitHistory(unitId, daysRange);

  if (isLoading) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center text-xs font-bold uppercase tracking-widest text-slate-400 animate-pulse">
        Loading Market Data...
      </div>
    );
  }

  if (!historyData || historyData.length === 0) {
    return <div className="flex h-[400px] items-center justify-center text-slate-400">No historical data available.</div>;
  }

  return (
    <div className="relative h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={historyData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />

          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
            minTickGap={30}
          />

          <YAxis
            domain={["dataMin - 100", "dataMax + 100"]}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: number) => `$${value}`}
            tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
          />

          <Tooltip content={<EditorialTooltip />} cursor={{ stroke: "#10B981", strokeWidth: 1, strokeDasharray: "4 4" }} />

          <Line
            type="stepAfter"
            dataKey="advertisedRent"
            stroke="#6385b8"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: "#6385b8", stroke: "white", strokeWidth: 2 }}
          />

          <Line
            type="stepAfter"
            dataKey="trueCost"
            stroke="#10B981"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6, fill: "#10B981", stroke: "white", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
