"use client";

import Link from "next/link";
import clsx from "clsx";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebounce } from "@/hooks/useDebounce";
import {
  TOP_NAV_CONFIG_STORAGE_KEY,
  TOP_NAV_CONFIG_UPDATED_EVENT,
  getVisibleNavLinksForPath,
  parseTopNavRuntimeConfig,
  type TopNavRuntimeConfig,
} from "@/routes";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { env } from "@/lib/env";

export interface NavLink {
  label: string;
  href: string;
  active?: boolean;
}

export interface TopNavigationProps {
  navLinks?: NavLink[];
}

export default function TopNavigation({ navLinks }: TopNavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams?.get("q") ?? "";

  const [runtimeConfig, setRuntimeConfig] = useState<TopNavRuntimeConfig | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const debouncedQuery = useDebounce(searchQuery, 400);

  useEffect(() => {
    setSearchQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (debouncedQuery !== initialQuery) {
      const params = new URLSearchParams(searchParams?.toString());
      if (debouncedQuery) {
        params.set("q", debouncedQuery);
      } else {
        params.delete("q");
      }
      
      // If we are not on the map page, navigate to it to show the search results.
      // Assuming Market Map is the root page '/'.
      const targetPath = pathname === "/" ? `/?${params.toString()}` : `/?${params.toString()}`;
      router.push(targetPath);
    }
  }, [debouncedQuery, initialQuery, pathname, router, searchParams]);

  useEffect(() => {
    const loadRuntimeConfig = () => {
      if (typeof window === "undefined") {
        return;
      }

      const raw = window.localStorage.getItem(TOP_NAV_CONFIG_STORAGE_KEY);
      if (!raw) {
        setRuntimeConfig(null);
        return;
      }

      setRuntimeConfig(parseTopNavRuntimeConfig(raw));
    };

    const onConfigUpdate = () => loadRuntimeConfig();
    const onStorage = (event: StorageEvent) => {
      if (event.key === TOP_NAV_CONFIG_STORAGE_KEY) {
        loadRuntimeConfig();
      }
    };

    loadRuntimeConfig();
    window.addEventListener(TOP_NAV_CONFIG_UPDATED_EVENT, onConfigUpdate);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(TOP_NAV_CONFIG_UPDATED_EVENT, onConfigUpdate);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const links: NavLink[] = useMemo(() => {
    const base = navLinks ?? getVisibleNavLinksForPath(pathname ?? "/", true, true, runtimeConfig ?? undefined);

    return base.map((link) => {
      const isActive =
        "active" in link && typeof link.active === "boolean"
          ? link.active
          : pathname
            ? pathname === link.href || pathname.startsWith(`${link.href}/`)
            : false;

      return { ...link, active: isActive };
    });
  }, [navLinks, pathname, runtimeConfig]);

  // Theme support
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { user: authUser, dbUser, updateUserSetting } = useAuth();

  return (
    <header className="fixed top-0 z-50 w-full bg-surface/80 backdrop-blur-xl shadow-ambient">
      <div className="mx-auto flex w-full max-w-[1920px] items-center justify-between px-6 py-3">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-6 md:flex">
            {links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={clsx(
                  "text-sm font-semibold tracking-tight transition-colors",
                  link.active ? "text-secondary" : "text-on-surface-variant hover:text-on-surface"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-surface/70 px-3 py-2 backdrop-blur-sm rounded-xl ghost-border shadow-ambient">
            <span className="material-symbols-outlined text-on-surface-variant text-sm" aria-hidden>
              search
            </span>
            <input
              className="bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none"
              placeholder="Search location..."
              type="text"
              aria-label="Search location"
              value={searchQuery}
              onChange={(e) => {
                // Strict client-side validation: Only allow alphanumeric chars, spaces, commas, and hyphens.
                // This physically prevents dropping SQL keywords/symbols into the URL or sending them.
                const sanitized = e.target.value.replace(/[^a-zA-Z0-9\s,\-]/g, '');
                setSearchQuery(sanitized);
              }}
            />
          </div>
          <button
            type="button"
            className="rounded-lg bg-surface-container-low px-2 py-2 text-on-surface-variant transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            aria-label="Notifications"
          >
            <span className="material-symbols-outlined text-xl" aria-hidden>
              notifications
            </span>
          </button>
          
          <button
            type="button"
            onClick={() => {
              const newTheme = theme === 'dark' ? 'light' : 'dark';
              setTheme(newTheme);
              if (authUser) {
                updateUserSetting("theme", newTheme).catch((err) =>
                  console.warn("Failed to persist theme setting", err)
                );
              }
            }}
            className="rounded-lg bg-surface-container-low px-2 py-2 text-on-surface-variant transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            aria-label="Toggle Dark Mode"
          >
            <span className="material-symbols-outlined text-xl" aria-hidden>
              {mounted && theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
          <button
            type="button"
            className="rounded-lg bg-surface-container-low px-2 py-2 text-on-surface-variant transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            aria-label="Saved"
          >
            <span className="material-symbols-outlined text-xl" aria-hidden>
              bookmark
            </span>
          </button>
          <div className="h-9 w-9 overflow-hidden rounded-xl bg-surface-container ghost-border">
            <img
              src={authUser?.photoURL || dbUser?.avatar_url || env.DEFAULT_AVATAR_URL}
              alt={authUser?.displayName || dbUser?.display_name || "Profile"}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
