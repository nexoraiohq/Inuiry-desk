"use client";

import { usePathname } from "next/navigation";
import { Menu, PanelLeft } from "lucide-react";
import { HeaderActions } from "@/components/layout/header-actions";
import { getNavSection } from "@/lib/navigation";

type TopbarProps = {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenMenu: () => void;
};

export function Topbar({ collapsed, onToggleCollapse, onOpenMenu }: TopbarProps) {
  const pathname = usePathname();
  const section = getNavSection(pathname);
  return (
    <header className="sticky top-0 z-30 flex h-20 shrink-0 items-center gap-3 border-b border-line/80 bg-canvas px-5 sm:gap-4 lg:px-10">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open navigation"
        className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink lg:hidden"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={onToggleCollapse}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-expanded={!collapsed}
        className="hidden size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink lg:grid"
      >
        <PanelLeft className="size-[18px]" aria-hidden="true" />
      </button>

      {/* The page title lives in the content heading — no duplicate here. */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-[14px] font-semibold tracking-[-0.01em] text-ink sm:text-[15px] lg:hidden">
          Inquiry Desk
        </p>
        <p className="hidden truncate text-[12px] font-medium tracking-wide text-subtle lg:block">
          Workspace <span className="mx-2 text-line">/</span> <span className="text-ink">{section}</span>
        </p>
      </div>

      <HeaderActions />
    </header>
  );
}
