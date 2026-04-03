"use client";

import React, { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { loadStripe } from "@stripe/stripe-js";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

// DEV NOTE: Switched to centralized hooks to handle checkouts, allowing us to keep header 
// and config mapping entirely out of components that just need simple API methods.
import { useCreateCheckoutSession, useCreateCustomerPortalSession } from "@/hooks/useSession";
import { env } from "@/lib/env";
import clsx from "clsx";

// Initialize Stripe
const stripePromise = loadStripe(env.STRIPE_PUBLISHABLE_KEY);

export default function SubscriptionsPage() {
  const [loading, setLoading] = useState(false);
  const { dbUser, profileLoading } = useAuth();
  const createCheckoutMutation = useCreateCheckoutSession();
  const createPortalMutation = useCreateCustomerPortalSession();
  const toast = useToast();

  const handleUpgrade = async () => {
    try {
      if (dbUser?.tier_id === "enterprise") {
        toast.info("Institutional Tier", "You are on the top tier! To modify your enterprise agreement, please contact support.");
        return;
      }
      
      setLoading(true);
      const targetTier = dbUser?.tier_id === "pro" ? "enterprise" : "pro";
      const targetPrice = dbUser?.tier_id === "pro" ? env.STRIPE_PRICE_ENTERPRISE : env.STRIPE_PRICE_PRO;
      
      const data = await createCheckoutMutation.mutateAsync({
        tierId: targetTier,
        priceId: targetPrice,
        successUrl: `${window.location.origin}/subscriptions?success=true`,
        cancelUrl: `${window.location.origin}/subscriptions?canceled=true`
      });
      
      const { session_url } = data;
      if (session_url) {
        window.location.href = session_url;
      }
    } catch (error) {
      console.error("Subscription error:", error);
      toast.error("Checkout Failed", "Failed to start checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      setLoading(true);
      const data = await createPortalMutation.mutateAsync(
        `${window.location.origin}/subscriptions`
      );
      
      const { url } = data;
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error("Portal error:", error);
      toast.error("Portal Unavailable", "Failed to open billing portal. Please contact support.");
    } finally {
      setLoading(false);
    }
  };

  const getTierDisplay = () => {
    if (!dbUser) return "Loading...";
    if (dbUser.tier_id === "pro") return "Pro Tier";
    if (dbUser.tier_id === "enterprise") return "Institutional Tier";
    return "Free Tier";
  };

  const getResourceStats = (type: string) => {
    const usage = dbUser?.resource_usage?.find(r => r.resource_type === type);
    const used = usage?.used || 0;
    
    // Derived limits
    let max = 5;
    if (type === "api_requests") {
      max = dbUser?.tier_id === "enterprise" ? 10000 : dbUser?.tier_id === "pro" ? 500 : 100;
    } else if (type === "saved_reports") {
      max = dbUser?.tier_id === "enterprise" ? 1000 : dbUser?.tier_id === "pro" ? 50 : 5;
    }
    
    const percentage = Math.min(100, Math.max(0, Math.round((used / max) * 100)));
    return { used, max, percentage };
  };

  const apiStats = getResourceStats("api_requests");
  const reportsStats = getResourceStats("saved_reports");

  return (
    <AppLayout>
      <div className="min-h-screen p-6 md:p-12 font-body text-on-surface">
        <header className="mb-16">
          <h2 className="text-4xl font-black tracking-tight text-on-surface mb-2">Subscription & Billing</h2>
          <p className="text-on-surface-variant font-medium">Manage your institutional data access and financial records.</p>
        </header>

        {/* Current Plan Hero (Bento Style) */}
        <div className="grid grid-cols-12 gap-8 mb-16">
          <div className="col-span-12 lg:col-span-8 bg-surface-container-lowest rounded-xl p-8 border-t-2 border-secondary shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start mb-12 gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-secondary">Current Plan</span>
                  <span className="flex items-center gap-1 bg-secondary-container/30 text-secondary px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                    <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span> Active
                  </span>
                </div>
                <h3 className="text-5xl font-black tracking-tighter text-primary">
                  {profileLoading ? "Loading..." : getTierDisplay()}
                </h3>
              </div>
              <div className="sm:text-right">
                <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-1">Next Billing Date</p>
                <p className="text-xl font-bold tabular-nums">October 12, 2024</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">Included Intelligence</h4>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-secondary">analytics</span>
                    <div>
                      <p className="font-bold text-sm">Historical Price Index</p>
                      <p className="text-xs text-on-surface-variant">Full access to 10-year rental volatility data</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-secondary">notifications_active</span>
                    <div>
                      <p className="font-bold text-sm">Alert Engine</p>
                      <p className="text-xs text-on-surface-variant">Real-time triggers for sub-market fluctuations</p>
                    </div>
                  </li>
                </ul>
              </div>
              
              <div className="bg-surface-container-low p-6 rounded-lg">
                <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">Usage Metrics</h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                      <span>API Requests</span>
                      <span>{apiStats.used.toLocaleString()} / {apiStats.max.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 w-full bg-outline-variant/20 rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${apiStats.percentage}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                      <span>Saved Reports</span>
                      <span>{reportsStats.used.toLocaleString()} / {reportsStats.max.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 w-full bg-outline-variant/20 rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${reportsStats.percentage}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Upgrade / CTA Card */}
          <div className="col-span-12 lg:col-span-4 bg-primary-container text-white rounded-xl p-8 flex flex-col justify-between overflow-hidden relative shadow-sm">
            <div className="relative z-10">
              {dbUser?.tier_id === "enterprise" ? (
                <>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-primary-container">Top Tier</span>
                  <h3 className="text-3xl font-black tracking-tight mt-2 mb-4 leading-tight">Institutional Access</h3>
                  <p className="text-on-primary-container text-sm leading-relaxed mb-6">You have unlocked portfolio-wide risk modeling and white-label reporting for your firm.</p>
                  
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center gap-2 text-xs font-medium">
                      <span className="material-symbols-outlined text-secondary text-sm">check</span> Unlimited Bulk Data
                    </li>
                    <li className="flex items-center gap-2 text-xs font-medium">
                      <span className="material-symbols-outlined text-secondary text-sm">check</span> Dedicated Strategist
                    </li>
                  </ul>
                </>
              ) : dbUser?.tier_id === "pro" ? (
                <>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-primary-container">Next Level</span>
                  <h3 className="text-3xl font-black tracking-tight mt-2 mb-4 leading-tight">Institutional Tier</h3>
                  <p className="text-on-primary-container text-sm leading-relaxed mb-6">Unlock portfolio-wide risk modeling and white-label reporting for major brokerage firms.</p>
                  
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center gap-2 text-xs font-medium">
                      <span className="material-symbols-outlined text-secondary text-sm">check</span> Bulk Data Exports
                    </li>
                    <li className="flex items-center gap-2 text-xs font-medium">
                      <span className="material-symbols-outlined text-secondary text-sm">check</span> Dedicated Strategist
                    </li>
                  </ul>
                </>
              ) : (
                <>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-primary-container">Next Level</span>
                  <h3 className="text-3xl font-black tracking-tight mt-2 mb-4 leading-tight">Pro Tier</h3>
                  <p className="text-on-primary-container text-sm leading-relaxed mb-6">Unlock deep market insights, comprehensive neighborhood alerts, and true cost breakdowns.</p>
                  
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center gap-2 text-xs font-medium">
                      <span className="material-symbols-outlined text-secondary text-sm">check</span> Historical Price Index
                    </li>
                    <li className="flex items-center gap-2 text-xs font-medium">
                      <span className="material-symbols-outlined text-secondary text-sm">check</span> Smart Alerts
                    </li>
                  </ul>
                </>
              )}
            </div>
            
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className={clsx(
                "relative z-10 w-full py-4 bg-secondary text-white font-bold text-sm tracking-widest uppercase rounded transition-colors",
                loading ? "opacity-70" : "hover:bg-on-secondary-container active:scale-[0.98]"
              )}
            >
              {loading ? "Processing..." : dbUser?.tier_id === "enterprise" ? "Manage Plan" : "Upgrade Plan"}
            </button>
            
            <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
              <span className="material-symbols-outlined text-[160px]">account_balance</span>
            </div>
          </div>
        </div>

        {/* Billing History Section */}
        <section className="mt-20">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 gap-4">
            <h3 className="text-2xl font-black tracking-tight">Billing History</h3>
            <button 
              onClick={handleManageBilling}
              disabled={loading}
              className="text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">download</span> Download All Statements
            </button>
          </div>
          
          <div className="overflow-hidden rounded-xl bg-surface-container-low shadow-sm">
            <div className="hidden sm:grid sm:grid-cols-5 px-8 py-4 bg-surface-container-highest text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              <div className="col-span-2">Description</div>
              <div>Date</div>
              <div>Amount</div>
              <div className="text-right">Action</div>
            </div>
            
            {[
              { inv: "INV-2024-0912", date: "Sep 12, 2024", amount: "$149.00" },
              { inv: "INV-2024-0812", date: "Aug 12, 2024", amount: "$149.00" },
              { inv: "INV-2024-0712", date: "Jul 12, 2024", amount: "$149.00" },
              { inv: "INV-2024-0612", date: "Jun 12, 2024", amount: "$149.00" },
            ].map((bill, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-5 px-8 py-5 bg-surface-container-lowest items-center group hover:bg-surface-bright transition-colors border-b last:border-b-0 border-outline-variant/20 gap-4 sm:gap-0">
                <div className="col-span-1 sm:col-span-2">
                  <p className="font-bold text-sm text-primary">{env.APP_NAME} Pro - Monthly Subscription</p>
                  <p className="text-[10px] text-on-surface-variant tabular-nums">{bill.inv}</p>
                </div>
                <div className="text-sm font-medium tabular-nums text-on-surface-variant">{bill.date}</div>
                <div className="text-sm font-black tabular-nums text-primary">{bill.amount}</div>
                <div className="sm:text-right">
                  <button className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-secondary underline underline-offset-4 transition-colors">PDF</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Payment Method Section */}
        <section className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <h3 className="text-xl font-black tracking-tight mb-6">Payment Method</h3>
            <div className="bg-surface-container-lowest p-6 rounded-xl flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-8 bg-on-surface-variant/10 rounded flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-surface-variant">credit_card</span>
                </div>
                <div>
                  <p className="font-bold text-sm">Visa ending in 4242</p>
                  <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">Expires 04/26</p>
                </div>
              </div>
              <button 
                onClick={handleManageBilling}
                disabled={loading}
                className="text-[10px] font-bold uppercase tracking-widest text-secondary hover:underline transition-all disabled:opacity-50"
              >
                Edit
              </button>
            </div>
          </div>
          
          <div>
            <h3 className="text-xl font-black tracking-tight mb-6">Billing Address</h3>
            <div className="bg-surface-container-lowest p-6 rounded-xl flex items-start justify-between shadow-sm">
              <div>
                <p className="font-bold text-sm">Institutional Analytics Corp.</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">101 Financial Plaza, Suite 400<br/>New York, NY 10005</p>
              </div>
              <button 
                onClick={handleManageBilling}
                disabled={loading}
                className="text-[10px] font-bold uppercase tracking-widest text-secondary hover:underline transition-all disabled:opacity-50"
              >
                Edit
              </button>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="mt-24 pt-12 border-t-2 border-surface-container">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <h4 className="text-sm font-bold text-error">Cancel Subscription</h4>
              <p className="text-xs text-on-surface-variant mt-1">Deactivate your access to the {env.APP_NAME} rental database. Data will be preserved for 30 days.</p>
            </div>
            <button 
              onClick={handleManageBilling}
              disabled={loading}
              className="px-6 py-3 border border-error text-error text-[10px] font-bold uppercase tracking-widest hover:bg-error hover:text-white transition-colors rounded disabled:opacity-50"
            >
              Terminate Access
            </button>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

