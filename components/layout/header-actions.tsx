import Link from "next/link";
import { Bell, Plus, Search, User } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";

/**
 * Header controls. Search and notifications are visible affordances that are
 * explicitly disabled until their backing features exist; Add Inquiry is a
 * clearly marked placeholder until Phase 4.
 */
export function HeaderActions() {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        disabled
        title="Search arrives in a later phase"
        className="hidden h-9 w-56 items-center gap-2 rounded-lg border border-line bg-white px-3 text-left text-sm text-subtle md:flex xl:w-64"
      >
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <span className="flex-1 truncate">Search inquiries…</span>
        <kbd className="rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] font-medium text-subtle">
          ⌘K
        </kbd>
      </button>

      <button
        type="button"
        disabled
        title="Search arrives in a later phase"
        aria-label="Search inquiries — coming soon"
        className="grid size-9 place-items-center rounded-lg text-muted md:hidden"
      >
        <Search className="size-[18px]" aria-hidden="true" />
      </button>

      <button
        type="button"
        disabled
        title="Notifications arrive in a later phase"
        aria-label="Notifications — coming soon"
        className="grid size-9 place-items-center rounded-lg text-muted"
      >
        <Bell className="size-[18px]" aria-hidden="true" />
      </button>

      <button
        type="button"
        disabled
        title="Add Inquiry arrives in Phase 4"
        className={buttonClasses("primary", "md")}
      >
        <Plus className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Add Inquiry</span>
        <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
          Soon
        </span>
      </button>

      <Link
        href="/login"
        className="ml-1 hidden h-9 items-center gap-2 rounded-lg pr-2 pl-1 hover:bg-surface lg:flex"
        title="Sign in"
      >
        <span className="grid size-8 place-items-center rounded-full border border-line bg-surface text-subtle">
          <User className="size-4" aria-hidden="true" />
        </span>
        <span className="text-[13px] font-medium text-ink">Sign in</span>
      </Link>
    </div>
  );
}
