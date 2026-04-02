/**
 * Frontend environment variables configuration.
 * All variables prefixed with NEXT_PUBLIC_ are exposed to the browser.
 */

export const env = {
  // API Configuration
  API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1",

  // Mapbox Configuration (Optional for some pages)
  MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "",

  // Stripe Configuration
  STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
  STRIPE_PRICE_PRO: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || "",

  // Feature Flags (optional)
  ENABLE_ANALYTICS: (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS || "true") === "true",
  DEBUG_MODE: (process.env.NEXT_PUBLIC_DEBUG_MODE || "false") === "true",

  // Firebase Configuration
  FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
} as const;

export type Env = typeof env;
