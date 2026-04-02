import { apiClient } from "./client";
import type { ApiUnitHistoryRecord, UnitHistoryPoint } from "@/types/unitHistory";
import type { ApiUnit, ApiUnitResponse } from "@/types/unit";

export interface ApiPropertyResponse {
  id: number | string;
  title: string;
  neighborhood: string;
  city: string;
  latitude: number;
  longitude: number;
  advertisedRent: number;
  trueCost: number;
  imageUrl?: string;
  isVerified?: boolean;
  badgeLabel?: string;
  insight?: "positive" | "neutral" | "negative";
}

export const fetchProperties = async (bounds: string) => {
  const response = await apiClient.get<ApiPropertyResponse[]>(`/properties?bounds=${bounds}`);
  return response.data;
};

export const fetchUnitHistory = async (unitId: string, days = 90): Promise<UnitHistoryPoint[]> => {
  const response = await apiClient.get<ApiUnitHistoryRecord[]>(`/units/${unitId}/history?days=${days}`);

  return response.data.map((record) => {
    const label = new Date(record.date_scraped).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    const concession = record.concession_text?.trim();

    return {
      date: label,
      advertisedRent: Math.round(record.advertised_rent),
      trueCost: Math.round(record.true_cost ?? record.effective_rent),
      concession: concession ? concession : undefined,
    };
  });
};

export const fetchPropertyUnits = async (propertyId: string | number): Promise<ApiUnit[]> => {
  const response = await apiClient.get<ApiUnitResponse[]>(`/properties/${propertyId}/units`);

  return response.data.map((unit) => ({
    id: unit.id,
    propertyId: unit.property_id,
    unitNumber: unit.unit_number,
    floorplanName: unit.floorplan_name,
    bedrooms: unit.bedrooms,
    bathrooms: unit.bathrooms,
    squareFeet: unit.square_feet,
  }));
};
