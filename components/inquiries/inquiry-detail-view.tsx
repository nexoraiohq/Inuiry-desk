"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarClock,
  ExternalLink,
  Mail,
  MessageSquare,
  Pencil,
  Phone,
} from "lucide-react";
import { activityIcons, activityTones } from "@/components/dashboard/recent-activity";
import { DashboardError } from "@/components/dashboard/dashboard-error";
import { InquiryDetailSkeleton } from "@/components/inquiries/inquiry-detail-skeleton";
import { InquiryFormDialog } from "@/components/inquiries/inquiry-form-dialog";
import {
  PriorityBadge,
  SourceBadge,
  StatusBadge,
} from "@/components/inquiries/inquiry-badges";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { formatDateTime, humanize } from "@/lib/dashboard/format";
import {
  INQUIRY_STATUSES,
  type ActivityType,
  type InquiryStatus,
} from "@/lib/dashboard/types";
import { type InquiryDetail as InquiryDetailData } from "@/lib/inquiries/service";
import { phoneDigits, telHref, whatsappHref } from "@/lib/inquiries/phone";
import { changeInquiryStatus, getInquiryDetail } from "@/lib/inquiries/service";

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-subtle">{label}</p>
      <div className="mt-1 text-[13px] text-ink">{children}</div>
    </div>
  );
}

