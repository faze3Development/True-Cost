import type { Metadata } from "next";
import SavedAssetsClient from "./SavedAssetsClient";

export const metadata: Metadata = {
  title: "Saved Assets & Watchlist | The Editorial Ledger",
  description: "Tracked properties and regional market volatility for institutional portfolios.",
};

export default function SavedAssetsPage() {
  return <SavedAssetsClient />;
}
