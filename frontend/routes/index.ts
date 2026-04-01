/**
 * Routes module - centralized navigation and route management.
 */

export type { Route, RouteType } from "./navigation";

export {
  PUBLIC_ROUTES,
  PROTECTED_ROUTES,
  ADMIN_ROUTES,
  TOP_NAV_LINKS,
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
  getVisibleSidebarLinks,
} from "./utils";