export function InquiryDetailView({
  uid,
  inquiryId,
}: {
  uid: string;
  inquiryId: string;
}) {
  const [detail, setDetail] = useState<InquiryDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const loadDetail = useCallback(
    async () => getInquiryDetail(uid, inquiryId),
    [uid, inquiryId]
  );

  useEffect(() => {
    let active = true;
    void loadDetail()
      .then((result) => {
        if (active) { setDetail(result); setError(null); }
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "Could not load the inquiry.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [loadDetail]);

  const refresh = useCallback(() => {
    setLoading(true);
    void loadDetail()
      .then((result) => { setDetail(result); setError(null); })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "Could not load the inquiry.");
      })
      .finally(() => setLoading(false));
  }, [loadDetail]);

  async function handleStatusChange(next: InquiryStatus) {
    if (statusBusy || !detail || next === detail.inquiry.status) return;
    setStatusBusy(true);
    try {
      await changeInquiryStatus(uid, inquiryId, next);
      setNotice("Status updated and activity recorded.");
      refresh();
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Could not update the status.");
    } finally {
      setStatusBusy(false);
    }
  }

  if (loading) return <InquiryDetailSkeleton />;

  if (error || !detail) {
    return (
      <DashboardError
        title="We couldn't load this inquiry"
        message={error ?? "Inquiry not found."}
        onRetry={refresh}
      />
    );
  }

  const { inquiry, followUps, activities } = detail;
  const digits = phoneDigits(inquiry.phone);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/inquiries" className={buttonClasses("ghost", "sm")}>
          <ArrowLeft className="size-4" aria-hidden="true" /> All inquiries
        </Link>
      </div>

      {notice ? (
        <Notice
          tone={notice.includes("updated") ? "success" : "danger"}
          message={notice}
          onDismiss={() => setNotice(null)}
        />
      ) : null}

      <PageHeader title={inquiry.fullName} description={inquiry.service}>
        <div className="flex flex-wrap items-center gap-2">
          <a href={telHref(inquiry.phone)} className={buttonClasses("secondary", "md", "h-9")}>
            <Phone className="size-4" aria-hidden="true" /> Call
          </a>
          {digits ? (
            <a
              href={whatsappHref(inquiry.phone)}
              target="_blank"
              rel="noreferrer"
              className={buttonClasses("secondary", "md", "h-9")}
              title="Opens WhatsApp — no message is sent automatically"
            >
              <MessageSquare className="size-4" aria-hidden="true" /> WhatsApp
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className={buttonClasses("primary", "md", "h-9")}
          >
            <Pencil className="size-4" aria-hidden="true" /> Edit
          </button>
        </div>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="bg-canvas/80 p-5 shadow-card lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={inquiry.status} />
            <PriorityBadge priority={inquiry.priority} />
            <SourceBadge source={inquiry.source} />
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <DetailRow label="Phone">
              <a href={telHref(inquiry.phone)} className="inline-flex items-center gap-1.5 hover:text-brand">
                <Phone className="size-3.5" aria-hidden="true" /> {inquiry.phone}
              </a>
            </DetailRow>
            <DetailRow label="Email">
              {inquiry.email ? (
                <a href={`mailto:${inquiry.email}`} className="inline-flex items-center gap-1.5 hover:text-brand">
                  <Mail className="size-3.5" aria-hidden="true" /> {inquiry.email}
                </a>
              ) : (
                <span className="text-subtle">Not provided</span>
              )}
            </DetailRow>
            <DetailRow label="Service">{inquiry.service}</DetailRow>
            <DetailRow label="Added">
              <time dateTime={inquiry.createdAt.toISOString()}>{formatDateTime(inquiry.createdAt)}</time>
            </DetailRow>
            <DetailRow label="Last updated">
              <time dateTime={inquiry.updatedAt.toISOString()}>{formatDateTime(inquiry.updatedAt)}</time>
            </DetailRow>
            <DetailRow label="Last contacted">
              {inquiry.lastContactedAt ? formatDateTime(inquiry.lastContactedAt) : "Not yet"}
            </DetailRow>
          </div>
          <div className="mt-5 border-t border-line pt-4">
            <p className="text-[11px] font-medium text-subtle">Notes</p>
            <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-ink">
              {inquiry.notes || <span className="text-subtle">No notes yet</span>}
            </p>
          </div>
        </Card>

        <Card className="bg-canvas/80 p-5 shadow-card">
          <h2 className="font-display text-[15px] font-semibold tracking-[-0.01em] text-ink">
            Update status
          </h2>
          <p className="mt-1 text-[12px] text-muted">Every real change is recorded in the activity timeline.</p>
          <Select
            aria-label="Inquiry status"
            value={inquiry.status}
            disabled={statusBusy}
            onChange={(event) => void handleStatusChange(event.target.value as InquiryStatus)}
            className="mt-4"
          >
            {INQUIRY_STATUSES.map((option) => (
              <option key={option} value={option}>{humanize(option)}</option>
            ))}
          </Select>
          {statusBusy ? <p className="mt-2 text-[12px] text-muted">Saving status…</p> : null}
        </Card>
      </div>

      <Card className="overflow-hidden bg-canvas/80 shadow-card">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-display text-[15px] font-semibold tracking-[-0.01em] text-ink">
            Related follow-ups
          </h2>
          <p className="mt-1 text-[13px] text-muted">Scheduled next steps for this inquiry.</p>
        </div>
        {followUps.length === 0 ? (
          <div className="px-5 py-6">
            <EmptyState
              icon={CalendarClock}
              headingLevel="h2"
              title="No follow-ups yet"
              description="Follow-ups will appear here when they are scheduled for this inquiry."
            />
          </div>
        ) : (
          <ul className="divide-y divide-line/70">
            {followUps.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-ink">{item.title}</p>
                  <p className="mt-0.5 text-[12px] text-muted">{humanize(item.status)}</p>
                </div>
                <time dateTime={item.dueAt.toISOString()} className="shrink-0 text-[11px] text-subtle">
                  {formatDateTime(item.dueAt)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="overflow-hidden bg-canvas/80 shadow-card">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-display text-[15px] font-semibold tracking-[-0.01em] text-ink">
            Activity timeline
          </h2>
          <p className="mt-1 text-[13px] text-muted">A record of what happened on this inquiry.</p>
        </div>
        {activities.length === 0 ? (
          <div className="px-5 py-6">
            <EmptyState
              icon={MessageSquare}
              headingLevel="h2"
              title="No activity yet"
              description="Creating this inquiry and changing its status will add events here."
            />
          </div>
        ) : (
          <ol className="space-y-0 px-5 py-2">
            {activities.map((activity) => {
              const Icon = activityIcons[activity.type as ActivityType];
              return (
                <li key={activity.id} className="relative flex gap-4 py-4 pl-1">
                  <div className="absolute top-0 bottom-0 left-[19px] w-px bg-line first:top-6 last:bottom-auto" aria-hidden="true" />
                  <span className={cn("relative z-10 grid size-9 shrink-0 place-items-center rounded-xl", activityTones[activity.type as ActivityType])}>
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-ink">{activity.description}</p>
                    <time dateTime={activity.createdAt.toISOString()} className="mt-1 block text-[11px] text-subtle">
                      {formatDateTime(activity.createdAt)}
                    </time>
                  </div>
                  <ArrowUpRight className="hidden size-3.5 text-subtle sm:block" aria-hidden="true" />
                </li>
              );
            })}
          </ol>
        )}
      </Card>

      <InquiryFormDialog
        key={`edit-${inquiry.id}`}
        uid={uid}
        inquiry={inquiry}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={(message) => { setNotice(message); refresh(); }}
      />
    </div>
  );
}
