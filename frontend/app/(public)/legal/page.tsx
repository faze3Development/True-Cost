"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { env } from "@/lib/env";

type Tab = "overview" | "privacy" | "terms" | "compliance";

function LegalCenterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabQuery = searchParams?.get("tab") as Tab | null;
  
  const [activeTab, setActiveTab] = useState<Tab>(tabQuery || "overview");

  useEffect(() => {
    if (tabQuery && ["overview", "privacy", "terms", "compliance"].includes(tabQuery)) {
      setActiveTab(tabQuery);
    }
  }, [tabQuery]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    router.push(`/legal?tab=${tab}`);
  };

  return (
    <div className="bg-surface text-on-surface flex min-h-screen overflow-hidden">
      {/* SideNavBar */}
      <aside className="hidden md:flex flex-col h-screen w-64 left-0 bg-surface-container-low text-on-surface font-inter text-sm font-medium tonal-shift-no-border flat p-4 gap-2 shrink-0 border-r border-outline-variant/20 z-40">
        <div className="flex items-center gap-3 px-2 py-6 mb-4">
          <div className="w-10 h-10 bg-primary-container flex items-center justify-center rounded">
            <span className="material-symbols-outlined text-on-primary-container" aria-hidden="true">verified_user</span>
          </div>
          <div>
            <h2 className="text-lg font-black text-on-surface leading-tight">Legal Center</h2>
          </div>
        </div>
        <nav className="flex-1 flex flex-col gap-1 w-full">
          <button 
            onClick={() => handleTabChange("overview")}
            className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded transition-all duration-300 w-full text-left
              ${activeTab === "overview" ? "bg-surface-container-lowest text-secondary shadow-sm font-bold" : "text-on-surface-variant hover:bg-surface-container"}`}
          >
            <span className={`material-symbols-outlined text-[20px] ${activeTab === "overview" ? "text-secondary" : ""}`} aria-hidden="true">gavel</span>
            Overview
          </button>
          <button 
            onClick={() => handleTabChange("privacy")}
            className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded transition-all duration-300 w-full text-left
              ${activeTab === "privacy" ? "bg-surface-container-lowest text-secondary shadow-sm font-bold" : "text-on-surface-variant hover:bg-surface-container"}`}
          >
            <span className={`material-symbols-outlined text-[20px] ${activeTab === "privacy" ? "text-secondary" : ""}`} aria-hidden="true">lock</span>
            Privacy Policy
          </button>
          <button 
            onClick={() => handleTabChange("terms")}
            className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded transition-all duration-300 w-full text-left
              ${activeTab === "terms" ? "bg-surface-container-lowest text-secondary shadow-sm font-bold" : "text-on-surface-variant hover:bg-surface-container"}`}
          >
            <span className={`material-symbols-outlined text-[20px] ${activeTab === "terms" ? "text-secondary" : ""}`} aria-hidden="true">description</span>
            Terms of Service
          </button>
          <button 
            onClick={() => handleTabChange("compliance")}
            className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded transition-all duration-300 w-full text-left
              ${activeTab === "compliance" ? "bg-surface-container-lowest text-secondary shadow-sm font-bold" : "text-on-surface-variant hover:bg-surface-container"}`}
          >
            <span className={`material-symbols-outlined text-[20px] ${activeTab === "compliance" ? "text-secondary" : ""}`} aria-hidden="true">verified_user</span>
            Regulatory Disclosures
          </button>
        </nav>
        <div className="mt-auto pt-4 border-t border-outline-variant/20 flex flex-col gap-1 w-full">
          <Link href="/support" className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container transition-all duration-300 rounded w-full text-left">
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">help</span>
            Support
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* TopNavBar */}
        <header className="w-full bg-surface flex items-center justify-between px-8 py-4 border-b border-outline-variant/20 z-50">
          <Link href="/" className="text-xl font-bold tracking-tighter text-on-surface">
            {env.APP_NAME}
          </Link>
          <Link href="/login" className="text-sm font-semibold text-secondary hover:opacity-80 transition-opacity">
            Sign In
          </Link>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-surface p-6 md:p-8 lg:p-12 space-y-12">
          {activeTab === "overview" && <OverviewContent setActiveTab={handleTabChange} />}
          {activeTab === "privacy" && <PrivacyPolicyContent />}
          {activeTab === "terms" && <TermsOfServiceContent />}
          {activeTab === "compliance" && <ComplianceContent />}
        </main>
      </div>
    </div>
  );
}

