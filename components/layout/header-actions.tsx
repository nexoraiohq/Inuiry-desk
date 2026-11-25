"use client";

import Link from "next/link";
import { Bell, Plus, Search, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { Avatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";

function HeaderSearch() {
  const { status } = useAuth();
  if (status !== "ready") return null;
  return (
    <>
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
    </>
  );
}

export function ProfileMenu() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const userEmail = user?.email ?? "";
  const displayName = user?.displayName?.trim() || userEmail;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  async function handleSignOut() {
    setOpen(false);
    const { logout } = await import("@/lib/auth");
    try {
      await logout();
    } finally {
      router.replace("/login");
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        className="h-9 w-9 rounded-full transition-opacity hover:opacity-80"
      >
        <Avatar name={displayName} size="md" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-11 z-50 w-56 rounded-xl border border-line bg-white p-1 shadow-raised"
        >
          <div className="flex flex-col gap-0.5 px-2.5 py-2.5">
            <p className="text-[13px] font-semibold text-ink">{displayName}</p>
            <p className="truncate text-xs text-muted">{userEmail}</p>
          </div>
          <div className="my-1 h-px bg-line" />
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium text-danger hover:bg-danger-soft"
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function HeaderActions() {
  const { user, status } = useAuth();

  if (status === "loading" || status === "unconfigured") {
    return null;
  }

  if (user) {
    return <ProfileMenu />;
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <HeaderSearch />
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
        aria-label="Add Inquiry — coming in Phase 4"
        className={cn(buttonClasses("primary", "md"), "px-3")}
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
