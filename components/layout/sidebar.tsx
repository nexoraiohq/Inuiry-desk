"use client";

import { BrandMark, BrandName } from "@/components/brand";
import { NavList } from "@/components/layout/nav-list";
import { cn } from "@/lib/cn";

type SidebarProps = {
  collapsed: boolean;
};

export function Sidebar({ collapsed }: SidebarProps) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden flex-col overflow-hidden border-r border-line bg-white transition-[width] duration-200 ease-out lg:flex",
        collapsed ? "w-[76px]" : "w-[264px]"
      )}
    >
      <div className="flex h-[72px] shrink-0 items-center gap-3 border-b border-line px-5">
        <BrandMark />
        {!collapsed && <BrandName />}
        {collapsed && <span className="sr-only">Inquiry Desk</span>}
      </div>

      <nav aria-label="Main" className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <NavList collapsed={collapsed} />
      </nav>

      <div className="shrink-0 border-t border-line px-5 py-4">
        {!collapsed && (
          <p className="text-[11px] leading-relaxed text-subtle">
            Phase 1 · Foundation preview
          </p>
        )}
      </div>
    </aside>
  );
}
