"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarClock, CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { activityIcons, activityTones } from "@/components/dashboard/recent-activity";
import { DashboardError } from "@/components/dashboard/dashboard-error";
import {
  FollowUpGroupBadge,
  FollowUpPriorityBadge,
  FollowUpStatusBadge,
} from "@/components/follow-ups/follow-up-badges";
import { FollowUpFormDialog } from "@/components/follow-ups/follow-up-form-dialog";
import { FollowUpsSkeleton } from "@/components/follow-ups/follow-ups-skeleton";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { PageIntro } from "@/components/ui/page-intro";
import { useWorkspaceRevision } from "@/components/live/workspace-live-provider";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/dashboard/format";
import type { ActivityType, FollowUpRecord, InquiryRecord } from "@/lib/dashboard/types";
import { combineLocalDateTime, groupFor, toDateInput, toTimeInput } from "@/lib/follow-ups/date";
import {
  cancelFollowUp,
  completeFollowUp,
  deleteFollowUp,
  getFollowUpDetail,
  getSelectableInquiries,
  rescheduleFollowUp,
  type FollowUpDetail,
} from "@/lib/follow-ups/service";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-subtle">{label}</p>
      <div className="mt-1 text-[13px] text-ink">{children}</div>
    </div>
  );
}

export function FollowUpDetailView({ uid, id }: { uid: string; id: string }) {
  const revision = useWorkspaceRevision();
  const [detail, setDetail] = useState<FollowUpDetail | null>(null);
  const [inquiries, setInquiries] = useState<InquiryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");

  const load = useCallback(
    async () => Promise.all([getFollowUpDetail(uid, id), getSelectableInquiries(uid)]),
    [uid, id]
  );

  useEffect(() => {
    let active = true;
    void load()
      .then(([nextDetail, nextInquiries]) => {
        if (!active) return;
        setDetail(nextDetail);
        setInquiries(nextInquiries);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "Could not load the follow-up.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load, revision]);

  const refresh = useCallback(() => {
    setLoading(true);
    void load()
      .then(([nextDetail, nextInquiries]) => {
        setDetail(nextDetail);
        setInquiries(nextInquiries);
        setError(null);
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "Could not load the follow-up.");
      })
      .finally(() => setLoading(false));
  }, [load]);

  async function run(action: () => Promise<void>, message: string) {
    setBusy(true);
    try {
      await action();
      setNotice(message);
      setCancelOpen(false);
      setRescheduleOpen(false);
      setDeleteOpen(false);
      refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update the follow-up.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    await run(() => deleteFollowUp(uid, id), "Follow-up deleted.");
  }

  if (loading) return <FollowUpsSkeleton />;
  if (error || !detail) {
    return <DashboardError title="We couldn't load this follow-up" message={error ?? "Follow-up not found."} onRetry={refresh} />;
  }

  const item: FollowUpRecord = detail.followUp;
  const group = groupFor(item.status, item.dueAt);
  const inquiry = inquiries.find((candidate) => candidate.id === item.inquiryId);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/follow-ups" className={buttonClasses("ghost", "sm")}>
          <ArrowLeft className="size-4" aria-hidden="true" /> All follow-ups
        </Link>
      </div>
      {notice ? <Notice tone="success" message={notice} onDismiss={() => setNotice(null)} /> : null}
      {error ? <Notice tone="danger" message={error} onDismiss={() => setError(null)} /> : null}

      <PageIntro title={item.title} description={item.customerName}>
        <div className="flex flex-wrap items-center gap-2">
          {item.status === "pending" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(() => completeFollowUp(uid, id), "Follow-up marked complete.")}
              className={buttonClasses("primary", "md", "h-9")}
            >
              <CheckCircle2 className="size-4" aria-hidden="true" /> Mark complete
            </button>
          ) : null}
          <button type="button" onClick={() => setEditOpen(true)} className={buttonClasses("secondary", "md", "h-9")}>
            <Pencil className="size-4" aria-hidden="true" /> Edit
          </button>
        </div>
      </PageIntro>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="bg-surface p-5 shadow-card lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <FollowUpStatusBadge status={item.status} />
            <FollowUpGroupBadge group={group} />
            <FollowUpPriorityBadge priority={item.priority} />
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Row label="Due">
              <time dateTime={item.dueAt.toISOString()}>{formatDateTime(item.dueAt)}</time>
            </Row>
            <Row label="Customer">
              {inquiry ? (
                <Link href={`/inquiries/${inquiry.id}`} className="hover:text-brand">{item.customerName}</Link>
              ) : (
                item.customerName
              )}
            </Row>
            <Row label="Created">{formatDateTime(item.createdAt)}</Row>
            <Row label="Completed">{item.completedAt ? formatDateTime(item.completedAt) : "—"}</Row>
          </div>
          <div className="mt-5 border-t border-line pt-4">
            <p className="text-[11px] font-medium text-subtle">Description</p>
            <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-ink">
              {item.description || <span className="text-subtle">No description</span>}
            </p>
          </div>
        </Card>

        <Card className="bg-surface p-5 shadow-card">
          <h2 className="font-display text-[15px] font-semibold tracking-[-0.01em] text-ink">
            Manage
          </h2>
          <p className="mt-1 text-[12px] text-muted">Reschedule or cancel this follow-up.</p>
          <div className="mt-4 flex flex-col gap-2">
            {item.status === "pending" ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setNewDate(toDateInput(item.dueAt));
                    setNewTime(toTimeInput(item.dueAt));
                    setRescheduleOpen(true);
                  }}
                  className={buttonClasses("secondary", "md", "h-9")}
                >
                  <CalendarClock className="size-4" aria-hidden="true" /> Reschedule
                </button>
                <button
                  type="button"
                  onClick={() => setCancelOpen(true)}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-danger/25 bg-danger-soft px-3.5 text-sm font-semibold text-danger transition-colors hover:bg-danger/10"
                >
                  Cancel follow-up
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-danger/25 px-3.5 text-sm font-semibold text-danger transition-colors hover:bg-danger-soft"
            >
              <Trash2 className="size-4" aria-hidden="true" /> Delete permanently
            </button>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden bg-surface shadow-card">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-display text-[15px] font-semibold tracking-[-0.01em] text-ink">Related activity</h2>
          <p className="mt-1 text-[13px] text-muted">What happened around this customer inquiry.</p>
        </div>
        {detail.activities.length === 0 ? (
          <div className="px-5 py-6">
            <EmptyState icon={CalendarClock} headingLevel="h2" title="No activity yet" description="Scheduled follow-ups and status changes will appear here." />
          </div>
        ) : (
          <ul className="divide-y divide-line/70">
            {detail.activities.map((activity) => {
              const Icon = activityIcons[activity.type as ActivityType];
              return (
                <li key={activity.id} className="flex items-start gap-3 px-5 py-3.5">
                  <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", activityTones[activity.type as ActivityType])}>
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-ink">{activity.description}</p>
                    <time dateTime={activity.createdAt.toISOString()} className="mt-1 block text-[11px] text-subtle">
                      {formatDateTime(activity.createdAt)}
                    </time>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <FollowUpFormDialog
        key={`edit-${item.id}`}
        uid={uid}
        inquiries={inquiries}
        followUp={item}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={(message) => { setNotice(message); refresh(); }}
      />

      <Dialog open={rescheduleOpen} onClose={() => setRescheduleOpen(false)} title="Reschedule follow-up" description="Pick a new local date and time.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="reschedule-date" className="text-[13px] font-medium text-ink">Date</label>
            <Input id="reschedule-date" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <label htmlFor="reschedule-time" className="text-[13px] font-medium text-ink">Time</label>
            <Input id="reschedule-time" type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="mt-1.5" />
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => setRescheduleOpen(false)} disabled={busy} className={buttonClasses("secondary", "md", "h-10")}>Keep current</button>
          <button
            type="button"
            disabled={busy || !combineLocalDateTime(newDate, newTime)}
            onClick={() => void run(() => rescheduleFollowUp(uid, id, newDate, newTime), "Follow-up rescheduled.")}
            className={buttonClasses("primary", "md", "h-10")}
          >
            {busy ? "Saving…" : "Save new time"}
          </button>
        </div>
      </Dialog>

      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel this follow-up?" description="The record and its history are kept; it will no longer count as pending.">
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => setCancelOpen(false)} disabled={busy} className={buttonClasses("secondary", "md", "h-10")}>Keep follow-up</button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(() => cancelFollowUp(uid, id), "Follow-up cancelled.")}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-danger px-4 text-sm font-semibold text-white transition-colors hover:bg-danger/90 disabled:opacity-70"
          >
            {busy ? "Cancelling…" : "Cancel follow-up"}
          </button>
        </div>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete this follow-up permanently?" description="The follow-up will be removed. An activity record remains in the timeline.">
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => setDeleteOpen(false)} disabled={busy} className={buttonClasses("secondary", "md", "h-10")}>Keep follow-up</button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleDelete()}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-danger px-4 text-sm font-semibold text-white transition-colors hover:bg-danger/90 disabled:opacity-70"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            {busy ? "Deleting…" : "Delete permanently"}
          </button>
        </div>
      </Dialog>
    </div>
  );
}
