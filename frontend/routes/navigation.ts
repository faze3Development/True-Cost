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

export interface TopNavPageRule {
  prefix: string;
  set: string;
}

export interface TopNavRuntimeConfig {
  sets: Record<string, Route[]>;
  pageRules: TopNavPageRule[];
}

export const TOP_NAV_CONFIG_STORAGE_KEY = "topNavRuntimeConfig";
export const TOP_NAV_CONFIG_UPDATED_EVENT = "top-nav-config-updated";

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
    href: "/truecost",
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
    href: "/price-index",
    icon: "stacked_line_chart",
    type: "protected",
    description: "Market-wide pricing analysis and institutional delta",
  },
  {
    label: "Portfolio Analytics",
    href: "/reports",
    icon: "description",
    type: "protected",
    description: "Institutional-grade rental data and reports",
  },
  {
    label: "Saved Reports",
    href: "/reports",
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
    label: "Admin Panel",
    href: "/admin",
    icon: "admin_panel_settings",
    type: "admin",
    description: "Navigation and experience configuration workspace",
  },
  {
    label: "Settings",
    href: "/settings",
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
    label: "Portfolio",
    href: "/portfolio",
    type: "public",
  },
  {
    label: "Analytics",
    href: "/price-index",
    type: "public",
  },
  {
    label: "Reporting",
    href: "/reports",
    type: "public",
  },
  {
    label: "Compliance",
    href: "/legal?tab=overview",
    type: "public",
  },
];

export const DEFAULT_TOP_NAV_SETS: Record<string, Route[]> = {
  default: TOP_NAV_LINKS,
  reports: [
    { label: "Market Trends", href: "/price-index", type: "public" },
    { label: "Saved Reports", href: "/reports", type: "protected" },
    { label: "Data Exports", href: "/reports", type: "protected" },
  ],
  savedAssets: [
    { label: "Dashboard", href: "/", type: "public" },
    { label: "Market Overviews", href: "/price-index", type: "protected" },
    { label: "Data Studio", href: "/reports", type: "protected" },
  ],
};

export const DEFAULT_TOP_NAV_PAGE_RULES: TopNavPageRule[] = [
  { prefix: "/reports", set: "reports" },
  { prefix: "/saved-assets", set: "savedAssets" },
  { prefix: "/", set: "default" },
];

const isRouteType = (value: unknown): value is RouteType => {
  return value === "public" || value === "protected" || value === "admin";
};

const isNavLikeObject = (value: unknown): value is { label: string; href: string; type?: RouteType } => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const hasRequired = typeof candidate.label === "string" && typeof candidate.href === "string";
  const hasValidType = candidate.type === undefined || isRouteType(candidate.type);

  return hasRequired && hasValidType;
};

const sanitizeTopNavSetCollection = (value: unknown): Record<string, Route[]> => {
  if (!value || typeof value !== "object") {
    return {};
  }

  const next: Record<string, Route[]> = {};

  for (const [setKey, setValue] of Object.entries(value as Record<string, unknown>)) {
    if (!Array.isArray(setValue)) {
      continue;
    }

    const sanitized = setValue
      .filter(isNavLikeObject)
      .map((link) => ({
        label: link.label,
        href: link.href,
        type: link.type ?? "public",
      }));

    if (sanitized.length > 0) {
      next[setKey] = sanitized;
    }
  }

  return next;
};

const sanitizeTopNavPageRules = (value: unknown): TopNavPageRule[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((rule): rule is TopNavPageRule => {
    if (!rule || typeof rule !== "object") {
      return false;
    }

    const candidate = rule as Record<string, unknown>;
    return typeof candidate.prefix === "string" && typeof candidate.set === "string";
  });
};

const parseTopNavSets = (): Record<string, Route[]> => {
  const raw = process.env.NEXT_PUBLIC_TOP_NAV_SETS_JSON;

  if (!raw) {
    return DEFAULT_TOP_NAV_SETS;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!parsed || typeof parsed !== "object") {
      return DEFAULT_TOP_NAV_SETS;
    }

    const next = sanitizeTopNavSetCollection(parsed);

    if (!next.default) {
      next.default = DEFAULT_TOP_NAV_SETS.default;
    }

    return Object.keys(next).length > 0 ? next : DEFAULT_TOP_NAV_SETS;
  } catch (error) {
    console.warn("Invalid NEXT_PUBLIC_TOP_NAV_SETS_JSON. Falling back to default top nav sets.", error);
    return DEFAULT_TOP_NAV_SETS;
  }
};

