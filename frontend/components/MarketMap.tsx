"use client";

import { useCallback, useMemo, useState } from "react";
import Map, { Marker, NavigationControl, ViewStateChangeEvent } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "next-themes";
import { useMapStyle } from "@/components/MapStyleProvider";
import type { Property } from "@/types/property";
import { useRouter } from "next/navigation";
import { buildPropertyUrl } from "@/routes";

export interface MarketMapProps {
  properties: Property[];
  regionDelta?: number; // negative means cheaper than advertised
  onBoundsChange?: (bounds: string) => void;
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function MarketMap({ properties, regionDelta = -12.4, onBoundsChange }: MarketMapProps) {
  const [viewState, setViewState] = useState({
    longitude: -74.0445,
    latitude: 40.7178,
    zoom: 12,
  });

  const handleMove = useCallback((evt: ViewStateChangeEvent) => {
    setViewState(evt.viewState);
  }, []);

  const handleMoveEnd = useCallback(
    (evt: ViewStateChangeEvent) => {
      const bounds = evt.target.getBounds();
      if (!bounds) return;
      const boundsString = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
      onBoundsChange?.(boundsString);
    },
    [onBoundsChange]
  );

  const { resolvedTheme } = useTheme();
  const { mapStyle: userMapStyle } = useMapStyle();
  const router = useRouter();

  const mapStyleUrl = useMemo(() => {
    switch (userMapStyle) {
      case "dark-matter":
        return "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
      case "positron":
        return "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
      case "voyager":
        return "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";
      case "satellite":
        // For standard OSM satellite or another public endpoint. 
        // We will default to voyager as fallback if satellite is unavailable, but Carto has no satellite out-of-box without API keys.
        // Let's use Esri World Imagery fallback for demonstration purposes that doesn't strictly need a key!
        return {
          version: 8,
          sources: {
            "esri-satellite": {
              type: "raster",
              tiles: [
                "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              ],
              tileSize: 256
            }
          },
          layers: [
            {
              id: "satellite",
              type: "raster",
              source: "esri-satellite",
              minzoom: 0,
              maxzoom: 22
            }
          ]
        } as any;
      default:
        // Use system theme as ultimate fallback
        return resolvedTheme === "dark"
          ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
          : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
    }
  }, [userMapStyle, resolvedTheme]);

  return (
    <section className="relative hidden flex-1 overflow-hidden bg-surface-container-high md:flex">
      <div className="absolute inset-0 bg-gradient-to-br from-surface-container via-surface-container-high to-surface-bright" />
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(10,25,47,0.06), transparent 25%), radial-gradient(circle at 80% 40%, rgba(16,185,129,0.05), transparent 28%)",
        }}
      />

      <div className="relative h-full w-full">
        <Map
          {...viewState}
          onMove={handleMove}
          onMoveEnd={handleMoveEnd}
          mapStyle={mapStyleUrl as any}
          reuseMaps
          scrollZoom
        >
          <NavigationControl position="top-left" showZoom showCompass={false} />

          {properties.map((property) => (
            <Marker
              key={property.id}
              longitude={property.longitude}
              latitude={property.latitude}
              anchor="bottom"
              onClick={e => {
                e.originalEvent.stopPropagation();
                router.push(buildPropertyUrl(property.id));
              }}
            >
              <Pin value={property.trueCost} isVerified={property.isVerified} />
            </Marker>
          ))}
        </Map>

        <div className="pointer-events-none absolute bottom-4 right-4 rounded-lg bg-surface/95 px-4 py-3 text-on-surface shadow-ambient backdrop-blur-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Region Index</p>
          <p className="tabular-nums text-sm font-semibold">{regionDelta}% vs Advertised</p>
        </div>
      </div>
    </section>
  );
}

function Pin({ value, isVerified }: { value: number; isVerified?: boolean }) {
  return (
    <div className="group flex cursor-pointer flex-col items-center">
      <div className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-sm font-bold text-on-secondary tabular-nums shadow-ambient transition-transform duration-150 group-hover:scale-110">
        {currency.format(value)}
        {isVerified ? <span className="material-symbols-outlined text-[12px] font-bold">verified</span> : null}
      </div>
      <div className="h-0 w-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-secondary" />
    </div>
  );
}
