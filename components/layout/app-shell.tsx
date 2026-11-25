"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { MobileDrawer } from "@/components/layout/mobile-drawer";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { cn } from "@/lib/cn";

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpenedAt, setDrawerOpenedAt] = useState<string | null>(null);
  const pathname = usePathname();

  // The drawer only stays open while the route it was opened on is current,
  // so any navigation closes it without needing an effect.
  const mobileOpen = drawerOpenedAt === pathname;
  const openMobile = () => setDrawerOpenedAt(pathname);
  const closeMobile = () => setDrawerOpenedAt(null);

  return (
    <div className="min-h-screen bg-surface">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to content
      </a>

      <Sidebar collapsed={collapsed} />
      {mobileOpen && <MobileDrawer onClose={closeMobile} />}

      <div
        className={cn(
          "flex min-h-screen flex-col transition-[padding] duration-200 ease-out",
          collapsed ? "lg:pl-[76px]" : "lg:pl-[264px]"
        )}
      >
        <Topbar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((value) => !value)}
          onOpenMenu={openMobile}
        />

        <main
          id="main-content"
          className="flex-1 px-6 py-8 sm:px-8 lg:px-12 lg:py-10"
        >
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
