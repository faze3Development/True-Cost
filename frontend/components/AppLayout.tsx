import type { ReactNode } from "react";
import TopNavigation, { type NavLink } from "@/components/TopNavigation";
import Sidebar from "@/components/Sidebar";
import clsx from "clsx";

export interface AppLayoutProps {
  children: ReactNode;
  navLinks?: NavLink[];
  hideSidebar?: boolean;
  noScroll?: boolean;
}

export default function AppLayout({ children, navLinks, hideSidebar = false, noScroll = false }: AppLayoutProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface text-on-surface">
      <TopNavigation navLinks={navLinks} />
      <div className="flex flex-1 overflow-hidden pt-[60px]">
        {!hideSidebar && <Sidebar className="!top-[60px] !h-[calc(100vh-60px)]" />}
        <main 
          className={clsx(
            "flex w-full flex-1 flex-col overflow-hidden relative",
            !hideSidebar && "lg:pl-64",
            !noScroll && "overflow-y-auto"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
