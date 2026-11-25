"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { User, X } from "lucide-react";
import { BrandMark, BrandName } from "@/components/brand";
import { NavList } from "@/components/layout/nav-list";

type MobileDrawerProps = {
  onClose: () => void;
};

/** Off-canvas navigation for small screens. Closes on Escape or overlay tap. */
export function MobileDrawer({ onClose }: MobileDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

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
        className="absolute inset-0 bg-ink/25"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        tabIndex={-1}
        className="absolute inset-y-0 left-0 flex w-[280px] flex-col bg-white shadow-raised outline-none"
      >
        <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-line px-5">
          <div className="flex items-center gap-3">
            <BrandMark />
            <BrandName />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink"
          >
            <X className="size-[18px]" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Main" className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          <NavList onNavigate={onClose} />
        </nav>

        <div className="shrink-0 border-t border-line p-4">
          <Link
            href="/login"
            onClick={onClose}
            className="flex h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white text-sm font-medium text-ink hover:bg-surface"
          >
            <User className="size-4 text-subtle" aria-hidden="true" />
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
