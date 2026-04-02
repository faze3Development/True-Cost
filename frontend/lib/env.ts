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
  STRIPE_PRICE_ENTERPRISE: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE || "",

  // Feature Flags (optional)
  ENABLE_ANALYTICS: (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS || "true") === "true",
  DEBUG_MODE: (process.env.NEXT_PUBLIC_DEBUG_MODE || "false") === "true",
  ALLOW_MOCK_TOKEN: (process.env.NEXT_PUBLIC_ALLOW_MOCK_TOKEN || "false") === "true",

  // Firebase Configuration
  FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",

  // UI Configuration
  APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || "TrueCost Rent",
  COMPANY_NAME: process.env.NEXT_PUBLIC_COMPANY_NAME || "The Editorial Ledger",
  SUPPORT_EMAIL: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@theeditorialledger.com",
  DEFAULT_AVATAR_URL: process.env.NEXT_PUBLIC_DEFAULT_AVATAR_URL || "https://lh3.googleusercontent.com/aida-public/AB6AXuB_wbp8BFKeErTljlaO1jj9wyt3Nd6A4Y0tA5_clRlCbUI4SQ46-uYqgnazJ3erROnMfcodm-nLYyavKGnR3NaqbR8kuhzrqSMvIVy8LzVvfbf0OOaApPsB_eeieMGu9KPFKLh9Kb303BeyEDXHRGrTeGLVSobFKlhPY-1MNmbSeBAkFogyU79QVNNPhej4S-JaWA_RMLkJu4uDd69cSOuwFknq0tvYAnWZgcfVaAaW6HrQ0t5vfUTT--W1EjUHXJAok4Nqj08Cl4ou",
} as const;

export type Env = typeof env;
