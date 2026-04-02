import { env } from "@/lib/env";

const PUBLIC_API_PATTERNS: RegExp[] = [
  /^\/properties(?:\?|$)/i,
  /^\/properties\/[^/]+$/i,
  /^\/health(?:\?|$)/i,
];

const PROTECTED_API_PATTERNS: RegExp[] = [
  /^\/properties\/[^/]+\/units(?:\?|$)/i,
  /^\/units\/[^/]+\/history(?:\?|$)/i,
  /^\/users(?:\/|\?|$)/i,
  /^\/admin(?:\/|\?|$)/i,
];

export const normalizeApiPath = (rawUrl?: string): string => {
  if (!rawUrl) return "";

  // Handles relative urls (`/properties`) and absolute urls (`http://.../api/v1/properties`).
  const path = rawUrl.startsWith("http")
    ? new URL(rawUrl).pathname
    : rawUrl.split("?")[0];

  const apiPrefix = "/api/v1";
  return path.startsWith(apiPrefix) ? path.slice(apiPrefix.length) : path;
};

export const isPublicApiPath = (path: string): boolean => {
  return PUBLIC_API_PATTERNS.some((pattern) => pattern.test(path));
};

export const isProtectedApiPath = (path: string): boolean => {
  return PROTECTED_API_PATTERNS.some((pattern) => pattern.test(path));
};

export const requiresAuthForPath = (path: string): boolean => {
  if (!path) return false;
  if (isProtectedApiPath(path)) return true;
  if (isPublicApiPath(path)) return false;

  // Unknown endpoints default to requiring auth as a safe fallback.
  return true;
};

export const allowMockToken = (): boolean => {
  // Only allow mock auth in debug/dev mode when explicitly enabled.
  return env.DEBUG_MODE && env.ALLOW_MOCK_TOKEN;
};
