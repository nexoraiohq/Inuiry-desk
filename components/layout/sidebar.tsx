"use client";

import { useState } from "react";
import { BrandMark, BrandName } from "@/components/brand";
import { NavList } from "@/components/layout/nav-list";
import { useWorkspaceSettings } from "@/components/settings/workspace-settings-provider";
import { cn } from "@/lib/cn";

type SidebarProps = {
  collapsed: boolean;
};

export function Sidebar({ collapsed }: SidebarProps) {
  const { settings } = useWorkspaceSettings();
  // Keyed to the collapsed value it started from, so a manual toggle can
  // never leave a stale flyout open.
  const [hover, setHover] = useState<{ collapsed: boolean; active: boolean } | null>(
    null
  );

  const flyout = hover?.active === true && hover.collapsed === collapsed;
  const expanded = !collapsed || flyout;
  const openFlyout = () => {
    if (collapsed) setHover({ collapsed, active: true });
  };

  return (
    <aside
      onMouseLeave={() => setHover(null)}
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden flex-col overflow-hidden border-r border-white/5 bg-[#111827] transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:flex",
        expanded ? "w-[264px]" : "w-[80px]",
        flyout && "shadow-raised"
      )}
    >
      <div
        onMouseEnter={openFlyout}
        className="flex h-16 shrink-0 items-center gap-3 border-b border-white/5 px-5"
      >
        <BrandMark />
        {expanded ? (
          <span className="nav-reveal">
            <BrandName inverted className="text-[15px] font-bold" />
          </span>
        ) : (
          <span className="sr-only">Inquiry Desk</span>
        )}
      </div>

      <nav
        aria-label="Main"
        onMouseEnter={openFlyout}
        className="sidebar-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-6"
      >
        <NavList collapsed={!expanded} dark onHover={openFlyout} />
      </nav>

      <div className="shrink-0 border-t border-white/5 p-4">
        {expanded ? (
          <div className="nav-reveal rounded-xl border border-white/5 bg-white/5 p-3">
            <div className="flex items-center gap-2.5">
              {settings?.profile.logoUrl ? (
                <span
                  className="size-9 shrink-0 rounded-lg bg-cover bg-center ring-1 ring-white/10"
                  style={{ backgroundImage: `url("${settings.profile.logoUrl}")` }}
                  role="img"
                  aria-label={`${settings.businessName} logo`}
                />
              ) : (
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand text-[12px] font-semibold text-white">
                  {settings?.businessName?.charAt(0).toUpperCase() ?? "I"}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold text-white/85">
                  {settings?.businessName ?? "Your workspace"}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-white/45">
                  {settings?.profile.industry || "Inquiry Desk"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto grid size-9 place-items-center rounded-lg bg-white/5">
            <span className="size-2 rounded-full bg-brand" aria-hidden="true" />
          </div>
        )}
      </div>
    </aside>
  );
}
