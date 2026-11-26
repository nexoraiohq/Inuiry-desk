"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import type {
  CommunicationRecord,
  FollowUpRecord,
  InquiryRecord,
} from "@/lib/dashboard/types";
import { listCommunications } from "@/lib/communications/service";
import { listFollowUps } from "@/lib/follow-ups/service";
import { listInquiries } from "@/lib/inquiries/service";

type Results = {
  inquiries: InquiryRecord[];
  followUps: FollowUpRecord[];
  communications: CommunicationRecord[];
};

const EMPTY: Results = { inquiries: [], followUps: [], communications: [] };

/** Header search with ⌘K / Ctrl+K shortcut. Reads only the current workspace. */
export function HeaderSearch() {
  const { user, status } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Results>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const runSearch = useCallback(
    async (term: string) => {
      if (!user) return;
      const q = term.trim().toLowerCase();
      if (!q) {
        setResults(EMPTY);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const [inquiries, followUps, communications] = await Promise.all([
          listInquiries(user.uid),
          listFollowUps(user.uid),
          listCommunications(user.uid),
        ]);
        setResults({
          inquiries: inquiries
            .filter((item) =>
              [item.fullName, item.service, item.phone, item.email ?? ""].some((value) =>
                value.toLowerCase().includes(q)
              )
            )
            .slice(0, 5),
          followUps: followUps
            .filter((item) =>
              [item.title, item.customerName, item.description ?? ""].some((value) =>
                value.toLowerCase().includes(q)
              )
            )
            .slice(0, 5),
          communications: communications
            .filter((item) =>
              [item.summary, item.channel, item.outcome].some((value) =>
                value.toLowerCase().includes(q)
              )
            )
            .slice(0, 5),
        });
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Search failed. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  useEffect(() => {
    if (!open || !user) return;
    const timer = window.setTimeout(() => void runSearch(query), 150);
    return () => window.clearTimeout(timer);
  }, [open, user, query, runSearch]);

  if (status !== "ready") return null;

  const total =
    results.inquiries.length + results.followUps.length + results.communications.length;

  return (
    <>
      <button
        type="button"
        onClick={() => { setQuery(""); setResults(EMPTY); setOpen(true); }}
        className="hidden h-9 w-56 items-center gap-2 rounded-lg border border-line bg-canvas px-3 text-left text-sm text-subtle transition-colors hover:bg-surface md:flex xl:w-64"
      >
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <span className="flex-1 truncate">Search workspace…</span>
        <kbd className="rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] font-medium text-subtle">
          ⌘K
        </kbd>
      </button>
      <button
        type="button"
        onClick={() => { setQuery(""); setResults(EMPTY); setOpen(true); }}
        aria-label="Search workspace"
        className="grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-ink md:hidden"
      >
        <Search className="size-[18px]" aria-hidden="true" />
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Search workspace"
        description="Search inquiries, follow-ups and recorded interactions."
      >
        <Input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name, phone, title or summary"
          aria-label="Search workspace"
        />
        {error ? <div className="mt-4"><Notice tone="danger" message={error} onDismiss={() => setError(null)} /></div> : null}

        <div className="mt-5 max-h-[45vh] overflow-y-auto">
          {loading ? (
            <p className="text-[12px] text-subtle">Searching…</p>
          ) : !query.trim() ? (
            <p className="text-[12px] text-subtle">Type at least one character to search.</p>
          ) : total === 0 ? (
            <p className="text-[12px] text-subtle">No matches in this workspace.</p>
          ) : (
            <div className="space-y-5">
              {results.inquiries.length > 0 ? (
                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-subtle">Inquiries</h3>
                  <ul className="mt-2 space-y-1.5">
                    {results.inquiries.map((item) => (
                      <li key={item.id}>
                        <Link href={`/inquiries/${item.id}`} onClick={() => setOpen(false)} className="block rounded-lg px-2 py-1.5 transition-colors hover:bg-surface">
                          <span className="block truncate text-[13px] font-medium text-ink">{item.fullName}</span>
                          <span className="block truncate text-[11px] text-muted">{item.service} · {item.phone}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {results.followUps.length > 0 ? (
                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-subtle">Follow-ups</h3>
                  <ul className="mt-2 space-y-1.5">
                    {results.followUps.map((item) => (
                      <li key={item.id}>
                        <Link href={`/follow-ups/${item.id}`} onClick={() => setOpen(false)} className="block rounded-lg px-2 py-1.5 transition-colors hover:bg-surface">
                          <span className="block truncate text-[13px] font-medium text-ink">{item.title}</span>
                          <span className="block truncate text-[11px] text-muted">{item.customerName}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {results.communications.length > 0 ? (
                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-subtle">Interactions</h3>
                  <ul className="mt-2 space-y-1.5">
                    {results.communications.map((item) => (
                      <li key={item.id}>
                        <Link href={`/inquiries/${item.inquiryId}`} onClick={() => setOpen(false)} className="block rounded-lg px-2 py-1.5 transition-colors hover:bg-surface">
                          <span className="block truncate text-[13px] font-medium text-ink">{item.summary}</span>
                          <span className="block truncate text-[11px] text-muted">{item.channel} · {item.outcome}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          )}
        </div>
      </Dialog>
    </>
  );
}
