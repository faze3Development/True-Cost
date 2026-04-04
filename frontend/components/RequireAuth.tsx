"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

interface RequireAuthProps {
  children: React.ReactNode;
  requiredRole?: string; // Optional: enforce specific role (e.g., "admin")
}

export function RequireAuth({ children, requiredRole }: RequireAuthProps) {
  const { user, dbUser, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      // Remember where the user was trying to go, to redirect back after login
      const returnUrl = encodeURIComponent(pathname || "/");
      router.push(`/login?returnUrl=${returnUrl}`);
    }
  }, [user, loading, router, pathname]);

  // Check role if specified
  useEffect(() => {
    if (!loading && user && requiredRole) {
      const userRole = (dbUser?.role || "").toLowerCase();
      const required = requiredRole.toLowerCase();

      if (userRole !== required) {
        router.push("/unauthorized");
      }
    }
  }, [dbUser, loading, user, requiredRole, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-surface">
        <div className="text-on-surface/60 font-medium tracking-widest text-sm uppercase animate-pulse">
          Authenticating...
        </div>
      </div>
    );
  }

  if (!user) {
    // Returning null while redirect is taking place
    return null;
  }

  return <>{children}</>;
}
