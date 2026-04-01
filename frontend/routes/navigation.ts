/**
 * Centralized navigation and routes configuration.
 * Supports public and protected routes with metadata.
 */

export type RouteType = "public" | "protected" | "admin";

export interface Route {
  label: string;
  href: string;
  icon?: string;
  type: RouteType;
  description?: string;
  children?: Route[];
}

/**
 * Public routes accessible to all users.
 */
export const PUBLIC_ROUTES: Route[] = [
  {
    label: "Market Map",
    href: "/",
    icon: "map",
    type: "public",
    description: "Interactive property map and market overview",
  },
  {
    label: "Property Insights",
    href: "/property-insights",
    icon: "analytics",
    type: "public",
    description: "Deep dive analytics for individual properties",
  },
  {
    label: "Cost Calculator",
    href: "/pages/truecost",
    icon: "calculate",
    type: "public",
    description: "True monthly cost calculator with fee breakdown",
  },
];

/**
 * Protected routes that require authentication.
 */
export const PROTECTED_ROUTES: Route[] = [
  {
    label: "Price Index",
    href: "/pages/price-index",
    icon: "stacked_line_chart",
    type: "protected",
    description: "Market-wide pricing analysis and institutional delta",
  },
  {
    label: "Portfolio Analytics",
    href: "/pages/reports",
    icon: "description",
    type: "protected",
    description: "Institutional-grade rental data and reports",
  },
  {
    label: "Saved Reports",
    href: "/pages/reports",
    icon: "bookmark",
    type: "protected",
    description: "Your saved property reports and analysis",
  },
];

/**
 * Admin routes (super user access only).
 */
export const ADMIN_ROUTES: Route[] = [
  {
    label: "Settings",
    href: "/pages/settings",
    icon: "settings",
    type: "admin",
    description: "Account and application settings",
  },
];

/**
 * Top navigation links (public pages visible in header).
 */
export const TOP_NAV_LINKS: Route[] = [
  {
    label: "Market Map",
    href: "/",
    type: "public",
  },
  {
    label: "Property Insights",
    href: "/property-insights",
    type: "public",
  },
  {
    label: "Cost Calculator",
    href: "/pages/truecost",
    type: "public",
  },
  {
    label: "Settings",
    href: "/pages/settings",
    type: "admin",
  },
];

/**
 * Sidebar navigation links (for protected/dashboard pages).
 */
export const SIDEBAR_NAV_LINKS: Route[] = [
  {
    label: "Map Search",
    href: "/",
    icon: "map",
    type: "public",
  },
  {
    label: "Price Index",
    href: "/pages/price-index",
    icon: "stacked_line_chart",
    type: "protected",
  },
  {
    label: "Saved Assets",
    href: "/pages/saved-assets",
    icon: "bookmark",
    type: "protected",
  },
  {
    label: "Reports",
    href: "/pages/reports",
    icon: "description",
    type: "protected",
  },
];

/**
 * Get all routes by type.
 */
export const getRoutesByType = (type: RouteType): Route[] => {
  switch (type) {
    case "public":
      return PUBLIC_ROUTES;
    case "protected":
      return PROTECTED_ROUTES;
    case "admin":
      return ADMIN_ROUTES;
    default:
      return [];
  }
};

/**
 * Get all accessible routes for a user.
 * @param isAuthenticated - Whether the user is authenticated
 * @param isAdmin - Whether the user has admin privileges
 */
export const getAccessibleRoutes = (
  isAuthenticated: boolean = false,
  isAdmin: boolean = false
): Route[] => {
  let routes = [...PUBLIC_ROUTES];

  if (isAuthenticated) {
    routes = [...routes, ...PROTECTED_ROUTES];
  }

  if (isAdmin) {
    routes = [...routes, ...ADMIN_ROUTES];
  }

  return routes;
};

/**
 * Find a route by href.
 */
export const findRouteByHref = (href: string): Route | undefined => {
  const allRoutes = [
    ...PUBLIC_ROUTES,
    ...PROTECTED_ROUTES,
    ...ADMIN_ROUTES,
  ];
  return allRoutes.find((route) => route.href === href);
};

/**
 * Check if a route is protected.
 */
export const isProtectedRoute = (href: string): boolean => {
  return PROTECTED_ROUTES.some((route) => route.href === href);
};

/**
 * Check if a route is admin-only.
 */
export const isAdminRoute = (href: string): boolean => {
  return ADMIN_ROUTES.some((route) => route.href === href);
};
