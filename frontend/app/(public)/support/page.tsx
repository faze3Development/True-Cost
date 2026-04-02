"use client";

import React from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { env } from "@/lib/env";

export default function SupportPage() {
  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col">
      {/* Public Navbar */}
      <header className="px-8 py-6 flex items-center justify-between border-b border-outline-variant/10">
        <Link href="/" className="flex items-center gap-3">
          <Logo />
          <span className="font-bold text-xl tracking-tight text-on-surface">{env.APP_NAME}</span>
        </Link>
        <Link href="/login" className="text-sm font-semibold text-primary hover:text-secondary transition-colors">
          Sign In
        </Link>
      </header>

      <main className="flex-1 p-8 md:p-12 max-w-7xl w-full mx-auto">
        {/* Hero Header */}
        <header className="mb-12 md:mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-primary-container tracking-tight mb-4">
            How can we assist you?
          </h2>
          <p className="text-base md:text-lg text-on-primary-container max-w-2xl leading-relaxed">
            Access support for <span className="font-bold text-primary-container">{env.APP_NAME}</span>. Our team of data specialists and technical architects is available to ensure your platform experience is seamlessly accurate.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Support Request Form (Left) */}
          <div className="lg:col-span-7 bg-surface-container-lowest p-8 md:p-10 rounded-xl shadow-sm border border-outline-variant/10">
            <div className="mb-8">
              <span className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-2 block">Direct Inquiry</span>
              <h3 className="text-2xl font-bold text-primary-container">Open a Support Ticket</h3>
            </div>
            <form className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-2">Topic</label>
                  <div className="relative">
                    <select className="w-full bg-surface-container-low border-none rounded-lg p-4 text-sm focus:ring-2 focus:ring-secondary/20 appearance-none text-on-surface">
                      <option>Select a category...</option>
                      <option>Account Registration</option>
                      <option>Data Discrepancy</option>
                      <option>Technical Issue</option>
                      <option>Billing & Subscriptions</option>
                      <option>Feature Request</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <span className="material-symbols-outlined text-on-surface-variant text-sm" aria-hidden="true">
                        expand_more
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-2">Email Address</label>
                  <input 
                    className="w-full bg-surface-container-low border-none rounded-lg p-4 text-sm focus:ring-2 focus:ring-secondary/20 text-on-surface placeholder:text-on-surface-variant/40 transition-all duration-300" 
                    placeholder="name@email.com" 
                    type="email"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-2">Subject</label>
                  <input 
                    className="w-full bg-surface-container-low border-none rounded-lg p-4 text-sm focus:ring-2 focus:ring-secondary/20 text-on-surface placeholder:text-on-surface-variant/40 transition-all duration-300" 
                    placeholder="Brief summary of your inquiry" 
                    type="text"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-2">Description</label>
                  <textarea 
                    className="w-full bg-surface-container-low border-none rounded-lg p-4 text-sm focus:ring-2 focus:ring-secondary/20 text-on-surface placeholder:text-on-surface-variant/40 transition-all duration-300 resize-none" 
                    placeholder="Provide detailed context..." 
                    rows={6} 
                  />
                </div>
              </div>
              <button 
                className="w-full bg-gradient-to-r from-primary-container to-secondary py-4 text-white font-bold rounded-lg shadow-sm hover:opacity-90 active:scale-[0.98] transition-all duration-300" 
                type="button"
              >
                Submit Request
              </button>
            </form>
          </div>

          {/* Knowledge Base & Contact Info (Right) */}
          <div className="lg:col-span-5 space-y-8">
            <section>
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-6 block">Resources</span>
              <div className="space-y-4">
                {/* Knowledge Cards */}
                <div className="bg-surface-container-high p-6 rounded-lg group hover:bg-surface-container-highest transition-colors cursor-pointer shadow-sm border border-outline-variant/10">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-primary-container mb-1 group-hover:text-secondary transition-colors">Getting Started</h4>
                      <p className="text-xs text-on-primary-container leading-relaxed">Quick start guide for creating an account and searching properties.</p>
                    </div>
                    <span className="material-symbols-outlined text-secondary group-hover:-translate-y-1 transition-transform" aria-hidden="true">rocket_launch</span>
                  </div>
                </div>

                <div className="bg-surface-container-high p-6 rounded-lg group hover:bg-surface-container-highest transition-colors cursor-pointer border-t-2 border-t-secondary shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-primary-container mb-1 group-hover:text-secondary transition-colors">Data Methodology</h4>
                      <p className="text-xs text-on-primary-container leading-relaxed">Deep dive into our algorithms and market reports.</p>
                    </div>
                    <span className="material-symbols-outlined text-secondary group-hover:-translate-y-1 transition-transform" aria-hidden="true">analytics</span>
                  </div>
                </div>

                <div className="bg-surface-container-high p-6 rounded-lg group hover:bg-surface-container-highest transition-colors cursor-pointer shadow-sm border border-outline-variant/10">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-primary-container mb-1 group-hover:text-secondary transition-colors">Account & Billing</h4>
                      <p className="text-xs text-on-primary-container leading-relaxed">Manage your premium subscriptions and invoices.</p>
                    </div>
                    <span className="material-symbols-outlined text-secondary group-hover:-translate-y-1 transition-transform" aria-hidden="true">payments</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Support Info Card */}
            <section className="bg-primary-container text-on-primary p-8 rounded-xl relative overflow-hidden shadow-md">
              <div className="relative z-10">
                <span className="text-[10px] font-bold uppercase tracking-widest text-secondary-fixed mb-4 block">Priority Support</span>
                <div className="mb-6">
                  <p className="text-sm text-on-primary-container mb-1">Direct Support Email</p>
                  <p className="text-lg md:text-xl font-bold tracking-tight text-white break-all">{env.SUPPORT_EMAIL}</p>
                </div>
                <div className="flex items-center gap-3 bg-white/5 p-4 rounded-lg backdrop-blur-sm border border-white/10">
                  <span className="material-symbols-outlined text-secondary-fixed" aria-hidden="true">schedule</span>
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-primary-fixed-dim">Avg. Response Time</p>
                    <p className="text-sm font-semibold text-white">Under 2 Hours</p>
                  </div>
                </div>
              </div>
              {/* Decorative Subtle Gradient */}
              <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-secondary/20 rounded-full blur-3xl pointer-events-none" />
            </section>
          </div>
        </div>

      </main>
      {/* Standard Footer Text */}
      <footer className="mt-auto py-12 px-6 border-t border-outline-variant/20 flex flex-col md:flex-row justify-between items-center gap-6 text-on-surface-variant w-full max-w-7xl mx-auto">
        <div className="text-xs font-medium">
          © {new Date().getFullYear()} {env.APP_NAME}
        </div>
        <div className="flex flex-wrap justify-center gap-8 text-[11px] font-semibold text-outline tracking-wide">
          <Link className="hover:text-primary transition-colors" href="/legal?tab=terms">Terms of Service</Link>
          <Link className="hover:text-primary transition-colors" href="/legal?tab=privacy">Privacy Policy</Link>
          <Link className="hover:text-primary transition-colors" href="/support">Help</Link>
        </div>
      </footer>
    </div>
  );
}
