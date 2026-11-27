"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, User, X } from "lucide-react";
import { BrandMark, BrandName } from "@/components/brand";
import { NavList } from "@/components/layout/nav-list";
import { useAuth } from "@/components/auth/auth-provider";
import { logout } from "@/lib/auth";

type MobileDrawerProps = {
  onClose: () => void;
};

/** Off-canvas navigation for small screens. Closes on Escape or overlay tap. */
export function MobileDrawer({ onClose }: MobileDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="absolute inset-0 bg-sidebar/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        tabIndex={-1}
        className="absolute inset-y-0 left-0 flex w-[280px] flex-col bg-sidebar text-white shadow-raised outline-none"
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/5 px-5">
          <div className="flex items-center gap-3">
            <BrandMark />
            <BrandName inverted className="text-[15px] font-bold" />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="grid size-9 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
          >
            <X className="size-[18px]" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Main" className="sidebar-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-6">
          <NavList dark onNavigate={onClose} />
        </nav>

        <div className="shrink-0 border-t border-white/5 p-4">
          {user ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                void (async () => {
                  try {
                    await logout();
                  } finally {
                    router.replace("/login");
                  }
                })();
              }}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 text-sm font-medium text-white hover:bg-white/10"
            >
              <LogOut className="size-4 text-white/60" aria-hidden="true" />
              Sign out
            </button>
          ) : (
            <Link
              href="/login"
              onClick={onClose}
              className="flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 text-sm font-medium text-white hover:bg-white/10"
            >
              <User className="size-4 text-white/60" aria-hidden="true" />
              Sign in
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
