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
  TOP_NAV_SETS,
  TOP_NAV_PAGE_RULES,
  TOP_NAV_CONFIG_STORAGE_KEY,
  TOP_NAV_CONFIG_UPDATED_EVENT,
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
} from "./utils";