const parseTopNavPageRules = (): TopNavPageRule[] => {
  const raw = process.env.NEXT_PUBLIC_TOP_NAV_PAGE_RULES_JSON;

  if (!raw) {
    return DEFAULT_TOP_NAV_PAGE_RULES;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return DEFAULT_TOP_NAV_PAGE_RULES;
    }

    const next = sanitizeTopNavPageRules(parsed);

    return next.length > 0 ? next : DEFAULT_TOP_NAV_PAGE_RULES;
  } catch (error) {
    console.warn("Invalid NEXT_PUBLIC_TOP_NAV_PAGE_RULES_JSON. Falling back to default page rules.", error);
    return DEFAULT_TOP_NAV_PAGE_RULES;
  }
};

export const TOP_NAV_SETS: Record<string, Route[]> = parseTopNavSets();
export const TOP_NAV_PAGE_RULES: TopNavPageRule[] = parseTopNavPageRules();

const mergeTopNavSets = (overrideSets: Record<string, Route[]> | undefined): Record<string, Route[]> => {
  if (!overrideSets) {
    return TOP_NAV_SETS;
  }

  return {
    ...TOP_NAV_SETS,
    ...overrideSets,
  };
};

export const resolveTopNavSetKey = (pathname: string, rules: TopNavPageRule[] = TOP_NAV_PAGE_RULES): string => {
  const matchedRule = rules.find((rule) => pathname.startsWith(rule.prefix));

  return matchedRule?.set ?? "default";
};

export const getTopNavLinksForPath = (
  pathname: string,
  runtimeConfig?: Partial<TopNavRuntimeConfig>
): Route[] => {
  const sets = mergeTopNavSets(runtimeConfig?.sets);
  const rules = runtimeConfig?.pageRules && runtimeConfig.pageRules.length > 0
    ? runtimeConfig.pageRules
    : TOP_NAV_PAGE_RULES;
  const setKey = resolveTopNavSetKey(pathname, rules);

  return sets[setKey] ?? sets.default ?? TOP_NAV_LINKS;
};

export const getAllTopNavCandidates = (): Route[] => {
  const seen = new Set<string>();
  const combined = [...PUBLIC_ROUTES, ...PROTECTED_ROUTES, ...ADMIN_ROUTES, ...SIDEBAR_NAV_LINKS];

  return combined.filter((route) => {
    if (seen.has(route.href)) {
      return false;
    }

    seen.add(route.href);
    return true;
  });
};

export const parseTopNavRuntimeConfig = (raw: string): TopNavRuntimeConfig | null => {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const candidate = parsed as Record<string, unknown>;
    const sets = sanitizeTopNavSetCollection(candidate.sets);
    const pageRules = sanitizeTopNavPageRules(candidate.pageRules);

    if (!sets.default) {
      sets.default = TOP_NAV_SETS.default ?? TOP_NAV_LINKS;
    }

    if (Object.keys(sets).length === 0) {
      return null;
    }

    return {
      sets,
      pageRules: pageRules.length > 0 ? pageRules : TOP_NAV_PAGE_RULES,
    };
  } catch {
    return null;
  }
};

export const createDefaultTopNavRuntimeConfig = (): TopNavRuntimeConfig => ({
  sets: Object.fromEntries(
    Object.entries(TOP_NAV_SETS).map(([key, routes]) => [
      key,
      routes.map((route) => ({ ...route })),
    ])
  ),
  pageRules: TOP_NAV_PAGE_RULES.map((rule) => ({ ...rule })),
});

/**
 * Sidebar navigation links (for protected/dashboard pages).
 */
export const SIDEBAR_NAV_LINKS: Route[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: "dashboard",
    type: "public",
  },
  {
    label: "Price Index",
    href: "/price-index",
    icon: "query_stats",
    type: "protected",
  },
  {
    label: "Saved Assets",
    href: "/saved-assets",
    icon: "bookmark",
    type: "protected",
  },
  {
    label: "Reports",
    href: "/reports",
    icon: "description",
    type: "protected",
  },
  {
    label: "Support",
    href: "/support",
    icon: "contact_support",
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
