import type { PropertyCardProps } from "@/components/PropertyCard";

export interface Property extends PropertyCardProps {
  id: string;
  latitude: number;
  longitude: number;
  propertyType?: string;
  isVerified?: boolean;
}
