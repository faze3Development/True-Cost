"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      // Remember where the user was trying to go, to redirect back after login
      const returnUrl = encodeURIComponent(pathname || "/");
      router.push(`/login?returnUrl=${returnUrl}`);
    }
  }, [user, loading, router, pathname]);

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
