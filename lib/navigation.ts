import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarClock,
  Inbox,
  LayoutDashboard,
  Settings,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

/**
 * Single source of truth for primary navigation. The sidebar renders these
 * entries, and every route derives its document + header metadata from them.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Overview",
    title: "Overview",
    description: "Where every potential customer stands, at a glance.",
    icon: LayoutDashboard,
  },
  {
    href: "/inquiries",
    label: "Inquiries",
    title: "Inquiries",
    description: "Capture, organize and track every customer inquiry.",
    icon: Inbox,
  },
  {
    href: "/follow-ups",
    label: "Follow-ups",
    title: "Follow-ups",
    description: "Keep every potential customer moving forward.",
    icon: CalendarClock,
  },
  {
    href: "/reports",
    label: "Reports",
    title: "Reports",
    description: "Response times and follow-up performance, at a glance.",
    icon: BarChart3,
  },
  {
    href: "/settings",
    label: "Settings",
    title: "Settings",
    description: "Workspace preferences and account configuration.",
    icon: Settings,
  },
];

/** Section label shown in the header breadcrumb for the active route. */
export function getNavSection(pathname: string): string {
  const item = getNavItem(pathname);
  if (item.href === "/reports") return "Insights";
  if (item.href === "/settings") return "Account";
  return "Workspace";
}

/** Falls back to the Overview entry for unknown paths. */
export function getNavItem(pathname: string): NavItem {
  return (
    NAV_ITEMS.find((item) => pathname === item.href) ??
    NAV_ITEMS.find((item) => pathname.startsWith(`${item.href}/`)) ??
    NAV_ITEMS[0]
  );
}

/**
 * Validates a post-login redirect target. Only same-origin workspace paths are
 * allowed; anything else (external URLs, auth pages) falls back to the
 * dashboard so redirects can never loop or leave the app.
 */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  if (raw.startsWith("/login") || raw.startsWith("/register")) {
    return "/dashboard";
  }
  return raw;
}

/** Document metadata for a route, kept in sync with the visible page title. */
export function getPageMetadata(pathname: string): Metadata {
  const item = getNavItem(pathname);
  return {
    title: item.title,
    description: item.description,
  };
}
