import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { createCheckoutSession } from "@/api/stripe";
import { useAuth } from '@/context/AuthContext';
import { env } from "@/lib/env";

export default function SubscriptionPanel() {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    try {
      setLoading(true);
      
      const data = await createCheckoutSession(
        'pro',
        env.STRIPE_PRICE_PRO,
        `${window.location.origin}/dashboard?success=true`,
        `${window.location.origin}/dashboard?canceled=true`
      );
      
      const { session_url } = data;
      if (session_url) {
        window.location.href = session_url;
      }
    } catch (error) {
      console.error('Subscription error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 shadow-2xl">
      <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600 mb-4">
        {env.APP_NAME} Pro
      </h2>
      <p className="text-gray-300 mb-8">
        Unlock institutional-grade market data, unlimited alerts, and comprehensive real-time pricing analytics.
      </p>
      
      <div className="flex flex-col gap-4 mb-8">
        <ul className="space-y-3 text-gray-400">
          <li className="flex items-center gap-2">✓ Unlimited {env.APP_NAME} Reports</li>
          <li className="flex items-center gap-2">✓ Real-time Property Alerts</li>
          <li className="flex items-center gap-2">✓ Market Macro Trends</li>
          <li className="flex items-center gap-2">✓ Historical Pricing Data</li>
        </ul>
      </div>

      <button 
        onClick={handleSubscribe} 
        disabled={loading}
        className="w-full py-4 px-6 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all duration-200 transform hover:scale-[1.02] shadow-lg disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Upgrade to Pro - $30/mo'}
      </button>
    </div>
  );
}
