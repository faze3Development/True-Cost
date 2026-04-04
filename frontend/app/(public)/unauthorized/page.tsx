"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { PUBLIC_ROUTES } from "@/routes";

// Get the dashboard/home route (Market Map is the first public route at "/")
const DASHBOARD_ROUTE = PUBLIC_ROUTES[0].href || "/";

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center min-h-screen w-full bg-surface">
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-on-surface">Access Denied</h1>
          <p className="text-lg text-on-surface/70">
            You do not have permission to access this page.
          </p>
        </div>

        <div className="pt-6 space-y-3">
          <button
            onClick={() => {
              // Try to go back; if no history, go to dashboard
              if (window.history.length > 1) {
                router.back();
              } else {
                router.push(DASHBOARD_ROUTE);
              }
            }}
            className="block w-full px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            Go Back
          </button>

          <Link
            href={DASHBOARD_ROUTE}
            className="block w-full px-4 py-2 bg-surface-container text-on-surface rounded-lg hover:bg-surface-container/90 transition-colors font-medium text-center"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
