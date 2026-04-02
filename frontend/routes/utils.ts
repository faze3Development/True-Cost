/**
 * Route utilities and helpers for navigation and authorization.
 */

import {
  SIDEBAR_NAV_LINKS,
  getTopNavLinksForPath,
  type TopNavRuntimeConfig,
  isProtectedRoute,
  isAdminRoute,
} from "./navigation";

/**
 * Check if user can access a route.
 */
export const canAccessRoute = (
  href: string,
  isAuthenticated: boolean = false,
  isAdmin: boolean = false
): boolean => {
  if (!isProtectedRoute(href) && !isAdminRoute(href)) {
    return true; // Public route
  }

  if (isAdminRoute(href)) {
    return isAdmin;
  }

  if (isProtectedRoute(href)) {
    return isAuthenticated;
  }

  return false;
};

/**
 * Get filtered navigation links based on user auth status.
 */
export const getVisibleNavLinks = (
  isAuthenticated: boolean = false,
  isAdmin: boolean = false,
  runtimeConfig?: Partial<TopNavRuntimeConfig>
) => {
  return getVisibleNavLinksForPath("/", isAuthenticated, isAdmin, runtimeConfig);
};

/**
 * Get filtered top navigation links for a specific pathname.
 */
export const getVisibleNavLinksForPath = (
  pathname: string,
  isAuthenticated: boolean = false,
  isAdmin: boolean = false,
  runtimeConfig?: Partial<TopNavRuntimeConfig>
) => {
  const links = getTopNavLinksForPath(pathname, runtimeConfig);

  return links.filter((link) =>
    canAccessRoute(link.href, isAuthenticated, isAdmin)
  );
};

/**
 * Get filtered sidebar links based on user auth status.
 */
export const getVisibleSidebarLinks = (
  isAuthenticated: boolean = false,
  isAdmin: boolean = false
) => {
  return SIDEBAR_NAV_LINKS.filter((link) =>
    canAccessRoute(link.href, isAuthenticated, isAdmin)
  );
};

/**
 * Build URL for a property detail page.
 * Centralizes property navigation logic to prevent URL format inconsistencies.
 * @param propertyId - The property ID to navigate to
 * @returns The property detail page URL
 */
export const buildPropertyUrl = (propertyId: string | number): string => {
  return `/property/${propertyId}`;
};

/**
 * Build URL for analytics page with optional property filter.
 * @param propertyId - Optional property ID to filter analytics
 * @returns The analytics page URL
 */
export const buildAnalyticsUrl = (propertyId?: string | number): string => {
  if (propertyId) {
    return `/analytics?propertyId=${propertyId}`;
  }
  return `/analytics`;
};

/**
 * Build URL for reports page.
 * @returns The reports page URL
 */
export const buildReportsUrl = (): string => {
  return `/reports`;
};
