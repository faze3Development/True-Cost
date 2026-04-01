"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import TopNavigation from "@/components/TopNavigation";
import { useProperties } from "@/hooks/useProperties";

interface CalculatorState {
  baseRent: number;
  leaseTermMonths: number;
  concessionMonths: number;
  upfrontCredit: number;
  fees: {
    trash: boolean;
    amenity: boolean;
    locker: boolean;
  };
}

const navLinks = [
  { label: "Market Map", href: "/" },
  { label: "Property Insights", href: "#" },
  { label: "Cost Calculator", href: "/truecost", active: true },
  { label: "Settings", href: "/settings" },
];

const FEE_AMOUNTS = {
  trash: 50,
  amenity: 100,
  locker: 25,
};

export default function TrueCostPage() {
  const [state, setState] = useState<CalculatorState>({
    baseRent: 2450,
    leaseTermMonths: 12,
    concessionMonths: 1,
    upfrontCredit: 500,
    fees: {
      trash: true,
      amenity: true,
      locker: true,
    },
  });

  const { data: properties } = useProperties("-74.1,40.7,-73.9,40.8", { enabled: true });
  const [marketPosition, setMarketPosition] = useState(4.2);

  // Calculate true monthly cost
  const calculations = useMemo(() => {
    const totalBaseRent = state.baseRent * state.leaseTermMonths;
    const concessionSavings = state.baseRent * state.concessionMonths;
    const netRent = totalBaseRent - concessionSavings - state.upfrontCredit;
    const monthlyRentAfterConcessions = netRent / state.leaseTermMonths;

    const activeFees = Object.values(state.fees).filter(Boolean).length;
    const monthlyFees = (FEE_AMOUNTS.trash ?? 0) * (state.fees.trash ? 1 : 0) +
      (FEE_AMOUNTS.amenity ?? 0) * (state.fees.amenity ? 1 : 0) +
      (FEE_AMOUNTS.locker ?? 0) * (state.fees.locker ? 1 : 0);

    const trueMonthlyCost = monthlyRentAfterConcessions + monthlyFees;
    const formattedCost = trueMonthlyCost.toFixed(2);
    const amortizedSavings = (concessionSavings / state.leaseTermMonths).toFixed(2);
    const effectiveSavings = (concessionSavings + state.upfrontCredit).toFixed(2);
    const annualFeeExposure = (monthlyFees * 12).toFixed(2);

    return {
      baseRent: state.baseRent,
      trueMonthlyCost: parseFloat(formattedCost),
      monthlyFees,
      amortizedSavings: parseFloat(amortizedSavings),
      effectiveSavings: parseFloat(effectiveSavings),
      annualFeeExposure: parseFloat(annualFeeExposure),
      monthlyRentAfterConcessions,
    };
  }, [state]);

  const handleBaseRentChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value.replace(/,/g, "")) || 0;
    setState((prev) => ({ ...prev, baseRent: value }));
  }, []);

  const handleTermChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setState((prev) => ({ ...prev, leaseTermMonths: parseInt(e.target.value, 10) }));
  }, []);

  const handleConcessionChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const concessions = parseInt(e.target.value, 10);
    setState((prev) => ({ ...prev, concessionMonths: concessions }));
  }, []);

  const handleCreditChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value.replace(/,/g, "")) || 0;
    setState((prev) => ({ ...prev, upfrontCredit: value }));
  }, []);

  const handleFeeToggle = useCallback((feeType: keyof typeof state.fees) => {
    setState((prev) => ({
      ...prev,
      fees: {
        ...prev.fees,
        [feeType]: !prev.fees[feeType],
      },
    }));
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <TopNavigation navLinks={navLinks} />
      <main className="pt-24 pb-20 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column - Calculator Inputs */}
        <div className="lg:col-span-7 space-y-12">
          <header className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tighter text-on-surface">True Monthly Cost Calculator</h1>
            <p className="text-on-surface-variant max-w-xl">
              Calculate the effective monthly rental rate by factoring in concessions, amortized fees, and mandatory add-ons.
            </p>
          </header>

          {/* Price Visualization */}
          <div className="surface-container-low p-8 rounded-lg border-l-4 border-secondary overflow-hidden">
            <div className="flex justify-between items-end mb-8">
              <div>
                <span className="font-label text-xs uppercase tracking-widest font-bold text-tertiary block mb-1">
                  Market Position
                </span>
                <h2 className="text-2xl font-bold">Price Index Analysis</h2>
              </div>
              <div className="text-right">
                <span className="text-secondary font-bold text-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">trending_down</span>
                  {marketPosition.toFixed(1)}% Below Average
                </span>
              </div>
            </div>
            <div className="h-48 flex items-end gap-1">
              {[60, 75, 90, 45, 80, 65, 50, 70].map((height, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-t-sm ${i === 3 ? "bg-secondary" : "bg-surface-container-highest"}`}
                  style={{ height: `${height}%` }}
                >
                  {i === 3 && <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] px-2 py-1 rounded mt-2">Current Unit</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Calculator Sections */}
          <div className="space-y-10">
            {/* Section 1: Lease Terms */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <span className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs font-bold">01</span>
                <h3 className="text-lg font-bold">Lease Terms &amp; Landlord Offer</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="block font-label text-xs uppercase tracking-widest font-bold text-on-surface-variant">
                    Advertised Base Rent
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">$</span>
                    <input
                      type="text"
                      value={state.baseRent.toLocaleString()}
                      onChange={handleBaseRentChange}
                      className="w-full bg-surface-container-lowest border-none ring-1 ring-outline focus:ring-2 focus:ring-primary py-4 pl-8 pr-4 text-lg font-bold tabular-nums"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="block font-label text-xs uppercase tracking-widest font-bold text-on-surface-variant">
                    Lease Term (Months)
                  </label>
                  <div className="flex flex-col gap-4">
                    <input
                      type="range"
                      min="12"
                      max="18"
                      value={state.leaseTermMonths}
                      onChange={handleTermChange}
                      className="w-full h-1 bg-outline appearance-none rounded-full accent-primary cursor-pointer"
                    />
                    <div className="flex justify-between text-xs font-bold text-on-surface-variant tabular-nums">
                      <span>12 Months</span>
                      <span>15 Months</span>
                      <span>18 Months</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="block font-label text-xs uppercase tracking-widest font-bold text-on-surface-variant">
                    Rent Concession (Months Free)
                  </label>
                  <select
                    value={state.concessionMonths}
                    onChange={handleConcessionChange}
                    className="w-full bg-surface-container-lowest border-none ring-1 ring-outline focus:ring-2 focus:ring-primary py-4 px-4 text-sm font-medium"
                  >
                    <option value="0">No Concessions</option>
                    <option value="1">1 Month Free</option>
                    <option value="2">2 Months Free</option>
                  </select>
                </div>
                <div className="space-y-4">
                  <label className="block font-label text-xs uppercase tracking-widest font-bold text-on-surface-variant">
                    Upfront Credit ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">$</span>
                    <input
                      type="text"
                      value={state.upfrontCredit.toLocaleString()}
                      onChange={handleCreditChange}
                      className="w-full bg-surface-container-lowest border-none ring-1 ring-outline focus:ring-2 focus:ring-primary py-4 pl-8 pr-4 text-sm font-bold tabular-nums"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: Monthly Fees */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <span className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs font-bold">02</span>
                <h3 className="text-lg font-bold">Monthly Operating Fees</h3>
              </div>
              <div className="bg-surface-container-lowest divide-y divide-surface-container-low rounded-lg ring-1 ring-outline/30 overflow-hidden">
                {/* Trash Fee */}
                <div className="p-5 flex items-center justify-between group hover:bg-surface-container-low transition-colors duration-150">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-white transition-colors">
                      <span className="material-symbols-outlined">delete</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">Mandatory Trash Fee</h4>
                      <p className="text-xs text-on-surface-variant">Valet service and waste management</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-sm font-bold tabular-nums">$50.00</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={state.fees.trash}
                        onChange={() => handleFeeToggle("trash")}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary" />
                    </label>
                  </div>
                </div>

                {/* Amenity Fee */}
                <div className="p-5 flex items-center justify-between group hover:bg-surface-container-low transition-colors duration-150">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-white transition-colors">
                      <span className="material-symbols-outlined">fitness_center</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">Amenity Access</h4>
                      <p className="text-xs text-on-surface-variant">Gym, pool, and community lounge</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-sm font-bold tabular-nums">$100.00</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={state.fees.amenity}
                        onChange={() => handleFeeToggle("amenity")}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary" />
                    </label>
                  </div>
                </div>

                {/* Locker Fee */}
                <div className="p-5 flex items-center justify-between group hover:bg-surface-container-low transition-colors duration-150">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-white transition-colors">
                      <span className="material-symbols-outlined">package</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">Package Locker Fee</h4>
                      <p className="text-xs text-on-surface-variant">Automated receiving and storage</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-sm font-bold tabular-nums">$25.00</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={state.fees.locker}
                        onChange={() => handleFeeToggle("locker")}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary" />
                    </label>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Right Column - Summary */}
        <div className="lg:col-span-5">
          <div className="sticky top-24 space-y-6">
            {/* Main Summary Card */}
            <div className="bg-primary text-on-primary p-8 rounded-lg shadow-ambient relative overflow-hidden">
              <div className="absolute -right-12 -top-12 w-48 h-48 bg-primary-container/20 rounded-full blur-3xl" />
              <span className="font-label text-xs uppercase tracking-widest font-bold text-on-primary/70 block mb-4">
                True Monthly Cost
              </span>
              <div className="flex items-baseline gap-2 mb-8">
                <span className="text-5xl font-extrabold tracking-tighter tabular-nums">
                  ${calculations.trueMonthlyCost.toFixed(2)}
                </span>
                <span className="text-on-primary/70 font-medium">/ month</span>
              </div>
              <div className="space-y-4 pt-6 border-t border-white/10">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-on-primary/70">Advertised Rent</span>
                  <span className="font-bold tabular-nums text-white">{formatCurrency(calculations.baseRent)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-on-primary/70">Amortized Savings</span>
                  <span className="font-bold tabular-nums text-green-300">-{formatCurrency(calculations.amortizedSavings)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-on-primary/70">Mandatory Fees</span>
                  <span className="font-bold tabular-nums text-red-300">+{formatCurrency(calculations.monthlyFees)}</span>
                </div>
              </div>
              <button className="w-full mt-8 py-4 bg-secondary text-primary font-bold rounded-lg transition-transform hover:scale-[1.02] active:scale-[0.98]">
                Download Full Financial Report
              </button>
            </div>

            {/* Formula Card */}
            <div className="surface-container-lowest p-6 rounded-lg border border-outline/30 shadow-sm">
              <h4 className="font-bold text-sm mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">calculate</span>
                The TrueCost Formula
              </h4>
              <div className="p-4 bg-surface-container-low rounded font-mono text-[11px] leading-relaxed text-on-surface-variant">
                ((Advertised × Months) - Concessions) / Term + Monthly Fees = True Monthly Cost
              </div>
              <p className="mt-4 text-xs text-on-surface-variant leading-normal italic">
                *This calculation amortizes all one-time concessions and upfront credits over the full lease term to provide an accurate monthly budget impact.
              </p>
            </div>

            {/* Insights Bento */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 border-2 border-emerald-100 p-4 rounded-lg">
                <span className="material-symbols-outlined text-secondary mb-2">savings</span>
                <div className="text-[10px] font-bold uppercase tracking-wider text-secondary mb-1">Effective Savings</div>
                <div className="text-xl font-black text-secondary tabular-nums">{formatCurrency(calculations.effectiveSavings)}</div>
                <div className="text-[10px] text-secondary/70">Total lease duration</div>
              </div>
              <div className="bg-red-50 border-2 border-red-100 p-4 rounded-lg">
                <span className="material-symbols-outlined text-error mb-2">warning</span>
                <div className="text-[10px] font-bold uppercase tracking-wider text-error mb-1">Fee Exposure</div>
                <div className="text-xl font-black text-error tabular-nums">{formatCurrency(calculations.annualFeeExposure)}</div>
                <div className="text-[10px] text-error/70">Annual mandatory total</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
