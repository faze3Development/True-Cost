"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type MapStyleType = "dark-matter" | "positron" | "voyager" | "satellite";

interface MapStyleContextType {
  mapStyle: MapStyleType;
  setMapStyle: (style: MapStyleType) => void;
}

const MapStyleContext = createContext<MapStyleContextType | undefined>(undefined);

export function MapStyleProvider({ children }: { children: React.ReactNode }) {
  const [mapStyle, setMapStyleState] = useState<MapStyleType>("dark-matter");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read from localStorage on mount
    const savedStyle = localStorage.getItem("truecost-map-style");
    if (savedStyle) {
      setMapStyleState(savedStyle as MapStyleType);
    }
    setMounted(true);
  }, []);

  const setMapStyle = (style: MapStyleType) => {
    setMapStyleState(style);
    localStorage.setItem("truecost-map-style", style);
  };

  // Prevent hydration mismatch by rendering default dark-matter or nothing until mounted,
  // but for a provider it's usually safe to just pass the default until effect runs
  return (
    <MapStyleContext.Provider value={{ mapStyle, setMapStyle }}>
      {children}
    </MapStyleContext.Provider>
  );
}

export function useMapStyle() {
  const context = useContext(MapStyleContext);
  if (!context) {
    throw new Error("useMapStyle must be used within a MapStyleProvider");
  }
  return context;
}
