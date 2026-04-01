"use client";

import Link from "next/link";
import clsx from "clsx";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";

export interface NavLink {
  label: string;
  href: string;
  active?: boolean;
}

export interface TopNavigationProps {
  navLinks?: NavLink[];
}

export default function TopNavigation({ navLinks }: TopNavigationProps) {
  const links: NavLink[] =
    navLinks ?? [
      { label: "Market Map", href: "#", active: true },
      { label: "Property Insights", href: "#" },
      { label: "Cost Calculator", href: "#" },
    ];

  // Theme support
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
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
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuB_wbp8BFKeErTljlaO1jj9wyt3Nd6A4Y0tA5_clRlCbUI4SQ46-uYqgnazJ3erROnMfcodm-nLYyavKGnR3NaqbR8kuhzrqSMvIVy8LzVvfbf0OOaApPsB_eeieMGu9KPFKLh9Kb303BeyEDXHRGrTeGLVSobFKlhPY-1MNmbSeBAkFogyU79QVNNPhej4S-JaWA_RMLkJu4uDd69cSOuwFknq0tvYAnWZgcfVaAaW6HrQ0t5vfUTT--W1EjUHXJAok4Nqj08Cl4ou"
              alt="Profile"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
