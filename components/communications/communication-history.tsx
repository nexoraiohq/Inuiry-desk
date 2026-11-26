"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageSquare, Pencil, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import {
  CommunicationChannelBadge,
  CommunicationDirectionBadge,
  CommunicationOutcomeBadge,
} from "@/components/communications/communication-badges";
import { CommunicationFormDialog } from "@/components/communications/communication-form-dialog";
import { DashboardError } from "@/components/dashboard/dashboard-error";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { formatDateTime } from "@/lib/dashboard/format";
import type { CommunicationRecord, FollowUpRecord } from "@/lib/dashboard/types";
import { listCommunications } from "@/lib/communications/service";

const PAGE_SIZE = 10;

export function CommunicationHistory({
  uid,
  inquiryId,
  inquiryLabel,
  followUps,
  onChanged,
}: {
  uid: string;
  inquiryId: string;
  inquiryLabel: string;
  followUps: FollowUpRecord[];
  onChanged?: () => void;
}) {
  const { user } = useAuth();
  const [records, setRecords] = useState<CommunicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<CommunicationRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState("create");
  const [page, setPage] = useState(1);

  const load = useCallback(
    async () => listCommunications(uid, inquiryId),
    [uid, inquiryId]
  );

  useEffect(() => {
    let active = true;
    void load()
      .then((list) => { if (active) { setRecords(list); setError(null); } })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "Could not load interactions.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load]);

  const refresh = useCallback(() => {
    setLoading(true);
    void load()
      .then((list) => { setRecords(list); setError(null); })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "Could not load interactions.");
      })
      .finally(() => setLoading(false));
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = records.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function openCreate() {
    setSelected(null);
    setFormKey("create");
    setFormOpen(true);
  }

  return (
    <Card className="overflow-hidden bg-canvas/80 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <h2 className="font-display text-[15px] font-semibold tracking-[-0.01em] text-ink">
            Communication history
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            Interactions you record with {inquiryLabel}. Nothing is sent automatically.
          </p>
        </div>
        <button type="button" onClick={openCreate} className={buttonClasses("secondary", "md", "h-9")}>
          <Plus className="size-4" aria-hidden="true" /> Log interaction
        </button>
      </div>

      {notice ? <div className="px-5 pt-3"><Notice tone="success" message={notice} onDismiss={() => setNotice(null)} /></div> : null}
      {error ? <div className="px-5 pt-3"><Notice tone="danger" message={error} onDismiss={() => setError(null)} /></div> : null}

      {loading ? (
        <div className="space-y-3 px-5 py-5" role="status" aria-label="Loading communication history">
          {[0, 1, 2].map((key) => (
            <div key={key} className="flex items-center gap-3">
              <div className="size-8 shrink-0 animate-pulse rounded-lg bg-skeleton" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3 w-40 animate-pulse rounded bg-skeleton" />
                <div className="h-2.5 w-64 max-w-full animate-pulse rounded bg-skeleton" />
              </div>
            </div>
          ))}
        </div>
      ) : error && records.length === 0 ? (
        <div className="px-5 py-5">
          <DashboardError title="We couldn't load interactions" message={error} onRetry={refresh} />
        </div>
      ) : records.length === 0 ? (
        <div className="px-5 py-7">
          <EmptyState
            icon={MessageSquare}
            headingLevel="h3"
            title="No interactions logged"
            description="After you call, message or meet this customer, log the outcome here to keep the history complete."
          />
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-[0.06em] text-subtle">
                  <th scope="col" className="px-4 py-3">Interaction</th>
                  <th scope="col" className="px-3 py-3">Summary</th>
                  <th scope="col" className="px-3 py-3">Occurred</th>
                  <th scope="col" className="px-4 py-3">Logged by</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => (
                  <tr
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open interaction: ${item.summary}`}
                    onClick={() => setSelected(item)}
                    onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelected(item); }}
                    className="cursor-pointer border-b border-line/70 transition-colors last:border-b-0 hover:bg-surface/60"
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-nowrap items-center gap-2">
                        <CommunicationChannelBadge channel={item.channel} />
                        <CommunicationDirectionBadge direction={item.direction} />
                        <CommunicationOutcomeBadge outcome={item.outcome} />
                      </div>
                    </td>
                    <td className="max-w-md px-3 py-3">
                      <p className="truncate text-[13px] text-ink">{item.summary}</p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-[12px] text-muted">
                      <time dateTime={item.occurredAt.toISOString()}>{formatDateTime(item.occurredAt)}</time>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[12px] text-subtle">
                      {item.createdByUid === user?.uid ? "You" : item.createdByUid.slice(0, 6)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-line/70 md:hidden">
            {visible.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setSelected(item)}
                  className="flex w-full flex-col gap-2 px-4 py-3.5 text-left transition-colors hover:bg-surface/60"
                >
                  <div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
                    <CommunicationChannelBadge channel={item.channel} />
                    <CommunicationDirectionBadge direction={item.direction} />
                    <CommunicationOutcomeBadge outcome={item.outcome} />
                  </div>
                  <p className="line-clamp-2 text-[13px] leading-snug text-ink">{item.summary}</p>
                  <div className="flex items-center justify-between gap-3 text-[11px] text-subtle">
                    <time dateTime={item.occurredAt.toISOString()}>{formatDateTime(item.occurredAt)}</time>
                    <span>{item.createdByUid === user?.uid ? "You" : item.createdByUid.slice(0, 6)}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-5">
            <p className="text-[12px] text-muted">{records.length} interactions</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage <= 1} aria-label="Previous page" className={buttonClasses("secondary", "sm", "h-8 px-2")}>
                <ChevronLeft className="size-4" aria-hidden="true" />
              </button>
              <span className="text-[12px] text-muted">Page {currentPage} of {totalPages}</span>
              <button type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= totalPages} aria-label="Next page" className={buttonClasses("secondary", "sm", "h-8 px-2")}>
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </>
      )}

      <CommunicationFormDialog
        key={formKey}
        uid={uid}
        inquiryId={inquiryId}
        inquiryLabel={inquiryLabel}
        followUps={followUps}
        communication={formKey === "create" ? null : selected}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={(message) => { setNotice(message); setFormOpen(false); refresh(); onChanged?.(); }}
      />

      <Dialog
        open={Boolean(selected) && !formOpen}
        onClose={() => setSelected(null)}
        title="Interaction details"
        description="This record was entered manually by a workspace member."
      >
        {selected ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <CommunicationChannelBadge channel={selected.channel} />
              <CommunicationDirectionBadge direction={selected.direction} />
              <CommunicationOutcomeBadge outcome={selected.outcome} />
            </div>
            <p className="mt-4 whitespace-pre-wrap text-[13px] leading-relaxed text-ink">{selected.summary}</p>
            <div className="mt-5 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
              <div>
                <p className="text-[11px] text-subtle">Occurred</p>
                <p className="mt-1 text-[13px] text-ink">{formatDateTime(selected.occurredAt)}</p>
              </div>
              <div>
                <p className="text-[11px] text-subtle">Logged by</p>
                <p className="mt-1 text-[13px] text-ink">{selected.createdByUid === user?.uid ? "You" : selected.createdByUid.slice(0, 6)}</p>
              </div>
              {selected.followUpId ? (
                <div className="sm:col-span-2">
                  <p className="text-[11px] text-subtle">Linked follow-up</p>
                  <p className="mt-1 text-[13px] text-ink">{followUps.find((item) => item.id === selected?.followUpId)?.title ?? "Linked follow-up"}</p>
                </div>
              ) : null}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => { setFormKey(selected.id); setFormOpen(true); }}
                className={buttonClasses("primary", "md", "h-10")}
              >
                <Pencil className="size-4" aria-hidden="true" /> Edit interaction
              </button>
            </div>
          </>
        ) : null}
      </Dialog>
    </Card>
  );
}
