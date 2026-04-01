"use client";

import { useMemo, useState } from "react";
import AppLayout from "@/components/AppLayout";
import ListingsFeed from "@/components/ListingsFeed";
import MarketMap from "@/components/MarketMap";
import { useProperties } from "@/hooks/useProperties";
import type { Property } from "@/types/property";

const navLinks = [
  { label: "Market Map", href: "/", active: true },
  { label: "Property Insights", href: "#" },
  { label: "Cost Calculator", href: "#" },
  { label: "Settings", href: "/settings" },
];

const filters = [
  { label: "Beds", value: "2+" },
  { label: "Baths", value: "1+" },
  { label: "Max TrueCost", value: "$4,000" },
];

const sampleProperties: Property[] = [
  {
    id: "sterling-modern",
    title: "The Sterling Modern",
    neighborhood: "Midtown",
    city: "New York",
    advertisedRent: 3000,
    trueCost: 2400,
    latitude: 40.7484,
    longitude: -73.9857,
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBD6p6n9NeWSXLUm2-7EogndTtMgtzLlWiA06U4F4ke891NJghJ7rtZoB4q6xgyZqoF_I3Bg36iT3ZGY9fMK9_vZRqZmVebcx1TqivnFvJh5ocTKb5DcTJ1asgiMbI1iS2BUkh63I0lobtNCp49LJPx614obQ1863goPNz-En1CirRf0gusZMjU02hnyO_B8jl7pxlwiO4M4uhSqJokclMSSSuCbXW80gml6oxpitRWjODje-g4cWTP91D0nvA2lcqttzlhBqrKAeQE",
    badgeLabel: "Low Impact",
    insight: "positive",
    isVerified: true,
  },
  {
    id: "beacon-hill",
    title: "Beacon Hill Residences",
    neighborhood: "West Side",
    city: "New York",
    advertisedRent: 4200,
    trueCost: 3950,
    latitude: 40.7411,
    longitude: -74.0049,
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBxmdJtD6O8QNazfsCB1C0i6Xq9vZmn2zufrs8JRD6EIEBu6BDQyCLolxcoTv7DE5f1tz_SabOutGq9ePHv2lylr-IY4xfLg8Yc47_IC-vprS2yih3MXtVKrjj4O5c6zd7V2z7azHV5khQ_Nbz2Id2biDO7E6cHDmvIDwvJ0SYGWtfznNCbU_JbLV_9DEmPxIKfImBL5ZvWOpBKduvH7M3HHiEeOTaCUpHtVRBdNn7n97pmlwvShdF56QVyioNDGOYamGLFHbTKPxr_",
    insight: "neutral",
  },
  {
    id: "emerald-loft",
    title: "Emerald Loft Park",
    neighborhood: "Lower East Side",
    city: "New York",
    advertisedRent: 2100,
    trueCost: 1850,
    latitude: 40.715,
    longitude: -73.984,
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB230vsf-gTtWfom-zxWikOBCGbKxxlv7qTei9HRwwqsnhuz8KofuUHQEdSyebUEuSj7y8UFQHQlIXoiKpvRFEst1TXCc2UvLENgVzQQUKuL0ojUVTrIrT7W9Mc7umDHNUBYWeAtKpzGvqIqMawCDzNc1d-5afHZJ2W2UqYeHbyQ0vShcViaeRnY1zeHyHhk0Flt7Dc_dyM3_pgaG1Z_ykP-31imXQkqhGoRNnZvtDbJxhHJEsOW9Bw042z_tmuvbR1Nd5TjvlsVVhC",
    badgeLabel: "Utility Inclusive",
    insight: "positive",
    isVerified: true,
  },
];


export default function Page() {
  const [mapBounds, setMapBounds] = useState("-74.1,40.7,-73.9,40.8");
  const { data, isFetching, isError } = useProperties(mapBounds, { enabled: Boolean(mapBounds) });

  const properties = useMemo(() => data ?? sampleProperties, [data]);

  return (
    <AppLayout navLinks={navLinks} noScroll={true}>
      <div className="flex flex-1 overflow-hidden relative">
        <ListingsFeed properties={properties} resultsCount={properties.length} filters={filters} isLoading={isFetching} isError={isError} />
        <MarketMap properties={properties} regionDelta={-12.4} onBoundsChange={setMapBounds} />
      </div>
    </AppLayout>
  );
}
