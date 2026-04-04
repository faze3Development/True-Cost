# Routes Module Documentation

Centralized navigation and route management for The Editorial Ledger frontend.

## Structure

```
frontend/routes/
├── index.ts              # Main exports
├── navigation.ts         # Route definitions and utilities
├── utils.ts              # Helper functions for route access control
└── USAGE_EXAMPLES.md     # Code examples and patterns
```

## Route Types

Routes are categorized by access level:

- **public** - Accessible to all users (no authentication required)
- **protected** - Requires user authentication
- **admin** - Requires admin privileges

## Route Collections

### PUBLIC_ROUTES
Available to all users without authentication:
- Market Map
- Cost Calculator

### PROTECTED_ROUTES
Require authentication:
- Market Analysis
- Alerts
- Portfolio Analytics
- Saved Reports

### ADMIN_ROUTES
Require admin access:
- Admin Panel
- Management
- Settings

### TOP_NAV_LINKS
Navigation links displayed in the header (public pages only).

### SIDEBAR_NAV_LINKS
Sidebar navigation for dashboard and authenticated areas.

## Key Functions

### `getAccessibleRoutes(isAuthenticated, isAdmin)`
Get all routes accessible by a user based on their auth status.

```typescript
const routes = getAccessibleRoutes(true, false); // authenticated user
```

### `canAccessRoute(href, isAuthenticated, isAdmin)`
Check if a user can access a specific route.

```typescript
const canAccess = canAccessRoute("/reports", true, false);
```

### `isProtectedRoute(href)`
Check if a route requires authentication.

```typescript
if (isProtectedRoute("/reports")) {
  // Handle protected route logic
}
```

### `isAdminRoute(href)`
Check if a route requires admin access.

```typescript
if (isAdminRoute("/settings")) {
  // Handle admin-only logic
}
```

### `getVisibleNavLinks(isAuthenticated, isAdmin)`
Get filtered top navigation links based on user auth.

```typescript
const navLinks = getVisibleNavLinks(isAuthenticated, isAdmin);
```

### `getVisibleNavLinksForPath(pathname, isAuthenticated, isAdmin)`
Get filtered top navigation links for a specific pathname.

```typescript
const navLinks = getVisibleNavLinksForPath("/reports", true, false);
```

### Runtime Admin Overrides (DB-Driven)
Top navigation is configured at runtime from user profile settings in the database.
Admins can manage top navigation from the Settings page.

- Editor UI: `Settings -> Top Nav Layout Manager`
- Persistence: `users.me.settings.top_nav_config` (database)
- Saved payload shape:

```json
{
  "sets": {
    "default": [{ "label": "Market Map", "href": "/", "type": "public" }]
  },
  "pageRules": [{ "prefix": "/", "set": "default" }]
}
```

Runtime overrides take precedence in the header. Typed route defaults remain the fallback.

Example runtime payload:

```json
{
  "default": [
    { "label": "Market Map", "href": "/", "type": "public" },
    { "label": "Settings", "href": "/settings", "type": "admin" }
  ],
  "reports": [
    { "label": "Market Trends", "href": "/price-index", "type": "public" },
    { "label": "Saved Reports", "href": "/reports", "type": "protected" }
  ]
}
```

Example page rules:

```json
[
  { "prefix": "/reports", "set": "reports" },
  { "prefix": "/", "set": "default" }
]
```

### `getVisibleSidebarLinks(isAuthenticated, isAdmin)`
Get filtered sidebar links based on user auth.

```typescript
const sidebarLinks = getVisibleSidebarLinks(isAuthenticated, isAdmin);
```

## Usage Patterns

### In Components
```typescript
import { TOP_NAV_LINKS, getVisibleNavLinks } from "@/routes";

export function Navigation({ isAuthenticated }: { isAuthenticated: boolean }) {
  const links = getVisibleNavLinks(isAuthenticated, false);

  return (
    <nav>
      {links.map((link) => (
        <a key={link.href} href={link.href}>
          {link.label}
        </a>
      ))}
    </nav>
  );
}
```

### In Middleware/Guards
```typescript
import { isProtectedRoute } from "@/routes";

function checkRouteAccess(pathname: string, isAuthenticated: boolean) {
  if (isProtectedRoute(pathname) && !isAuthenticated) {
    return redirect("/login");
  }
}
```

### Adding New Routes
1. Define the route in `navigation.ts`
2. Add to appropriate collection (PUBLIC_ROUTES, PROTECTED_ROUTES, or ADMIN_ROUTES)
3. Create the page component at `frontend/app/(public|protected|...)/[name]/page.tsx`
4. Use in components via imports from `@/routes`

## Example Route Definition

```typescript
{
  label: "New Feature",
  href: "/new-feature",
  icon: "star",
  type: "protected",
  description: "Description of the feature",
}
```

## Future Enhancements

- [ ] Breadcrumb generation from routes
- [ ] Dynamic route metadata (SEO)
- [ ] Route-based permission checking
- [ ] Nested routes support
- [ ] Route analytics tracking
