import { useQuery } from "@tanstack/react-query";
import { fetchProperties } from "@/api/properties";
import type { Property } from "@/types/property";

export function useProperties(bounds: string, options?: { enabled?: boolean }) {
  return useQuery<Property[]>({
    queryKey: ["properties", bounds],
    queryFn: async () => {
      const response = await fetchProperties(bounds);
      // Normalize API payload into the Property shape used by both map and listings.
      return response.map((item) => ({
        ...item,
        badgeLabel: item.badgeLabel,
        insight: item.insight,
        imageUrl: item.imageUrl,
      })) as Property[];
    },
    staleTime: 1000 * 60 * 5,
    enabled: options?.enabled ?? Boolean(bounds),
  });
}
