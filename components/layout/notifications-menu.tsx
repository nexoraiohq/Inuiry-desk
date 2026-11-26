"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CalendarClock, Inbox } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { groupFor } from "@/lib/follow-ups/date";
import { listFollowUps } from "@/lib/follow-ups/service";
import { listInquiries } from "@/lib/inquiries/service";

type Summary = { overdue: number; today: number; newInquiries: number };

const EMPTY: Summary = { overdue: 0, today: 0, newInquiries: 0 };

/** Live, read-only workspace alerts derived from real records. */
export function NotificationsMenu() {
  const { user, status } = useAuth();
  const [summary, setSummary] = useState<Summary>(EMPTY);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [followUps, inquiries] = await Promise.all([
        listFollowUps(user.uid),
        listInquiries(user.uid),
      ]);
      const now = new Date();
      setSummary({
        overdue: followUps.filter(
          (item) => groupFor(item.status, item.dueAt, now) === "overdue"
        ).length,
        today: followUps.filter(
          (item) => groupFor(item.status, item.dueAt, now) === "today"
        ).length,
        newInquiries: inquiries.filter(
          (item) => !item.archived && item.status === "new"
        ).length,
      });
    } catch {
      // Notifications are advisory; a failed refresh must not break the header.
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (status !== "ready" || !user) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [status, user, load]);

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

  if (status !== "ready") return null;

  const total = summary.overdue + summary.today + summary.newInquiries;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((value) => !value); void load(); }}
        aria-label={`Notifications${total ? `, ${total} items` : ""}`}
        aria-expanded={open}
        aria-haspopup="menu"
        className="relative grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-ink"
      >
        <Bell className="size-[18px]" aria-hidden="true" />
        {total > 0 ? (
          <span className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
            {total > 9 ? "9+" : total}
          </span>
        ) : null}
      </button>

      {open ? (
        <div role="menu" className="absolute right-0 top-11 z-50 w-72 rounded-xl border border-line bg-canvas p-3 shadow-raised">
          <div className="flex items-center justify-between gap-2">
            <p className="font-display text-[13px] font-semibold text-ink">Notifications</p>
            <span className="text-[11px] text-subtle">{loading ? "Updating…" : `${total} items`}</span>
          </div>

          {total === 0 ? (
            <p className="mt-4 text-[12px] text-muted">Nothing needs attention right now.</p>
          ) : (
            <div className="mt-3 space-y-1.5">
              {summary.overdue > 0 ? (
                <Link href="/follow-ups" onClick={() => setOpen(false)} role="menuitem" className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-surface">
                  <CalendarClock className="size-4 shrink-0 text-danger" aria-hidden="true" />
                  <span className="min-w-0 flex-1 text-[12px] text-ink">{summary.overdue} overdue follow-up{summary.overdue === 1 ? "" : "s"}</span>
                  <span className="text-[11px] text-subtle">View</span>
                </Link>
              ) : null}
              {summary.today > 0 ? (
                <Link href="/follow-ups" onClick={() => setOpen(false)} role="menuitem" className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-surface">
                  <CalendarClock className="size-4 shrink-0 text-brand" aria-hidden="true" />
                  <span className="min-w-0 flex-1 text-[12px] text-ink">{summary.today} follow-up{summary.today === 1 ? "" : "s"} due today</span>
                  <span className="text-[11px] text-subtle">View</span>
                </Link>
              ) : null}
              {summary.newInquiries > 0 ? (
                <Link href="/inquiries" onClick={() => setOpen(false)} role="menuitem" className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-surface">
                  <Inbox className="size-4 shrink-0 text-brand" aria-hidden="true" />
                  <span className="min-w-0 flex-1 text-[12px] text-ink">{summary.newInquiries} new inquiries</span>
                  <span className="text-[11px] text-subtle">View</span>
                </Link>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
