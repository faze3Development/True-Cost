import AppLayout from "@/components/AppLayout";
import MacroTrendsGrid from "@/components/reports/MacroTrendsGrid";
import SavedReportCard from "@/components/reports/SavedReportCard";
import DataExportBanner from "@/components/reports/DataExportBanner";
import SystemStatusBar from "@/components/reports/SystemStatusBar";
import type { SavedReportCardProps } from "@/components/reports/SavedReportCard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portfolio Analytics & Market Reports | The Editorial Ledger",
  description:
    "Institutional-grade rental data and historical volatility analysis for verified properties.",
};

const SAVED_REPORTS: SavedReportCardProps[] = [
  {
    title: "The Elm",
    imageSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDDZnJd-ZMazDTPZFBPWgb5HBmOTDmSqRWIl0cZrCKZOIhfJQFgLRqSU1vLaPgmTZWhkIxJz7FvsgauLHDsCXho6Q_-_e2pj_OW_aYGGMSRI7T0j9XYwygRwLjG4Gyu0yGAkvbA6uuzQhc5qXsz05cjkT2n3xdDK-iCIFjlxlTrUBdUS31E30PYSi2xIQjFdfNB4roR-SvYYKUM3mNigRYJkkqz2iZfJILuewCM_4pKnoH3o9U1aJLs7XwNPxKVL9usa3IUOOVVK-tZ",
    imageAlt: "Modern luxury apartment building with glass facade and architectural lighting at twilight",
    concessionVelocity: "High",
    priceVolatility: "4.2%",
  },
  {
    title: "Midtown Market",
    imageSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB20Em14arAiK4dxnRzyANVjBgjSNGndoipM1hDZru1Q_WLTqXXkrj7twz6LFGyYQp-_PjzxfnSaYyRqNrnXMVAB0svIqkjM53eM7_G7YHyypYgVOs0CiMbT2drCmkAI75B8SJPtmuTVv8QXcV9Ta27CN14uXBLs5i1hDzozcQ7kaz1dMT9Lmzrxd3152hAJXHBeR7EKwPS99GMXubF2ibEvgmV9_wcmLnfbdFrlMQ3N6Bwutelj1MUHuq1-3ahxaoC5miO9Y5qDUO3",
    imageAlt: "Sleek urban high-rise development in a dense metropolitan area with morning sun reflection",
    concessionVelocity: "Medium",
    priceVolatility: "1.8%",
  },
  {
    title: "Skyline Point",
    imageSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBjg1qIzMUYa5u4g8oKj_WPFT1SYGPPjcbFjQTTmbWy4EgiFRgfpxBVf6Ou455WTdnRrRMv-n8qv9RqZMTiwEC7YBmRClWb1b5SMl0mE9OLNzWYo4ipdauIscATU4knZJoVX-JiDa55VGv4XyiaWC3DValBc19VyM0jkaSTJ1P0C2yHtBOe-ESb6gKLiqNexBT406t1tUOwiHwSVa8rwgkUZEzENZ0fVHoQVRGk-ZVG6gdHIictxm_NF7pZ0e54WvCH7wsIV8oipQUU",
    imageAlt: "Expansive view of luxury residential suites with floor to ceiling windows overlooking a river city skyline",
    concessionVelocity: "Extreme",
    priceVolatility: "8.4%",
  },
  {
    title: "Heritage Lofts",
    imageSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCGfzD4TrXRaOfU7F2x4oXDZIx3AGcAy11lfrOl2LJI7C3nr_M2RcRE6P-Nzpf1qRM7qsiIiyb1MXiWG9AxSjWRrr7eg7SyDLXJmOQ_GRaeFL4qela6Bc6dv4HU7KvDo3sM6N3s1up4HBNXKT1SYK5hYjk0YH7crvxApGQP85eugfBJzxhqIT1Mp66zshourZqg4AQHQETXFq4dwH_u6-h7JIiNhFPEXhh4YpqBSyQKIEnADyhOITRY7HqkIWcZHaZRms8_o9zQ7vXl",
    imageAlt: "Converted historical warehouse into residential lofts featuring red brick and large industrial windows",
    concessionVelocity: "Low",
    priceVolatility: "0.5%",
  },
];

export default function ReportsPage() {
  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[1920px] px-8 py-10 lg:px-12">
        {/* Hero */}
        <header className="mb-16 mt-4">
          <h2 className="mb-3 text-5xl font-black tracking-tight text-[#0A192F]">
            Portfolio Analytics &amp; Market Reports
          </h2>
          <p className="max-w-2xl text-lg font-medium text-on-surface-variant">
            Institutional-grade rental data and historical volatility analysis.
          </p>
        </header>

        {/* Macro Trends */}
        <MacroTrendsGrid />

        {/* Saved Property Reports */}
        <section className="mb-20" aria-labelledby="saved-reports-heading">
          <h3
            id="saved-reports-heading"
            className="mb-8 text-2xl font-bold tracking-tight text-on-surface"
          >
            Saved Property Reports
          </h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {SAVED_REPORTS.map((report) => (
              <SavedReportCard key={report.title} {...report} />
            ))}
          </div>
        </section>

        {/* Data Exports CTA */}
        <DataExportBanner />

        {/* System Footer */}
        <SystemStatusBar />
      </div>
    </AppLayout>
  );
}