export default function LegalCenterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface flex justify-center items-center">Loading...</div>}>
      <LegalCenterContent />
    </Suspense>
  );
}

function OverviewContent({ setActiveTab }: { setActiveTab: (tab: Tab) => void }) {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-xl bg-primary-container p-12 text-on-primary">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-5xl font-extrabold tracking-tight mb-4 text-white">Legal Center</h1>
          <p className="text-on-primary-container text-lg leading-relaxed max-w-lg">
            Our framework ensures your data remains secure, compliant, and governed by the highest standards of transparency.
          </p>
          <div className="mt-8 flex gap-4">
            <button className="bg-secondary px-6 py-3 font-semibold text-white rounded-md flex items-center gap-2 hover:bg-secondary/90 transition-all">
              <span className="material-symbols-outlined" aria-hidden="true">security</span>
              Review Safety Protocol
            </button>
          </div>
        </div>
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-emerald-500/30 to-transparent"></div>
          <img className="w-full h-full object-cover mix-blend-overlay" alt="Desk with legal papers" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD7p9NC74D5_Nu0J4NvdUZ9iy5feRSk7TejJGahKIfg4nZhcN9APXgcPAci_he5oLirEgAMMUA6pCaxs6kkVIKsIKoCZVRHzqTUSVMdTo_DONMiCInblAfLIQB4H7-Ds0Iy9GWn_qqoMzrZMKAONtf8tAmH-KavegfvVGt7PeXHCosTwahppXv206Y8I3XFQwtOsoymJmptcq7fT-QwMV9Gq-cSyBRqbVZum6sYg1eu_cyjmdPMDlTaitifMgvZGhlNaaRlaHaGSQH-" />
        </div>
      </section>
      
      {/* Quick Access Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-surface-container-lowest p-8 flex flex-col group hover:bg-surface-container-low transition-all duration-300 rounded-xl shadow-sm border border-outline-variant/10">
          <div className="w-12 h-12 bg-surface-container-high flex items-center justify-center rounded-lg mb-6 group-hover:bg-surface-container-highest transition-colors">
            <span className="material-symbols-outlined text-on-surface" aria-hidden="true">lock</span>
          </div>
          <h3 className="text-xl font-bold mb-4 tracking-tight">Privacy Policy</h3>
          <p className="text-on-surface-variant text-sm leading-relaxed flex-1 mb-8">
            Comprehensive overview of how we collect, use, and protect your data. Updated for GDPR & CCPA.
          </p>
          <button onClick={() => setActiveTab("privacy")} className="text-secondary font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:opacity-80 transition-opacity w-max">
            View Full Document
            <span className="material-symbols-outlined text-sm" aria-hidden="true">arrow_forward</span>
          </button>
        </div>
        
        <div className="bg-surface-container-lowest p-8 flex flex-col group hover:bg-surface-container-low transition-all duration-300 rounded-xl shadow-sm border border-outline-variant/10">
          <div className="w-12 h-12 bg-surface-container-high flex items-center justify-center rounded-lg mb-6 group-hover:bg-surface-container-highest transition-colors">
            <span className="material-symbols-outlined text-on-surface" aria-hidden="true">description</span>
          </div>
          <h3 className="text-xl font-bold mb-4 tracking-tight">Terms of Service</h3>
          <p className="text-on-surface-variant text-sm leading-relaxed flex-1 mb-8">
            The standard operating agreement between {env.APP_NAME} and you. Defines service levels and liability.
          </p>
          <button onClick={() => setActiveTab("terms")} className="text-secondary font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:opacity-80 transition-opacity w-max">
            View Full Document
            <span className="material-symbols-outlined text-sm" aria-hidden="true">arrow_forward</span>
          </button>
        </div>
        
        <div className="bg-surface-container-lowest p-8 flex flex-col group hover:bg-surface-container-low transition-all duration-300 rounded-xl shadow-sm border border-outline-variant/10">
          <div className="w-12 h-12 bg-surface-container-high flex items-center justify-center rounded-lg mb-6 group-hover:bg-surface-container-highest transition-colors">
            <span className="material-symbols-outlined text-on-surface" aria-hidden="true">history_edu</span>
          </div>
          <h3 className="text-xl font-bold mb-4 tracking-tight">Regulatory Disclosures</h3>
          <p className="text-on-surface-variant text-sm leading-relaxed flex-1 mb-8">
            Mandatory filings and transparency reports regarding fair housing and market data utilization.
          </p>
          <button onClick={() => setActiveTab("compliance")} className="text-secondary font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:opacity-80 transition-opacity w-max">
            View Full Document
            <span className="material-symbols-outlined text-sm" aria-hidden="true">arrow_forward</span>
          </button>
        </div>
      </section>

      {/* Status and Updates Section */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">
        {/* Compliance Status */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-on-surface-variant">Live Compliance Monitoring</h2>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-secondary">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
              ACTIVE SYSTEM
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-outline-variant/20 rounded-lg overflow-hidden border-2 border-transparent">
            <div className="bg-surface-container-lowest p-6">
              <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest mb-1">System Health</p>
              <p className="text-3xl font-black text-on-surface tracking-tighter">99.9%</p>
              <div className="w-full bg-surface-container-high h-1 mt-3 rounded-full overflow-hidden">
                <div className="bg-secondary h-full w-[99.9%]"></div>
              </div>
            </div>
            <div className="bg-surface-container-lowest p-6">
              <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest mb-1">Data Fidelity</p>
              <p className="text-3xl font-black text-secondary tracking-tighter">Verified</p>
              <div className="flex gap-1 mt-3">
                <span className="w-2 h-2 rounded-full bg-secondary"></span>
                <span className="w-2 h-2 rounded-full bg-secondary"></span>
                <span className="w-2 h-2 rounded-full bg-secondary"></span>
              </div>
            </div>
            <div className="bg-surface-container-lowest p-6">
              <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest mb-1">Encryption</p>
              <p className="text-2xl font-black text-on-surface tracking-tighter">AES-256</p>
              <p className="text-[10px] text-on-surface-variant mt-3 font-medium">Military Grade Standards</p>
            </div>
          </div>
          <div className="bg-surface-container-low p-6 flex items-start gap-4 rounded-lg">
            <span className="material-symbols-outlined text-secondary" aria-hidden="true">shield_with_heart</span>
            <div>
              <h4 className="font-bold text-sm">Data Sovereign Architecture</h4>
              <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                Our data processing nodes are localized within sovereign cloud regions to ensure jurisdictional compliance for multi-national operations.
              </p>
            </div>
          </div>
        </div>
        
        {/* Update Log */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-slate-500">Regulatory Audit Log</h2>
          <div className="space-y-4">
            <div className="bg-surface-container-low p-4 hover:bg-surface-container-high transition-colors cursor-pointer group rounded-lg">
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-bold text-emerald-600">PUBLISHED</span>
                <span className="text-[10px] font-bold text-slate-400">OCT 14, 2023</span>
              </div>
              <h5 className="text-sm font-bold group-hover:text-emerald-700 transition-colors">Privacy Policy Updated</h5>
              <p className="text-[11px] text-on-surface-variant mt-1">Refined data retention schedules for institutional tenants.</p>
            </div>
            <div className="bg-surface-container-low p-4 hover:bg-surface-container-high transition-colors cursor-pointer group rounded-lg">
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-bold text-slate-500">SYSTEM ARCHIVE</span>
                <span className="text-[10px] font-bold text-slate-400">SEP 22, 2023</span>
              </div>
              <h5 className="text-sm font-bold group-hover:text-emerald-700 transition-colors">Fair Housing Disclosure v2.4</h5>
              <p className="text-[11px] text-on-surface-variant mt-1">Algorithm transparency report for rent optimization models.</p>
            </div>
            <div className="bg-surface-container-low p-4 hover:bg-surface-container-high transition-colors cursor-pointer group rounded-lg">
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-bold text-slate-500">SYSTEM ARCHIVE</span>
                <span className="text-[10px] font-bold text-slate-400">JUL 08, 2023</span>
              </div>
              <h5 className="text-sm font-bold group-hover:text-emerald-700 transition-colors">Terms of Service Addendum</h5>
              <p className="text-[11px] text-on-surface-variant mt-1">Updated definitions for multi-unit property portfolios.</p>
            </div>
            <button className="w-full py-3 text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-primary transition-colors flex items-center justify-center gap-2">
              View Historical Archive
              <span className="material-symbols-outlined text-sm" aria-hidden="true">manage_search</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function ComplianceContent() {
  const requiredDisclaimers = [
    "All information provided is deemed reliable but is not guaranteed. Prices and estimated True Costs are subject to change at any point and should be independently reviewed and verified for accuracy",
    "Information is provided exclusively for the consumer's personal, non-commercial use, and may not be used for any purpose other than to identify prospective properties",
    "This platform provides algorithmic estimates and does not provide binding financial, legal, or real estate advice.",
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <section className="rounded-xl bg-surface-container-lowest p-8 border border-outline-variant/20">
        <h2 className="text-2xl font-black tracking-tight text-on-surface">Regulatory Disclosures</h2>
        <p className="mt-3 text-sm text-on-surface-variant">
          True Cost displays a complete monthly fee-inclusive estimate to comply with federal fee transparency expectations.
        </p>
      </section>

      <section className="rounded-xl bg-surface-container-lowest p-8 border border-outline-variant/20">
        <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-on-surface-variant">Required Consumer Notices</h3>
        <ul className="mt-4 space-y-3">
          {requiredDisclaimers.map((text) => (
            <li key={text} className="rounded-lg bg-surface-container-low p-4 text-sm leading-relaxed text-on-surface">
              {text}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl bg-surface-container-lowest p-8 border border-outline-variant/20">
        <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-on-surface-variant">Fee Transparency</h3>
        <p className="mt-3 text-sm text-on-surface">
          Property outputs must include total mandatory monthly fees in the True Cost estimate and identify that the estimate is algorithmic.
        </p>
      </section>
    </div>
  );
}

function PrivacyPolicyContent() {
  return (
    <div className="max-w-4xl mx-auto w-full pb-20">
      <header className="mb-20">
        <div className="flex items-center gap-2 text-emerald-600 font-bold tracking-widest text-xs uppercase mb-4">
          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
          Trust Protocol
        </div>
        <h1 className="text-5xl md:text-6xl font-black text-on-surface tracking-tighter leading-tight mb-6 editorial-tight">Privacy Policy</h1>
        <p className="text-xl text-on-surface-variant leading-relaxed font-medium">{env.APP_NAME} operates with privacy in mind. This policy details how we handle the data required to decode the rental market&apos;s true value.</p>
      </header>

      {/* 1. Acceptance */}
      <section className="mb-24">
        <div className="flex flex-col md:flex-row items-start gap-6 md:gap-8">
          <div className="w-12 h-12 flex-shrink-0 bg-primary-container text-emerald-400 flex items-center justify-center rounded-lg shadow-sm">
            <span className="text-lg font-bold font-mono">01</span>
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold mb-6 tracking-tight text-on-surface">Acceptance of Privacy Terms</h3>
            <div className="bg-surface-container-low p-8 rounded-xl space-y-4 hover:bg-surface-container transition-colors duration-300">
              <p className="text-on-surface-variant leading-relaxed">By engaging with the {env.APP_NAME} ecosystem, you provide explicit consent for the processing of data as outlined in this document. Our transparency policy ensures that every data point used is disclosed without obfuscation.</p>
              <p className="text-on-surface-variant leading-relaxed">This protocol is effective as of October 2024 and applies to all users of the {env.APP_NAME} platform.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Information Collection - Bento Style Grid */}
      <section className="mb-24">
        <div className="mb-10">
          <h3 className="text-sm font-bold text-emerald-600 tracking-widest uppercase mb-2">Data Inventory</h3>
          <h2 className="text-3xl font-black text-on-surface tracking-tight">Information We Collect</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-surface-container-lowest p-10 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-outline-variant/10 hover:-translate-y-1 transition-transform duration-300">
            <div className="material-symbols-outlined text-secondary mb-6 text-3xl">analytics</div>
            <h4 className="text-lg font-bold mb-3">Scraped Rental Data</h4>
            <p className="text-on-surface-variant text-sm leading-relaxed">We aggregate high-frequency market data from public and institutional sources. This includes historical pricing, localized utility averages, and municipal tax variations to construct the {env.APP_NAME} baseline.</p>
          </div>
          <div className="bg-primary-container p-10 rounded-xl text-on-primary-container shadow-md hover:-translate-y-1 transition-transform duration-300">
            <div className="material-symbols-outlined text-secondary mb-6 text-3xl">fingerprint</div>
            <h4 className="text-lg font-bold mb-3">User Identity</h4>
            <p className="text-on-primary-container/80 text-sm leading-relaxed">Verified credentials required for accessing your custom {env.APP_NAME} dashboard and saved properties.</p>
          </div>
          <div className="bg-surface-container-high p-10 rounded-xl hover:-translate-y-1 transition-transform duration-300">
            <div className="material-symbols-outlined text-primary mb-6 text-3xl">history</div>
            <h4 className="text-lg font-bold mb-3">Search Intent</h4>
            <p className="text-on-surface-variant text-sm leading-relaxed">Anonymized search history used to improve regional market heatmaps.</p>
          </div>
          <div className="md:col-span-2 bg-surface p-10 rounded-xl border-2 border-secondary/20 hover:-translate-y-1 transition-transform duration-300">
            <div className="flex items-center gap-4 mb-4">
              <span className="material-symbols-outlined text-secondary">security</span>
              <h4 className="text-lg font-bold">Encrypted Meta-Data</h4>
            </div>
            <p className="text-on-surface-variant text-sm leading-relaxed">All telemetry data regarding user interaction with analytical widgets is stored in an immutable, encrypted state to ensure auditability without compromising privacy.</p>
          </div>
        </div>
      </section>

      {/* 3. Usage */}
      <section className="mb-24">
        <div className="flex flex-col lg:flex-row items-center gap-12 mb-12">
          <div className="flex-1">
            <h3 className="text-2xl font-bold mb-6 tracking-tight text-on-surface">How We Use Your Data</h3>
            <div className="space-y-6">
              <div className="flex gap-4">
                <span className="material-symbols-outlined text-emerald-600 mt-0.5">check_circle</span>
                <div>
                  <h5 className="font-bold text-on-surface">Algorithmic Processing</h5>
                  <p className="text-on-surface-variant text-sm">Refining the {env.APP_NAME} formula to account for seasonal and geopolitical economic shifts.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="material-symbols-outlined text-emerald-600 mt-0.5">check_circle</span>
                <div>
                  <h5 className="font-bold text-on-surface">Market Analysis</h5>
                  <p className="text-on-surface-variant text-sm">Generating the market reports available on the platform.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="material-symbols-outlined text-emerald-600 mt-0.5">check_circle</span>
                <div>
                  <h5 className="font-bold text-on-surface">{env.APP_NAME} Calculation</h5>
                  <p className="text-on-surface-variant text-sm">Merging user-specific parameters with regional datasets for precision budgeting.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="hidden lg:block w-72 h-72 rounded-xl bg-slate-200 overflow-hidden relative shadow-2xl shrink-0">
            <img alt="Data Analytics Visualization" className="w-full h-full object-cover grayscale contrast-125" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAxE9UqF9fJs9s91RZHwhXg4Lb4H3kkbWGB2vga2k-a5oBaUSwOnj_QjbEBf0No92SAtlJ98Hr6s8OWkoYACQfXDZ9qUc0Bsnb-_i8ayZDhncGGu_AR-PT9faKqhtECn0BkpzR3BQHRYsBI65r0s8X5GJJi9dOQrwtmwEarM7W0huYvVoy1ZenRixZtPrFmsg3dErsVmK5CVAMdXj36PvYonDK5861to9Pni_uTSD7rx0wjtRXf-syEcSea8QilCpZ7dS9PO-q2cNPR" />
            <div className="absolute inset-0 bg-primary/20 mix-blend-multiply"></div>
          </div>
        </div>
      </section>

      {/* 4. Security - Glassmorphism */}
      <section className="mb-24 relative overflow-hidden bg-primary-container p-12 rounded-2xl text-white shadow-lg">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-1 bg-emerald-500 rounded-full"></div>
            <h3 className="text-2xl font-bold tracking-tight text-white">Data Protection & Security</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-8 md:gap-12">
            <div className="backdrop-blur-md bg-white/5 p-8 rounded-xl border border-white/10 hover:bg-white/10 transition-colors duration-300">
              <span className="material-symbols-outlined text-emerald-400 mb-4 block text-3xl">verified</span>
              <h5 className="font-bold mb-2 text-white">SOC2 Compliance</h5>
              <p className="text-slate-300 text-sm leading-relaxed">Our infrastructure undergoes quarterly audits to maintain the highest institutional standards for security and availability.</p>
            </div>
            <div className="backdrop-blur-md bg-white/5 p-8 rounded-xl border border-white/10 hover:bg-white/10 transition-colors duration-300">
              <span className="material-symbols-outlined text-emerald-400 mb-4 block text-3xl">lock</span>
              <h5 className="font-bold mb-2 text-white">End-to-End Encryption</h5>
              <p className="text-slate-300 text-sm leading-relaxed">All data transmission between your dashboard and our calculation nodes is secured via 256-bit AES encryption.</p>
            </div>
          </div>
        </div>
        {/* Decorative background elements */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-0 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </section>

      {/* 5. Your Rights */}
      <section className="mb-32">
        <div className="border-l-4 border-emerald-500/30 pl-8 md:pl-10">
          <h3 className="text-2xl font-bold mb-6 tracking-tight text-on-surface">Your Rights & Choice</h3>
          <div className="grid lg:grid-cols-2 gap-10">
            <div className="space-y-6">
              <p className="text-on-surface-variant font-medium leading-relaxed">We adhere to the &quot;Right to Erasure&quot; protocol. Users may request a complete purge of their search history and profile data at any time.</p>
              <Link href="#" className="inline-flex items-center gap-2 text-emerald-600 font-bold text-sm hover:text-emerald-700 transition-colors group">
                Request Data Purge
                <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </Link>
            </div>
            <div className="bg-surface-container p-6 rounded-xl border border-outline-variant/10 shadow-sm">
              <h6 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Opt-Out Status</h6>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-on-surface">Market Tracking</span>
                <div className="w-11 h-6 bg-secondary rounded-full flex items-center justify-end px-1 cursor-pointer transition-colors shadow-inner">
                  <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                </div>
              </div>
              <p className="text-[10px] text-on-surface-variant mt-3 leading-loose">Tracking currently active. Used exclusively for aggregated regional metrics.</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

function TermsOfServiceContent() {
  return (
    <div className="max-w-4xl mx-auto w-full pb-20">
      <header className="mb-16">
        <div className="inline-block px-3 py-1 bg-secondary-container text-on-secondary-container text-[10px] font-bold uppercase tracking-widest rounded-sm mb-6">
          Legal Governance
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-on-surface tracking-tighter mb-4 editorial-tight">Terms of Service</h1>
        <div className="flex items-center gap-4 text-sm text-on-surface-variant font-medium">
          <span>Last Updated: October 24, 2024</span>
          <span className="h-1 w-1 bg-outline-variant rounded-full"></span>
          <span>Version 4.2.0</span>
        </div>
      </header>

      {/* Document Body */}
      <div className="space-y-12">
        {/* Section 1 */}
        <section className="bg-surface-container-low p-8 md:p-12 rounded-xl transition-all duration-300 hover:bg-surface-container">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <span className="text-sm font-bold text-secondary font-mono bg-white px-2 py-1 rounded shadow-sm">01.</span>
            <div>
              <h2 className="text-2xl font-bold text-primary mb-6 tracking-tight">Acceptance of Terms</h2>
              <div className="space-y-4 text-on-surface-variant leading-relaxed">
                <p>By accessing or using the {env.APP_NAME} platform (the &quot;Service&quot;), you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. These terms constitute a legally binding agreement between you and {env.COMPANY_NAME} regarding your use of our rental analytics and financial modeling tools.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2 */}
        <section className="p-8 md:p-12">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <span className="text-sm font-bold text-secondary font-mono bg-surface-container-low px-2 py-1 rounded shadow-sm">02.</span>
            <div className="w-full">
              <h2 className="text-2xl font-bold text-primary mb-6 tracking-tight">User Obligations & Institutional Conduct</h2>
              <div className="space-y-6">
                <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm border border-outline-variant/10">
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-primary mb-3">Account Integrity</h3>
                  <p className="text-on-surface-variant leading-relaxed">Users are responsible for maintaining the confidentiality of their credentials. Any unauthorized access resulting from credential leakage is the sole responsibility of the account holder.</p>
                </div>
                <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm border border-outline-variant/10">
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-primary mb-3">Data Accuracy</h3>
                  <p className="text-on-surface-variant leading-relaxed">You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate and complete.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: High Contrast Highlight */}
        <section className="bg-primary-container text-on-primary-container p-8 md:p-12 rounded-xl relative overflow-hidden group">
          <div className="absolute inset-0 opacity-10 pointer-events-none transition-opacity duration-1000 group-hover:opacity-20" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <span className="text-sm font-bold text-[#0D1C32] bg-emerald-400 px-2 py-1 rounded shadow-sm">03.</span>
              <div>
                <h2 className="text-2xl font-bold text-white mb-6 tracking-tight">Intellectual Property Rights</h2>
                <p className="leading-relaxed text-surface-container-low/90 font-medium text-lg">
                  All proprietary algorithms, &quot;{env.APP_NAME}&quot; calculation engines, and data visualizations are the exclusive property of {env.COMPANY_NAME}. No portion of the analytical output may be reproduced, reverse-engineered, or redistributed for commercial use without express written consent.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4 */}
        <section className="bg-surface-container-low p-8 md:p-12 rounded-xl transition-all duration-300 hover:bg-surface-container">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <span className="text-sm font-bold text-secondary font-mono bg-white px-2 py-1 rounded shadow-sm">04.</span>
            <div className="w-full">
              <h2 className="text-2xl font-bold text-primary mb-6 tracking-tight">Data Privacy & Security</h2>
              <p className="text-on-surface-variant leading-relaxed mb-6">
                Our commitment to data integrity is paramount. We employ compliant security protocols to protect your data. Your use of the service is also governed by our Privacy Policy, which is incorporated herein by reference.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <div className="flex items-center gap-3 p-4 bg-white/80 rounded-lg border border-outline-variant/10 shadow-sm">
                  <div className="shrink-0 p-1 bg-secondary/10 rounded">
                    <span className="material-symbols-outlined text-secondary block" aria-hidden="true">lock</span>
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-primary">End-to-End Encryption</span>
                </div>
                <div className="flex items-center gap-3 p-4 bg-white/80 rounded-lg border border-outline-variant/10 shadow-sm">
                  <div className="shrink-0 p-1 bg-secondary/10 rounded">
                    <span className="material-symbols-outlined text-secondary block" aria-hidden="true">analytics</span>
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-primary">Anonymized Aggregation</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5 */}
        <section className="p-8 md:p-12 border-l-[3px] border-emerald-500/30 bg-emerald-50/20 rounded-r-xl">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <span className="text-sm font-bold text-secondary font-mono bg-white px-2 py-1 rounded shadow-sm">05.</span>
            <div>
              <h2 className="text-2xl font-bold text-primary mb-6 tracking-tight">Limitation of Liability</h2>
              <p className="text-on-surface-variant leading-relaxed italic font-medium">
                &quot;{env.APP_NAME} provides analytical tools for informational purposes. While we strive for 99.9% data accuracy, we do not provide legal or financial advice. We are not liable for any financial decisions made based on platform projections.&quot;
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Call to Action / Acceptance */}
      <div className="mt-24 p-8 md:p-12 bg-surface-container-high rounded-2xl flex flex-col items-center text-center shadow-inner border border-outline-variant/10">
        <span className="material-symbols-outlined text-4xl text-secondary mb-4" aria-hidden="true">verified</span>
        <h3 className="text-2xl font-bold text-primary-container mb-2">Compliance Confirmed</h3>
        <p className="text-on-surface-variant max-w-lg mb-8 font-medium">By continuing to use our dashboard, you reaffirm your agreement to the updated terms listed above.</p>
        <div className="flex flex-col sm:flex-row justify-center gap-4 w-full sm:w-auto">
          <button className="px-8 py-3 bg-secondary text-on-secondary font-bold rounded-lg hover:opacity-90 active:scale-[0.98] transition-all w-full sm:w-auto shadow-sm">
            Close and Continue
          </button>
        </div>
      </div>
    </div>
  );
}
