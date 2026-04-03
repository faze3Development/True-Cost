import { useQuery } from "@tanstack/react-query";
import { fetchPropertyUnits } from "@/api/properties";
import type { ApiUnit } from "@/types/unit";

export function usePropertyUnits(propertyId: string) {
  return useQuery<ApiUnit[]>({
    queryKey: ["propertyUnits", propertyId],
    queryFn: () => fetchPropertyUnits(propertyId),
    staleTime: 1000 * 60 * 60,
    enabled: !!propertyId,
  });
}
