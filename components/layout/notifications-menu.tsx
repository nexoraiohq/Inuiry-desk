"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CalendarClock, Inbox, MessageSquare } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { formatDateTime } from "@/lib/dashboard/format";
import { groupFor } from "@/lib/follow-ups/date";
import { listFollowUps } from "@/lib/follow-ups/service";
import { listInquiries } from "@/lib/inquiries/service";
import { listReminders, markReminderRead } from "@/lib/reminders/client";
import type { ReminderNotification } from "@/lib/reminders/types";

type Summary = { overdue: number; today: number; newInquiries: number };

const EMPTY: Summary = { overdue: 0, today: 0, newInquiries: 0 };

/** Live, read-only workspace alerts derived from real records. */
export function NotificationsMenu() {
  const { user, status } = useAuth();
  const [summary, setSummary] = useState<Summary>(EMPTY);
  const [reminders, setReminders] = useState<ReminderNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [followUps, inquiries, reminders] = await Promise.all([
        listFollowUps(user.uid),
        listInquiries(user.uid),
        listReminders(user.uid),
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
      setReminders(reminders.filter((item) => item.readAt === null));
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

  const total = summary.newInquiries + reminders.length;
  const showDerivedFollowUps = reminders.length === 0;

  async function openReminder(id: string) {
    setReminders((current) => current.filter((item) => item.id !== id));
    setOpen(false);
    if (user) {
      try { await markReminderRead(user.uid, id); } catch { /* advisory only */ }
    }
  }

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
              {showDerivedFollowUps && summary.overdue > 0 ? (
                <Link href="/follow-ups" onClick={() => setOpen(false)} role="menuitem" className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-surface">
                  <CalendarClock className="size-4 shrink-0 text-danger" aria-hidden="true" />
                  <span className="min-w-0 flex-1 text-[12px] text-ink">{summary.overdue} overdue follow-up{summary.overdue === 1 ? "" : "s"}</span>
                  <span className="text-[11px] text-subtle">View</span>
                </Link>
              ) : null}
              {showDerivedFollowUps && summary.today > 0 ? (
                <Link href="/follow-ups" onClick={() => setOpen(false)} role="menuitem" className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-surface">
                  <CalendarClock className="size-4 shrink-0 text-brand" aria-hidden="true" />
                  <span className="min-w-0 flex-1 text-[12px] text-ink">{summary.today} follow-up{summary.today === 1 ? "" : "s"} due today</span>
                  <span className="text-[11px] text-subtle">View</span>
                </Link>
              ) : null}
              {reminders.map((item) => (
                <Link
                  key={item.id}
                  href={`/follow-ups/${item.followUpId}`}
                  onClick={() => void openReminder(item.id)}
                  role="menuitem"
                  className="flex items-start gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-surface"
                >
                  <MessageSquare className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-medium text-ink">{item.title}</span>
                    <span className="block truncate text-[11px] text-muted">{item.message}</span>
                    <time dateTime={item.scheduledFor.toISOString()} className="mt-0.5 block text-[10px] text-subtle">
                      {formatDateTime(item.scheduledFor)}
                    </time>
                  </span>
                </Link>
              ))}
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
