/**
 * Route utilities and helpers for navigation and authorization.
 */

import { TOP_NAV_LINKS, SIDEBAR_NAV_LINKS, isProtectedRoute, isAdminRoute } from "./navigation";

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
  isAdmin: boolean = false
) => {
  return TOP_NAV_LINKS.filter((link) =>
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
