"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  CircleDot,
  GripVertical,
  Inbox,
  Pin,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { DashboardError } from "@/components/dashboard/dashboard-error";
import { InquiryFormDialog } from "@/components/inquiries/inquiry-form-dialog";
import { InquiryActions } from "@/components/inquiries/inquiry-actions";
import { PriorityBadge, SourceBadge, StatusBadge } from "@/components/inquiries/inquiry-badges";
import { InquiriesSkeleton } from "@/components/inquiries/inquiries-skeleton";
import { formatDate, humanize } from "@/lib/dashboard/format";
import { getInquiryCounts } from "@/lib/dashboard/service";
import {
  INQUIRY_PRIORITIES,
  INQUIRY_SOURCES,
  INQUIRY_STATUSES,
  type InquiryRecord,
} from "@/lib/dashboard/types";
import {
  INQUIRY_PAGE_SIZE,
  archiveInquiry,
  listInquiries,
  reorderInquiries,
  setInquiryPinned,
} from "@/lib/inquiries/service";
import { Dialog } from "@/components/ui/dialog";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { PageIntro } from "@/components/ui/page-intro";
import { Select } from "@/components/ui/select";

type Sort = "newest" | "oldest" | "name" | "manual";

export function InquiriesView({ uid }: { uid: string }) {
  const [inquiries, setInquiries] = useState<InquiryRecord[]>([]);
  const [counts, setCounts] = useState({ total: 0, newCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [priority, setPriority] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InquiryRecord | null>(null);
  const [formKey, setFormKey] = useState("create");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<InquiryRecord | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const loadData = useCallback(
    async () => Promise.all([listInquiries(uid, includeArchived), getInquiryCounts(uid)]),
    [uid, includeArchived]
  );

  useEffect(() => {
    let active = true;
    void loadData()
      .then(([list, nextCounts]) => {
        if (!active) return;
        setInquiries(list);
        setCounts(nextCounts);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "Could not load inquiries.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadData]);

  const refresh = useCallback(() => {
    setLoading(true);
    void loadData()
      .then(([list, nextCounts]) => {
        setInquiries(list);
        setCounts(nextCounts);
        setError(null);
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "Could not load inquiries.");
      })
      .finally(() => setLoading(false));
  }, [loadData]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = inquiries.filter((item) => {
      const matchesSearch =
        !query ||
        [item.fullName, item.phone, item.email ?? ""].some((value) =>
          value.toLowerCase().includes(query)
        );
      return (
        matchesSearch &&
        (!status || item.status === status) &&
        (!source || item.source === source) &&
        (!priority || item.priority === priority)
      );
    });

    return result.sort((a, b) => {
      const pinDiff = Number(b.pinned) - Number(a.pinned);
      if (pinDiff !== 0) return pinDiff;
      if (sort === "manual") return a.sortOrder - b.sortOrder;
      if (sort === "name") return a.fullName.localeCompare(b.fullName);
      const diff = a.createdAt.getTime() - b.createdAt.getTime();
      return sort === "newest" ? -diff : diff;
    });
  }, [inquiries, search, status, source, priority, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / INQUIRY_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice(
    (currentPage - 1) * INQUIRY_PAGE_SIZE,
    currentPage * INQUIRY_PAGE_SIZE
  );

  function openCreate() {
    setEditing(null);
    setFormKey("create");
    setDialogOpen(true);
  }

  function openEdit(item: InquiryRecord) {
    setEditing(item);
    setFormKey(item.id);
    setDialogOpen(true);
  }

  const hasFilters = Boolean(search || status || source || priority);
  const manualMode = sort === "manual" && !hasFilters;

  async function handlePin(item: InquiryRecord) {
    if (actionBusy) return;
    setActionBusy(true);
    try {
      await setInquiryPinned(uid, item.id, !item.pinned);
      setNotice(item.pinned ? "Inquiry unpinned." : "Inquiry pinned to the top.");
      refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update the pin.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleArchive(item: InquiryRecord, archived: boolean) {
    if (actionBusy) return;
    setActionBusy(true);
    try {
      await archiveInquiry(uid, item.id, archived);
      setNotice(archived ? "Inquiry archived. Its history is preserved." : "Inquiry restored.");
      setArchiveTarget(null);
      refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update the inquiry.");
    } finally {
      setActionBusy(false);
    }
  }

  async function applyOrder(ids: string[]) {
    setActionBusy(true);
    try {
      await reorderInquiries(uid, ids);
      setNotice("Order saved.");
      refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the order.");
    } finally {
      setActionBusy(false);
      setDraggingId(null);
    }
  }

  function handleMove(item: InquiryRecord, direction: -1 | 1) {
    if (!manualMode) return;
    const ids = filtered.map((record) => record.id);
    const from = ids.indexOf(item.id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= ids.length) return;
    const next = [...ids];
    [next[from], next[to]] = [next[to], next[from]];
    void applyOrder(next);
  }

  function handleDrop(targetId: string) {
    if (!manualMode || !draggingId || draggingId === targetId) return;
    const ids = filtered.map((record) => record.id);
    const from = ids.indexOf(draggingId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = [...ids];
    next.splice(to, 0, next.splice(from, 1)[0]);
    void applyOrder(next);
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageIntro
        title="Inquiries"
        description="Capture, organize and track every customer inquiry."
      >
        <button type="button" onClick={openCreate} className={buttonClasses("primary", "md", "h-9")}>
          <Plus className="size-4" aria-hidden="true" />
          Add Inquiry
        </button>
      </PageIntro>

      {notice ? <Notice tone="success" message={notice} onDismiss={() => setNotice(null)} /> : null}
      {error ? <Notice tone="danger" message={error} onDismiss={() => setError(null)} /> : null}

      {loading ? (
        <InquiriesSkeleton />
      ) : error && inquiries.length === 0 ? (
        <DashboardError
          title="We couldn't load your inquiries"
          message={error}
          onRetry={refresh}
        />
      ) : (
        <>
          <section aria-label="Inquiry counts" className="grid gap-3 sm:grid-cols-2">
            <MetricCard label="Total inquiries" value={counts.total} hint="all recorded inquiries" icon={Inbox} />
            <MetricCard label="New inquiries" value={counts.newCount} hint="awaiting first contact" icon={CircleDot} />
          </section>

          <Card className="bg-surface/60 p-4 shadow-none sm:p-5">
            <p className="mb-3 text-[11px] font-semibold tracking-[0.12em] text-subtle uppercase">Filters</p>
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
                <Input
                  value={search}
                  onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                  placeholder="Search name, phone or email"
                  aria-label="Search inquiries"
                  className="h-10 pl-9"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Select aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
                  <option value="">All statuses</option>
                  {INQUIRY_STATUSES.map((option) => <option key={option} value={option}>{humanize(option)}</option>)}
                </Select>
                <Select aria-label="Filter by source" value={source} onChange={(e) => { setSource(e.target.value); setPage(1); }}>
                  <option value="">All sources</option>
                  {INQUIRY_SOURCES.map((option) => <option key={option} value={option}>{humanize(option)}</option>)}
                </Select>
                <Select aria-label="Filter by priority" value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }}>
                  <option value="">All priorities</option>
                  {INQUIRY_PRIORITIES.map((option) => <option key={option} value={option}>{humanize(option)}</option>)}
                </Select>
                <Select aria-label="Sort inquiries" value={sort} onChange={(e) => { setSort(e.target.value as Sort); setPage(1); }}>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="name">Customer name</option>
                  <option value="manual">Manual order</option>
                </Select>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                <label className="flex cursor-pointer items-center gap-2 text-[12px] text-muted">
                  <input
                    type="checkbox"
                    checked={includeArchived}
                    onChange={(event) => { setIncludeArchived(event.target.checked); setLoading(true); }}
                    className="size-4 rounded border-line accent-brand"
                  />
                  Show archived
                </label>
                {sort === "manual" && !hasFilters ? (
                  <span className="text-[11px] text-subtle">Drag rows or use the arrows to reorder.</span>
                ) : null}
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden bg-surface shadow-card">
            {visible.length === 0 ? (
              <div className="px-4 py-8 sm:px-5">
                <EmptyState
                  icon={Inbox}
                  headingLevel="h2"
                  title={hasFilters ? "No matching inquiries" : "No inquiries yet"}
                  description={
                    hasFilters
                      ? "Try changing your search or filters to see more results."
                      : "Add your first inquiry to start tracking potential customers."
                  }
                >
                  {!hasFilters ? (
                    <button type="button" onClick={openCreate} className={buttonClasses("primary", "md", "h-9")}>
                      <Plus className="size-4" aria-hidden="true" /> Add Inquiry
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
                        <th scope="col" className="px-4 py-3">Customer</th>
                        <th scope="col" className="px-3 py-3">Service / Source</th>
                        <th scope="col" className="px-3 py-3">Priority / Status</th>
                        <th scope="col" className="px-3 py-3">Added</th>
                        <th scope="col" className="whitespace-nowrap px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((item) => (
                        <tr
                          key={item.id}
                          draggable={manualMode}
                          onDragStart={() => setDraggingId(item.id)}
                          onDragOver={(event) => { if (manualMode) event.preventDefault(); }}
                          onDrop={(event) => { event.preventDefault(); handleDrop(item.id); }}
                          className={`border-b border-line/70 transition-colors last:border-b-0 hover:bg-surface/60 ${draggingId === item.id ? "opacity-50" : ""}`}
                        >
                          <td className="px-4 py-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                {manualMode ? <GripVertical className="size-3.5 shrink-0 text-subtle" aria-hidden="true" /> : null}
                                {item.pinned ? <Pin className="size-3.5 shrink-0 text-brand" aria-label="Pinned" /> : null}
                                <Link href={`/inquiries/${item.id}`} className="truncate text-[13px] font-medium text-ink hover:text-brand">
                                  {item.fullName}
                                </Link>
                                {item.archived ? <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold text-muted">Archived</span> : null}
                              </div>
                              <p className="mt-1 truncate text-[12px] text-muted">
                                {item.phone}
                                {item.email ? <span className="text-subtle"> · {item.email}</span> : null}
                              </p>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <p className="truncate text-[13px] text-ink">{item.service}</p>
                            <div className="mt-1"><SourceBadge source={item.source} /></div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-col items-start gap-1">
                              <PriorityBadge priority={item.priority} />
                              <StatusBadge status={item.status} />
                            </div>
                          </td>
                          <td className="px-3 py-3 text-[12px] text-muted">
                            <time dateTime={item.createdAt.toISOString()}>{formatDate(item.createdAt)}</time>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            <div className="flex justify-end">
                              <InquiryActions
                                item={item}
                                manualMode={manualMode}
                                busy={actionBusy}
                                onPin={() => void handlePin(item)}
                                onEdit={() => openEdit(item)}
                                onArchive={() => setArchiveTarget(item)}
                                onRestore={() => void handleArchive(item, false)}
                                onMove={(direction) => handleMove(item, direction)}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <ul className="divide-y divide-line/70 md:hidden">
                  {visible.map((item) => (
                    <li
                      key={item.id}
                      draggable={manualMode}
                      onDragStart={() => setDraggingId(item.id)}
                      onDragOver={(event) => { if (manualMode) event.preventDefault(); }}
                      onDrop={(event) => { event.preventDefault(); handleDrop(item.id); }}
                      className={`flex flex-col gap-3 p-4 ${draggingId === item.id ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            {manualMode ? <GripVertical className="size-3.5 shrink-0 text-subtle" aria-hidden="true" /> : null}
                            {item.pinned ? <Pin className="size-3.5 shrink-0 text-brand" aria-label="Pinned" /> : null}
                            <Link href={`/inquiries/${item.id}`} className="truncate text-[13px] font-semibold text-ink hover:text-brand">
                              {item.fullName}
                            </Link>
                            {item.archived ? <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold text-muted">Archived</span> : null}
                          </div>
                          <p className="mt-0.5 truncate text-[12px] text-muted">{item.service}</p>
                        </div>
                        <StatusBadge status={item.status} />
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <SourceBadge source={item.source} />
                        <PriorityBadge priority={item.priority} />
                        <time dateTime={item.createdAt.toISOString()} className="text-[11px] text-subtle">
                          {formatDate(item.createdAt)}
                        </time>
                      </div>
                      <InquiryActions
                        item={item}
                        manualMode={manualMode}
                        busy={actionBusy}
                        onPin={() => void handlePin(item)}
                        onEdit={() => openEdit(item)}
                        onArchive={() => setArchiveTarget(item)}
                        onRestore={() => void handleArchive(item, false)}
                        onMove={(direction) => handleMove(item, direction)}
                      />
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-5">
                  <p className="text-[12px] text-muted">
                    Showing {(currentPage - 1) * INQUIRY_PAGE_SIZE + 1}–{Math.min(currentPage * INQUIRY_PAGE_SIZE, filtered.length)} of {filtered.length}
                    {inquiries.length > filtered.length ? ` (${inquiries.length} loaded)` : ""}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPage(currentPage - 1)}
                      disabled={currentPage <= 1}
                      aria-label="Previous page"
                      className={buttonClasses("secondary", "sm", "h-8 px-2")}
                    >
                      <ChevronLeft className="size-4" aria-hidden="true" />
                    </button>
                    <span className="text-[12px] text-muted">Page {currentPage} of {totalPages}</span>
                    <button
                      type="button"
                      onClick={() => setPage(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                      aria-label="Next page"
                      className={buttonClasses("secondary", "sm", "h-8 px-2")}
                    >
                      <ChevronRight className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </Card>
        </>
      )}

      <Dialog
        open={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        title="Archive inquiry?"
        description="This hides the inquiry from your active list. Its details, follow-ups and activity history are preserved."
      >
        <p className="text-[13px] leading-relaxed text-muted">
          {archiveTarget ? `Archive “${archiveTarget.fullName}”? You can restore it later from Show archived.` : ""}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => setArchiveTarget(null)} className={buttonClasses("secondary", "md", "h-10")}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => { if (archiveTarget) void handleArchive(archiveTarget, true); }}
            disabled={actionBusy}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-danger px-4 text-sm font-semibold text-white transition-colors hover:bg-danger/90 disabled:opacity-70"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            {actionBusy ? "Archiving…" : "Archive inquiry"}
          </button>
        </div>
      </Dialog>

      <InquiryFormDialog
        key={formKey}
        uid={uid}
        open={dialogOpen}
        inquiry={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={(message) => { setNotice(message); refresh(); }}
      />
    </div>
  );
}
