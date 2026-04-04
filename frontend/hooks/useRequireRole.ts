"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Hook to enforce role-based access on protected pages.
 * Redirects to /unauthorized if user doesn't have the required role.
 * Use in any page component for per-page role enforcement.
 *
 * @param requiredRole - The role required to access this page (e.g., "admin")
 * @returns isLoading - Whether auth is still loading; show spinner while true
 *
 * @example
 * export default function AdminPage() {
 *   const isLoading = useRequireRole("admin");
 *   if (isLoading) return <div>Loading...</div>;
 *   return <div>Admin content</div>;
 * }
 */
export function useRequireRole(requiredRole: string) {
  const { dbUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && dbUser) {
      const userRole = (dbUser.role || "").toLowerCase();
      const required = requiredRole.toLowerCase();

      if (userRole !== required) {
        router.push("/unauthorized");
      }
    }
  }, [dbUser, loading, requiredRole, router]);

  // Return loading state so page can show spinner while checking
  return loading;
}
