"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CalendarClock,
  Check,
  CheckCheck,
  Inbox,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Notice } from "@/components/ui/notice";
import { formatRelative } from "@/lib/dashboard/format";
import { groupFor } from "@/lib/follow-ups/date";
import { syncDerivedNotifications } from "@/lib/reminders/derived";
import { listFollowUps } from "@/lib/follow-ups/service";
import { listInquiries } from "@/lib/inquiries/service";
import {
  deleteAllReminders,
  deleteReminder,
  markAllRemindersRead,
  markReminderRead,
  subscribeReminders,
} from "@/lib/reminders/client";
import type { ReminderNotification } from "@/lib/reminders/types";

type Summary = { overdue: number; today: number; newInquiries: number };
const EMPTY: Summary = { overdue: 0, today: 0, newInquiries: 0 };

/** Live workspace alerts plus persisted reminder notifications. */
export function NotificationsMenu() {
  const { user, status } = useAuth();
  const [summary, setSummary] = useState<Summary>(EMPTY);
  const [reminders, setReminders] = useState<ReminderNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [followUps, inquiries] = await Promise.all([
        listFollowUps(user.uid),
        listInquiries(user.uid),
      ]);
      await syncDerivedNotifications(user.uid, followUps, inquiries);
      const now = new Date();
      setSummary({
        overdue: followUps.filter((item) => groupFor(item.status, item.dueAt, now) === "overdue").length,
        today: followUps.filter((item) => groupFor(item.status, item.dueAt, now) === "today").length,
        newInquiries: inquiries.filter((item) => !item.archived && item.status === "new").length,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not refresh notifications.");
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
    if (status !== "ready" || !user) return;
    return subscribeReminders(
      user.uid,
      (items) => {
        setReminders(items);
        setLoading(false);
      },
      (message) => setError(message)
    );
  }, [status, user]);

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

  const unread = reminders.filter((item) => item.readAt === null);
  const showDerivedFollowUps = reminders.length === 0;
  const showDerivedNewInquiries = reminders.length === 0;
  const derivedCount =
    (showDerivedFollowUps ? summary.overdue + summary.today : 0) +
    (showDerivedNewInquiries ? summary.newInquiries : 0);
  const total = unread.length + derivedCount;

  function notificationIcon(type: string) {
    if (type === "new_inquiry") return Inbox;
    return CalendarClock;
  }

  function notificationTone(type: string) {
    if (type === "follow_up_overdue") return "text-danger";
    if (type === "new_inquiry") return "text-success";
    return "text-brand";
  }

  async function run(action: () => Promise<unknown>, message: string) {
    if (!user) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      await load();
      setNotice(message);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Notification update failed.");
    } finally {
      setBusy(false);
    }
  }

  if (status !== "ready") return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((value) => !value); void load(); }}
        aria-label={`Notifications${total ? `, ${total} unread` : ""}`}
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
        <div role="menu" className="absolute right-0 top-11 z-50 w-[22rem] max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-canvas p-3 shadow-raised">
          <div className="flex items-center justify-between gap-2">
            <p className="font-display text-[13px] font-semibold text-ink">Notifications</p>
            <span className="text-[11px] text-subtle">{loading ? "Updating…" : `${unread.length} unread`}</span>
          </div>

          {error ? <div className="mt-2"><Notice tone="danger" message={error} onDismiss={() => setError(null)} /></div> : null}
          {notice ? <div className="mt-2"><Notice tone="success" message={notice} onDismiss={() => setNotice(null)} /></div> : null}

          <div className="mt-3 flex flex-wrap gap-2 border-b border-line pb-3">
            <button
              type="button"
              disabled={busy || unread.length === 0}
              onClick={() => void run(() => markAllRemindersRead(user!.uid), "All reminders marked as read.")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-medium text-muted transition-colors hover:bg-surface hover:text-ink disabled:opacity-40"
            >
              <CheckCheck className="size-3.5" aria-hidden="true" /> Mark all read
            </button>
            <button
              type="button"
              disabled={busy || reminders.length === 0}
              onClick={() => void run(() => deleteAllReminders(user!.uid), "All reminders deleted.")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-danger/25 px-2.5 py-1.5 text-[11px] font-medium text-danger transition-colors hover:bg-danger-soft disabled:opacity-40"
            >
              <Trash2 className="size-3.5" aria-hidden="true" /> Delete all
            </button>
          </div>

          {total === 0 ? (
            <p className="mt-4 text-[12px] text-muted">Nothing needs attention right now.</p>
          ) : (
            <div className="mt-3 max-h-[60vh] space-y-1.5 overflow-y-auto">
              {reminders.map((item) => {
                const Icon = notificationIcon(item.type);
                const isUnread = item.readAt === null;
                const href = item.type === "new_inquiry"
                  ? `/inquiries/${item.inquiryId}`
                  : `/follow-ups/${item.followUpId}`;
                return (
                  <div
                    key={item.id}
                    className={`rounded-lg px-2 py-2 transition-colors hover:bg-surface/60 ${isUnread ? "bg-brand-soft/40" : "opacity-70"}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <Icon className={`mt-0.5 size-4 shrink-0 ${notificationTone(item.type)}`} aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {isUnread ? <span className="size-1.5 shrink-0 rounded-full bg-brand" aria-label="Unread" /> : null}
                          <Link href={href} onClick={() => setOpen(false)} className={`truncate text-[12px] hover:text-brand ${isUnread ? "font-semibold text-ink" : "font-normal text-subtle"}`}>
                            {item.title}
                          </Link>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-muted">{item.message}</p>
                        <time dateTime={item.scheduledFor.toISOString()} className="mt-1 block text-[10px] text-subtle">
                          {formatRelative(item.scheduledFor)}
                        </time>
                      </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      {item.readAt === null ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void run(() => markReminderRead(user!.uid, item.id), "Reminder marked as read.")}
                          aria-label={`Mark ${item.title} as read`}
                          title="Mark as read"
                          className="grid size-7 place-items-center rounded-lg text-muted transition-colors hover:bg-brand-soft hover:text-brand disabled:opacity-40"
                        >
                          <Check className="size-3.5" aria-hidden="true" />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void run(() => deleteReminder(user!.uid, item.id), "Reminder deleted.")}
                        aria-label={`Delete ${item.title}`}
                        title="Delete"
                        className="grid size-7 place-items-center rounded-lg text-muted transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-40"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
                );
              })}

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
              {showDerivedNewInquiries && summary.newInquiries > 0 ? (
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
