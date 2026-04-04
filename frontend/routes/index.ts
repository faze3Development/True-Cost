/**
 * Routes module - centralized navigation and route management.
 */

export type { Route, RouteType, TopNavRuntimeConfig } from "./navigation";
export type { TopNavPageRule } from "./navigation";

export {
  PUBLIC_ROUTES,
  PROTECTED_ROUTES,
  ADMIN_ROUTES,
  TOP_NAV_LINKS,
  resolveTopNavSetKey,
  getTopNavLinksForPath,
  getAllTopNavCandidates,
  parseTopNavRuntimeConfig,
  createDefaultTopNavRuntimeConfig,
  SIDEBAR_NAV_LINKS,
  getRoutesByType,
  getAccessibleRoutes,
  findRouteByHref,
  isProtectedRoute,
  isAdminRoute,
} from "./navigation";

export {
  canAccessRoute,
  getVisibleNavLinks,
  getVisibleNavLinksForPath,
  getVisibleSidebarLinks,
  buildPropertyUrl,
  buildAnalyticsUrl,
  buildReportsUrl,
} from "./utils";
