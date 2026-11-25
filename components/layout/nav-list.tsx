"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/cn";

type NavListProps = {
  /** Collapsed sidebars hide labels and centre the icons instead. */
  collapsed?: boolean;
  /** Called after a link is activated (used to close the mobile drawer). */
  onNavigate?: () => void;
};

export function NavList({ collapsed = false, onNavigate }: NavListProps) {
  const pathname = usePathname();

  return (
    <ul className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;

        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              className={cn(
                "group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors",
                collapsed && "justify-center px-0",
                isActive
                  ? "bg-surface text-ink"
                  : "text-muted hover:bg-surface hover:text-ink"
              )}
            >
              <item.icon
                className={cn(
                  "size-[18px] shrink-0",
                  isActive ? "text-brand" : "text-subtle group-hover:text-ink"
                )}
                aria-hidden="true"
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {collapsed && <span className="sr-only">{item.label}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
