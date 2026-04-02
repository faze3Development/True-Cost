import { useQuery } from "@tanstack/react-query";
import { fetchUnitHistory } from "@/api/properties";
import type { UnitHistoryPoint } from "@/types/unitHistory";

export function useUnitHistory(unitId: string, days: number = 90) {
  return useQuery<UnitHistoryPoint[]>({
    queryKey: ["unitHistory", unitId, days],
    queryFn: () => fetchUnitHistory(unitId, days),
    staleTime: 1000 * 60 * 60,
    enabled: Boolean(unitId),
  });
}
