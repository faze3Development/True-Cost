export interface ApiUnitHistoryRecord {
  date_scraped: string;
  advertised_rent: number;
  concession_text?: string | null;
  effective_rent: number;
  true_cost: number;
}

export interface UnitHistoryPoint {
  date: string;
  advertisedRent: number;
  trueCost: number;
  concession?: string;
}
