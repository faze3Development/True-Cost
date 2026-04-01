"use client";

export default function DataExportBanner() {
  return (
    <section aria-labelledby="data-exports-heading" className="mb-12">
      <div className="relative overflow-hidden rounded-2xl bg-[#0A192F] p-12">
        {/* Subtle dot-grid decoration */}
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, #ffffff 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
          aria-hidden="true"
        />

        {/* Glow accent top-right */}
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#10B981]/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col items-center justify-between gap-10 md:flex-row">
          {/* Copy */}
          <div className="max-w-xl text-center md:text-left">
            <h3
              id="data-exports-heading"
              className="mb-3 text-3xl font-black tracking-tight text-white"
            >
              Data Exports
            </h3>
            <p className="text-base font-medium leading-relaxed text-white/70">
              Extract granular ledger data for deeper offline analysis or internal
              stakeholder presentations.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex w-full flex-col gap-4 sm:flex-row md:w-auto">
            <button
              type="button"
              className="flex items-center justify-center gap-2.5 rounded-xl bg-white px-7 py-4 text-sm font-bold tracking-wide text-[#0A192F] shadow-xl transition-all duration-200 hover:bg-white/90 active:scale-[0.97]"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                description
              </span>
              Export Full Market Ledger (CSV)
            </button>

            <button
              type="button"
              className="flex items-center justify-center gap-2.5 rounded-xl bg-[#10B981] px-7 py-4 text-sm font-bold tracking-wide text-white shadow-xl transition-all duration-200 hover:bg-[#0ea572] active:scale-[0.97]"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                picture_as_pdf
              </span>
              Download Volatility Report (PDF)
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
