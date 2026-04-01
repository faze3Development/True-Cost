import { useQuery } from "@tanstack/react-query";
import { fetchUnitHistory } from "@/lib/api";
import type { UnitHistoryPoint } from "@/types/unitHistory";

export function useUnitHistory(unitId: string, days: number = 90) {
  return useQuery<UnitHistoryPoint[]>({
    queryKey: ["unitHistory", unitId, days],
    queryFn: () => fetchUnitHistory(unitId, days),
    staleTime: 1000 * 60 * 60,
    enabled: Boolean(unitId),
  });
}
