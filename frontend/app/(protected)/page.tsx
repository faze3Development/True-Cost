"use client";

import { useMemo, useState } from "react";
import AppLayout from "@/components/AppLayout";
import ListingsFeed from "@/components/ListingsFeed";
import MarketMap from "@/components/MarketMap";
import { useProperties } from "@/hooks/useProperties";
import { useDebounce } from "@/hooks/useDebounce";
import type { Property } from "@/types/property";
import { env } from "@/lib/env";

const filters = [
  { label: "Beds", value: "2+" },
  { label: "Baths", value: "1+" },
  { label: `Max ${env.APP_NAME}`, value: "$4,000" },
];

export default function Page() {
  const [mapBounds, setMapBounds] = useState("-74.1,40.7,-73.9,40.8");
  const debouncedMapBounds = useDebounce(mapBounds, 500);
  const { data, isFetching, isError } = useProperties(debouncedMapBounds, { enabled: Boolean(debouncedMapBounds) });

  const properties = useMemo(() => data ?? [], [data]);

  return (
    <AppLayout noScroll={true}>
      <div className="flex flex-1 overflow-hidden relative">
        <ListingsFeed properties={properties} resultsCount={properties.length} filters={filters} isLoading={isFetching} isError={isError} />
        <MarketMap properties={properties} regionDelta={-12.4} onBoundsChange={setMapBounds} />
      </div>
    </AppLayout>
  );
}
