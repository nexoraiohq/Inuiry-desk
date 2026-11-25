"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, type NavItem } from "@/lib/navigation";
import { cn } from "@/lib/cn";

type NavListProps = {
  /** Collapsed sidebars hide labels and centre the icons instead. */
  collapsed?: boolean;
  /** Called after a link is activated (used to close the mobile drawer). */
  onNavigate?: () => void;
  /** Dark treatment for the new slate sidebar. */
  dark?: boolean;
  /** Called when a link is hovered — used to open the collapsed sidebar flyout. */
  onHover?: () => void;
};

const GROUPS: { label: string; items: NavItem[] }[] = [
  { label: "Workspace", items: NAV_ITEMS.slice(0, 3) },
  { label: "Insights", items: NAV_ITEMS.slice(3, 4) },
  { label: "Account", items: NAV_ITEMS.slice(4) },
];

export function NavList({
  collapsed = false,
  onNavigate,
  dark = false,
  onHover,
}: NavListProps) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      {GROUPS.map((group) => (
        <div key={group.label}>
          {!collapsed && (
            <p
              className={cn(
                "eyebrow mb-2 px-3",
                dark ? "text-white/40" : "text-subtle"
              )}
            >
              {group.label}
            </p>
          )}
          <ul className="space-y-1">
            {group.items.map((item) => {
              const isActive = pathname === item.href;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    onMouseEnter={onHover}
                    aria-current={isActive ? "page" : undefined}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "group flex h-10 items-center gap-3 rounded-xl px-3 text-[13px] font-semibold transition-colors",
                      collapsed && "justify-center px-0",
                      dark
                        ? isActive
                          ? "bg-white/10 text-white"
                          : "text-white/60 hover:bg-white/5 hover:text-white"
                        : isActive
                          ? "bg-brand-soft text-brand"
                          : "text-muted hover:bg-surface hover:text-ink"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "size-[18px] shrink-0",
                        dark
                          ? isActive
                            ? "text-white"
                            : "text-white/50 group-hover:text-white"
                          : isActive
                            ? "text-brand"
                            : "text-subtle group-hover:text-ink"
                      )}
                      aria-hidden="true"
                    />
                    {!collapsed && (
                      <span className="nav-reveal truncate">{item.label}</span>
                    )}
                    {collapsed && <span className="sr-only">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
