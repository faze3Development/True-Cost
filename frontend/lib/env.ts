/**
 * Frontend environment variables configuration.
 * All variables prefixed with NEXT_PUBLIC_ are exposed to the browser.
 */

const getEnv = (key: string, defaultValue?: string): string => {
  const value = typeof window !== "undefined"
    ? (process.env[key] || defaultValue)
    : (process.env[key] || defaultValue);

  if (!value) {
    throw new Error(`Environment variable ${key} is not defined`);
  }

  return value;
};

const getOptionalEnv = (key: string, defaultValue: string = ""): string => {
  return typeof window !== "undefined"
    ? (process.env[key] || defaultValue)
    : (process.env[key] || defaultValue);
};

export const env = {
  // API Configuration
  API_URL: getEnv("NEXT_PUBLIC_API_URL", "http://localhost:8080/api/v1"),

  // Mapbox Configuration
  MAPBOX_TOKEN: getEnv("NEXT_PUBLIC_MAPBOX_TOKEN"),

  // Feature Flags (optional)
  ENABLE_ANALYTICS: getOptionalEnv("NEXT_PUBLIC_ENABLE_ANALYTICS", "true") === "true",
  DEBUG_MODE: getOptionalEnv("NEXT_PUBLIC_DEBUG_MODE", "false") === "true",
} as const;

export type Env = typeof env;
