export interface ApiUnitResponse {
  id: string;
  property_id: string;
  unit_number: string;
  floorplan_name: string;
  bedrooms: number;
  bathrooms: number;
  square_feet: number;
}

export interface ApiUnit {
  id: string;
  propertyId: string;
  unitNumber: string;
  floorplanName: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
}
