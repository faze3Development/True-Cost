import { useQuery } from "@tanstack/react-query";
import { fetchProperty } from "@/api/properties";
import type { ApiPropertyDetailResponse } from "@/api/properties";

export function useProperty(id: string) {
  return useQuery<ApiPropertyDetailResponse>({
    queryKey: ["property", id],
    queryFn: async () => {
      const data = await fetchProperty(id);
      return data;
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!id,
  });
}
