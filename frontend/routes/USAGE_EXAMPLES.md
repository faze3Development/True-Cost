/**
 * Example usage of the centralized routes configuration.
 * This demonstrates how to use routes throughout the application.
 */

// ============================================================================
// 1. Using TOP_NAV_LINKS in TopNavigation Component
// ============================================================================
/*
import { TOP_NAV_LINKS, type Route } from "@/routes";
import Link from "next/link";

interface TopNavigationProps {
  currentPath?: string;
  isAuthenticated?: boolean;
  isAdmin?: boolean;
}

export function TopNavigation({
  currentPath = "/",
  isAuthenticated = false,
  isAdmin = false
}: TopNavigationProps) {
  const links = TOP_NAV_LINKS.filter((link) => {
    // Filter routes based on auth status
    if (link.type === "protected") return isAuthenticated;
    if (link.type === "admin") return isAdmin;
    return true; // Always show public routes
  });

  return (
    <nav className="flex gap-6">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={currentPath === link.href ? "active" : ""}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
*/

// ============================================================================
// 2. Using SIDEBAR_NAV_LINKS in Dashboard
// ============================================================================
/*
import { SIDEBAR_NAV_LINKS, getVisibleSidebarLinks } from "@/routes";

interface DashboardSidebarProps {
  isAuthenticated: boolean;
  isAdmin: boolean;
}

export function DashboardSidebar({
  isAuthenticated,
  isAdmin
}: DashboardSidebarProps) {
  const visibleLinks = getVisibleSidebarLinks(isAuthenticated, isAdmin);

  return (
    <aside className="w-64 bg-gray-100">
      <nav className="space-y-1">
        {visibleLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="flex items-center gap-3 px-4 py-2"
          >
            {link.icon && <span className="material-symbols-outlined">{link.icon}</span>}
            <span>{link.label}</span>
          </a>
        ))}
      </nav>
    </aside>
  );
}
*/

// ============================================================================
// 3. Route Protection Middleware
// ============================================================================
/*
import { isProtectedRoute, isAdminRoute } from "@/routes";
import { redirect } from "next/navigation";

export async function protectRoute(
  pathname: string,
  isAuthenticated: boolean,
  isAdmin: boolean
) {
  if (isAdminRoute(pathname) && !isAdmin) {
    redirect("/unauthorized");
  }

  if (isProtectedRoute(pathname) && !isAuthenticated) {
    redirect("/login");
  }
}
*/

// ============================================================================
// 4. Finding Routes Dynamically
// ============================================================================
/*
import { findRouteByHref, getAccessibleRoutes } from "@/routes";

function getPageTitle(pathname: string): string {
  const route = findRouteByHref(pathname);
  return route?.label || "Page Not Found";
}

function getAvailablePagesForUser(isAuthenticated: boolean, isAdmin: boolean) {
  return getAccessibleRoutes(isAuthenticated, isAdmin);
}
*/

// ============================================================================
// 5. Navigation Configuration in Page Components
// ============================================================================
/*
import { TOP_NAV_LINKS } from "@/routes";

export default function HomePage() {
  const navLinks = TOP_NAV_LINKS.map((link) => ({
    label: link.label,
    href: link.href,
    active: true,
  }));

  return (
    <div>
      <TopNavigation navLinks={navLinks} />
      {/* page content */}
    </div>
  );
}
*/

// ============================================================================
// 6. Adding New Routes
// ============================================================================
/*
To add a new route:

1. Update navigation.ts:
   - Add to PUBLIC_ROUTES, PROTECTED_ROUTES, or ADMIN_ROUTES
   - Include label, href, icon, type, and description

Example:
  {
    label: "Analytics Dashboard",
    href: "/pages/analytics",
    icon: "analytics",
    type: "protected",
    description: "View analytics and insights",
  }

2. Create the page component at: frontend/app/pages/analytics.tsx

3. Use in components:
   const links = TOP_NAV_LINKS; // Automatically includes your route
*/

export {}; // Makes this a module
