"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { DashboardError } from "@/components/dashboard/dashboard-error";
import { MetricCard } from "@/components/dashboard/metric-card";
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
import { Select } from "@/components/ui/select";
import { formatDateTime, humanize } from "@/lib/dashboard/format";
import {
  FOLLOW_UP_STATUSES,
  INQUIRY_PRIORITIES,
  type FollowUpRecord,
  type InquiryRecord,
} from "@/lib/dashboard/types";
import { groupFor, type FollowUpGroup } from "@/lib/follow-ups/date";
import {
  completeFollowUp,
  deleteFollowUp,
  getFollowUpCounts,
  getSelectableInquiries,
  listFollowUps,
  type FollowUpCounts,
} from "@/lib/follow-ups/service";

const PAGE_SIZE = 10;
const GROUP_ORDER: FollowUpGroup[] = ["overdue", "today", "upcoming", "completed", "cancelled"];

type Sort = "soonest" | "latest";

export function FollowUpsView({ uid }: { uid: string }) {
  const [records, setRecords] = useState<FollowUpRecord[]>([]);
  const [counts, setCounts] = useState<FollowUpCounts | null>(null);
  const [inquiries, setInquiries] = useState<InquiryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [sort, setSort] = useState<Sort>("soonest");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FollowUpRecord | null>(null);
  const [formKey, setFormKey] = useState("create");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FollowUpRecord | null>(null);

  const loadData = useCallback(
    async () =>
      Promise.all([listFollowUps(uid), getFollowUpCounts(uid), getSelectableInquiries(uid)]),
    [uid]
  );

  useEffect(() => {
    let active = true;
    void loadData()
      .then(([list, nextCounts, nextInquiries]) => {
        if (!active) return;
        setRecords(list);
        setCounts(nextCounts);
        setInquiries(nextInquiries);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "Could not load follow-ups.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [loadData]);

  const refresh = useCallback(() => {
    setLoading(true);
    void loadData()
      .then(([list, nextCounts, nextInquiries]) => {
        setRecords(list);
        setCounts(nextCounts);
        setInquiries(nextInquiries);
        setError(null);
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "Could not load follow-ups.");
      })
      .finally(() => setLoading(false));
  }, [loadData]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = records.filter((item) => {
      const matchesSearch =
        !query ||
        item.customerName.toLowerCase().includes(query) ||
        item.title.toLowerCase().includes(query);
      return (
        matchesSearch &&
        (!status || item.status === status) &&
        (!category || groupFor(item.status, item.dueAt) === category) &&
        (!priority || item.priority === priority)
      );
    });
    return result.sort((a, b) => {
      const diff = a.dueAt.getTime() - b.dueAt.getTime();
      return sort === "soonest" ? diff : -diff;
    });
  }, [records, search, status, category, priority, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function openCreate() {
    setEditing(null);
    setFormKey("create");
    setFormOpen(true);
  }

  function openEdit(item: FollowUpRecord) {
    setEditing(item);
    setFormKey(item.id);
    setFormOpen(true);
  }

  async function handleComplete(item: FollowUpRecord) {
    if (busyId) return;
    setBusyId(item.id);
    try {
      await completeFollowUp(uid, item.id);
      setNotice("Follow-up marked complete.");
      refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not complete the follow-up.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(item: FollowUpRecord) {
    if (busyId) return;
    setBusyId(item.id);
    try {
      await deleteFollowUp(uid, item.id);
      setNotice("Follow-up deleted.");
      setDeleteTarget(null);
      refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete the follow-up.");
    } finally {
      setBusyId(null);
    }
  }

  const metrics = [
    { label: "Overdue", value: counts?.overdue ?? 0, hint: "past due date", icon: AlertCircle },
    { label: "Due today", value: counts?.today ?? 0, hint: "today", icon: CalendarClock },
    { label: "Upcoming", value: counts?.upcoming ?? 0, hint: "scheduled ahead", icon: CalendarCheck },
    { label: "Completed", value: counts?.completed ?? 0, hint: "all time", icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageIntro title="Follow-ups" description="Schedule, track and complete every next step.">
        <button type="button" onClick={openCreate} className={buttonClasses("primary", "md", "h-9")}>
          <Plus className="size-4" aria-hidden="true" /> Schedule follow-up
        </button>
      </PageIntro>

      {notice ? <Notice tone="success" message={notice} onDismiss={() => setNotice(null)} /> : null}
      {error ? <Notice tone="danger" message={error} onDismiss={() => setError(null)} /> : null}

      {loading ? (
        <FollowUpsSkeleton />
      ) : error && records.length === 0 ? (
        <DashboardError title="We couldn't load your follow-ups" message={error} onRetry={refresh} />
      ) : (
        <>
          <section aria-label="Follow-up counts" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </section>

          <Card className="bg-surface/60 p-4 shadow-none sm:p-5">
            <p className="mb-3 text-[11px] font-semibold tracking-[0.12em] text-subtle uppercase">Filters</p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="relative xl:col-span-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
                <Input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search customer or title"
                  aria-label="Search follow-ups"
                  className="h-10 pl-9"
                />
              </div>
              <Select aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
                <option value="">All statuses</option>
                {FOLLOW_UP_STATUSES.map((option) => <option key={option} value={option}>{humanize(option)}</option>)}
              </Select>
              <Select aria-label="Filter by category" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
                <option value="">All categories</option>
                {GROUP_ORDER.map((option) => <option key={option} value={option}>{option === "today" ? "Due today" : humanize(option)}</option>)}
              </Select>
              <Select aria-label="Filter by priority" value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }}>
                <option value="">All priorities</option>
                {INQUIRY_PRIORITIES.map((option) => <option key={option} value={option}>{humanize(option)}</option>)}
              </Select>
              <Select aria-label="Sort follow-ups" value={sort} onChange={(e) => { setSort(e.target.value as Sort); setPage(1); }}>
                <option value="soonest">Due soonest</option>
                <option value="latest">Due latest</option>
              </Select>
            </div>
          </Card>

          <Card className="overflow-hidden bg-surface shadow-card">
            {visible.length === 0 ? (
              <div className="px-4 py-8 sm:px-5">
                <EmptyState
                  icon={CalendarClock}
                  headingLevel="h2"
                  title={records.length === 0 ? "No follow-ups yet" : "No matching follow-ups"}
                  description={
                    records.length === 0
                      ? "Schedule a follow-up from an inquiry to keep every customer moving."
                      : "Try changing your search or filters."
                  }
                >
                  {records.length === 0 ? (
                    <button type="button" onClick={openCreate} className={buttonClasses("primary", "md", "h-9")}>
                      <Plus className="size-4" aria-hidden="true" /> Schedule follow-up
                    </button>
                  ) : null}
                </EmptyState>
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[880px] text-left">
                    <thead>
                      <tr className="border-b border-line text-[12px] font-medium uppercase tracking-[0.06em] text-subtle">
                        <th scope="col" className="px-4 py-3">Follow-up</th>
                        <th scope="col" className="px-3 py-3">Due</th>
                        <th scope="col" className="px-3 py-3">Priority</th>
                        <th scope="col" className="px-3 py-3">Status</th>
                        <th scope="col" className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    {GROUP_ORDER.map((group) => {
                      const rows = visible.filter((item) => groupFor(item.status, item.dueAt) === group);
                      if (!rows.length) return null;
                      return (
                        <tbody key={group}>
                          <tr className="border-b border-line bg-surface/60">
                            <td colSpan={5} className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <FollowUpGroupBadge group={group} />
                                <span className="text-[11px] text-subtle">{rows.length}</span>
                              </div>
                            </td>
                          </tr>
                          {rows.map((item) => (
                            <tr key={item.id} className="border-b border-line/70 last:border-b-0 transition-colors hover:bg-surface/60">
                              <td className="px-4 py-3">
                                <Link href={`/follow-ups/${item.id}`} className="text-[13px] font-medium text-ink hover:text-brand">
                                  {item.title}
                                </Link>
                                <p className="mt-0.5 text-[12px] text-muted">{item.customerName}</p>
                              </td>
                              <td className="px-3 py-3 text-[12px] text-muted">
                                <time dateTime={item.dueAt.toISOString()}>{formatDateTime(item.dueAt)}</time>
                              </td>
                              <td className="px-3 py-3"><FollowUpPriorityBadge priority={item.priority} /></td>
                              <td className="px-3 py-3"><FollowUpStatusBadge status={item.status} /></td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end gap-0.5 whitespace-nowrap">
                                  <Link href={`/follow-ups/${item.id}`} className={buttonClasses("ghost", "sm", "h-8 px-2 text-muted hover:text-ink")}>
                                    View
                                  </Link>
                                  {item.status === "pending" ? (
                                    <button type="button" onClick={() => void handleComplete(item)} disabled={busyId === item.id} className={buttonClasses("ghost", "sm", "h-8 px-2 text-success")}>
                                      <CheckCircle2 className="size-3.5" aria-hidden="true" /> Complete
                                    </button>
                                  ) : null}
                                  <button type="button" onClick={() => openEdit(item)} className={buttonClasses("ghost", "sm", "h-8 px-2")} aria-label={`Edit ${item.title}`}>
                                    <Pencil className="size-3.5" aria-hidden="true" />
                                  </button>
                                  <button type="button" onClick={() => setDeleteTarget(item)} className={buttonClasses("ghost", "sm", "h-8 px-2 text-danger")} aria-label={`Delete ${item.title}`} title="Delete">
                                    <Trash2 className="size-3.5" aria-hidden="true" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      );
                    })}
                  </table>
                </div>

                <div className="divide-y divide-line/70 md:hidden">
                  {GROUP_ORDER.map((group) => {
                    const rows = visible.filter((item) => groupFor(item.status, item.dueAt) === group);
                    if (!rows.length) return null;
                    return (
                      <div key={group}>
                        <div className="border-b border-line bg-surface/60 px-4 py-2"><FollowUpGroupBadge group={group} /></div>
                        {rows.map((item) => (
                          <div key={item.id} className="flex flex-col gap-3 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <Link href={`/follow-ups/${item.id}`} className="text-[13px] font-semibold text-ink hover:text-brand">{item.title}</Link>
                                <p className="mt-0.5 text-[12px] text-muted">{item.customerName}</p>
                              </div>
                              <FollowUpStatusBadge status={item.status} />
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <FollowUpPriorityBadge priority={item.priority} />
                              <time dateTime={item.dueAt.toISOString()} className="text-[11px] text-subtle">{formatDateTime(item.dueAt)}</time>
                            </div>
                            <div className="flex items-center gap-2">
                              {item.status === "pending" ? (
                                <button type="button" onClick={() => void handleComplete(item)} disabled={busyId === item.id} className={buttonClasses("secondary", "sm")}>
                                  Complete
                                </button>
                              ) : null}
                              <button type="button" onClick={() => openEdit(item)} className={buttonClasses("ghost", "sm")}>Edit</button>
                              <button type="button" onClick={() => setDeleteTarget(item)} className={buttonClasses("ghost", "sm", "text-danger")} aria-label={`Delete ${item.title}`}>Delete</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-5">
                  <p className="text-[12px] text-muted">
                    Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage <= 1} aria-label="Previous page" className={buttonClasses("secondary", "sm", "h-8 px-2")}>‹</button>
                    <span className="text-[12px] text-muted">Page {currentPage} of {totalPages}</span>
                    <button type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= totalPages} aria-label="Next page" className={buttonClasses("secondary", "sm", "h-8 px-2")}>›</button>
                  </div>
                </div>
              </>
            )}
          </Card>
        </>
      )}

      <FollowUpFormDialog
        key={formKey}
        uid={uid}
        inquiries={inquiries}
        followUp={editing}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={(message) => { setNotice(message); refresh(); }}
      />

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete this follow-up?"
        description="This permanently removes the follow-up. An activity record remains in the timeline."
      >
        <p className="text-[13px] leading-relaxed text-muted">
          {deleteTarget ? `Delete “${deleteTarget.title}”? This cannot be undone.` : ""}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => setDeleteTarget(null)} disabled={busyId !== null} className={buttonClasses("secondary", "md", "h-10")}>Keep follow-up</button>
          <button
            type="button"
            disabled={busyId !== null}
            onClick={() => { if (deleteTarget) void handleDelete(deleteTarget); }}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-danger px-4 text-sm font-semibold text-white transition-colors hover:bg-danger/90 disabled:opacity-70"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            {busyId ? "Deleting…" : "Delete follow-up"}
          </button>
        </div>
      </Dialog>
    </div>
  );
}
