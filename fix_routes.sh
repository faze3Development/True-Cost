#!/bin/bash

# Fix settings.tsx
sed -i 's|href: "/settings"|href: "/pages/settings"|g' frontend/app/pages/settings.tsx
sed -i 's|href: "/analytics"|href: "/pages/analytics"|g' frontend/app/pages/settings.tsx

# Fix analytics.tsx  
sed -i 's|href: "/settings"|href: "/pages/settings"|g' frontend/app/pages/analytics.tsx

# Fix reports.tsx
sed -i 's|href: "/settings"|href: "/pages/settings"|g' frontend/app/pages/reports.tsx
sed -i 's|href: "#"|href: "/pages/price-index"|g' frontend/app/pages/reports.tsx

# Fix price-index.tsx
sed -i 's|href: "/pages/price-index/\${property.id}"|href: `/pages/price-index/${property.id}`|g' frontend/app/pages/price-index.tsx

echo "Routes fixed!"
