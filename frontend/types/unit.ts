export interface ApiUnitResponse {
  id: number | string;
  property_id: number;
  unit_number: string;
  floorplan_name: string;
  bedrooms: number;
  bathrooms: number;
  square_feet: number;
}

export interface ApiUnit {
  id: number | string;
  propertyId: number;
  unitNumber: string;
  floorplanName: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
}
