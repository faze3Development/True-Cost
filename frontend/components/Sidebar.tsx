"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { SIDEBAR_NAV_LINKS, type Route } from "@/routes";

export interface SidebarProps {
  links?: Route[];
  className?: string;
}

export default function Sidebar({ links = SIDEBAR_NAV_LINKS, className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={clsx("fixed left-0 top-0 z-40 hidden h-screen w-64 flex-shrink-0 flex-col bg-surface-container-low px-4 py-6 lg:flex", className)}>
      {/* Sidebar Header */}
      <div className="mb-8 px-2 space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
          Institutional Panel
        </p>
        <p className="text-sm font-semibold text-on-surface">Verified Rental Data</p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1" aria-label="Sidebar navigation">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={clsx(
              // Base layout
              "group relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left",
              // Typography
              "text-xs font-bold uppercase tracking-widest",
              // Transitions
              "transition-all duration-200",
              pathname === link.href
                ? [
                    // Active: tinted fill + emerald text
                    "bg-surface-container-high text-secondary",
                    "shadow-ambient",
                  ]
                : [
                    // Inactive: subtle hover
                    "text-on-surface-variant",
                    "hover:bg-surface-container hover:text-on-surface",
                    "hover:translate-x-0.5",
                  ]
            )}
            aria-current={pathname === link.href ? "page" : undefined}
          >
            {/* Active left accent bar */}
            {pathname === link.href && (
              <span
                className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-secondary"
                aria-hidden="true"
              />
            )}

            {/* Icon */}
            {link.icon && (
              <span
                className={clsx(
                  "material-symbols-outlined shrink-0 text-[20px] leading-none",
                  pathname === link.href
                    ? "text-secondary"
                    : "text-on-surface-variant group-hover:text-on-surface"
                )}
                aria-hidden="true"
              >
                {link.icon}
              </span>
            )}

            <span className="truncate">{link.label}</span>
          </Link>
        ))}
      </nav>

      {/* Bottom CTA */}
      <div className="mt-auto space-y-1 pt-8">
        <Link
          href="/settings"
          className="group flex items-center px-4 py-3 text-on-surface-variant hover:bg-surface-container-high transition-all rounded-xl text-xs font-bold uppercase tracking-widest hover:text-on-surface hover:translate-x-0.5 duration-200"
        >
          <span className="material-symbols-outlined shrink-0 text-[20px] leading-none mr-3" aria-hidden="true">
            settings
          </span>
          Settings
        </Link>
        <Link
          href="/login"
          className="group flex items-center px-4 py-3 text-on-surface-variant hover:bg-surface-container-high transition-all rounded-xl text-xs font-bold uppercase tracking-widest hover:text-on-surface hover:translate-x-0.5 duration-200"
        >
          <span className="material-symbols-outlined shrink-0 text-[20px] leading-none mr-3" aria-hidden="true">
            logout
          </span>
          Sign Out
        </Link>
      </div>
    </aside>
  );
}
