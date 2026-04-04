import { apiClient } from "./client";
import type { ApiUnitHistoryRecord, UnitHistoryPoint } from "@/types/unitHistory";
import type { ApiUnit, ApiUnitResponse } from "@/types/unit";
import { isValidPropertyId, isValidUnitId } from "@/security";

export interface ApiFeeStructure {
  id: string;
  property_id: string;
  trash_fee: number;
  amenity_fee: number;
  package_fee: number;
  parking_fee: number;

  // These fields are consumed by the UI but may not be present yet in the backend model.
  water_sewer_fee?: number;
  move_in_fee?: number;
  move_out_fee?: number;
  pet_rent?: number;
  has_deposit?: boolean;
  has_pet_deposit?: boolean;
}

export interface ApiPropertyDetailResponse {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  latitude: number;
  longitude: number;
  image_url?: string;
  fee_structure?: ApiFeeStructure;
}

export interface ApiPropertyResponse {
  id: string;
  title: string;
  neighborhood: string;
  city: string;
  latitude: number;
  longitude: number;
  advertisedRent: number;
  trueCost: number;
  totalMandatoryFees?: number;
  feeDisclosure?: string;
  dealScore?: number;
  estimateType?: string;
  legalDisclaimers?: string[];
  imageUrl?: string;
  isVerified?: boolean;
  badgeLabel?: string;
  insight?: "positive" | "neutral" | "negative";
}

export const fetchProperties = async (bounds: string) => {
  const response = await apiClient.get<ApiPropertyResponse[]>(`/properties?bounds=${bounds}`);
  return response.data;
};

export const fetchProperty = async (id: string) => {
  const response = await apiClient.get<ApiPropertyDetailResponse>(`/properties/${id}`);
  return response.data;
};

export const fetchUnitHistory = async (unitId: string, days = 90): Promise<UnitHistoryPoint[]> => {
  if (!isValidUnitId(unitId)) {
    console.warn("Invalid unitId passed to fetchUnitHistory:", unitId);
    return [];
  }

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

export const fetchPropertyUnits = async (propertyId: string): Promise<ApiUnit[]> => {
  if (!isValidPropertyId(propertyId)) {
    console.warn("Invalid propertyId passed to fetchPropertyUnits:", propertyId);
    return [];
  }

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
