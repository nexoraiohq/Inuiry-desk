import Link from "next/link";
import { ArrowUpRight, CalendarClock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatRelative } from "@/lib/dashboard/format";
import type { FollowUpRecord } from "@/lib/dashboard/types";

/**
 * Compact follow-up list using the dashboard's upcoming window.
 * The due count comes from the real aggregate metric rather than a guess.
 */
export function PriorityQueue({
  followUps,
  followUpsDue,
  newInquiries,
}: {
  followUps: FollowUpRecord[];
  followUpsDue: number;
  newInquiries: number;
}) {
  const next = [...followUps]
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
    .slice(0, 4);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
            <CalendarClock className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-muted">Follow-up watch</p>
            <p className="mt-1 text-[11px] text-subtle">What is due and what is coming up next</p>
          </div>
        </div>
        <Link href="/follow-ups" className="inline-flex items-center gap-1 text-[12px] font-medium text-brand hover:text-brand-strong">
          View all <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid grid-cols-2 divide-x divide-line border-b border-line">
        <div className="px-5 py-4">
          <p className="text-[11px] text-subtle">Due now</p>
          <p className="mt-1 font-display text-[24px] leading-none font-semibold tabular-nums text-ink">{followUpsDue}</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[11px] text-subtle">Awaiting reply</p>
          <p className="mt-1 font-display text-[24px] leading-none font-semibold tabular-nums text-ink">{newInquiries}</p>
        </div>
      </div>

      {next.length ? (
        <ul className="divide-y divide-line">
          {next.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-4 px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-ink">{item.customerName}</p>
                <p className="truncate text-[12px] text-muted">{item.title}</p>
              </div>
              <span className="shrink-0 text-[11px] text-muted">{formatRelative(item.dueAt)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex items-center gap-3 px-5 py-10 text-[13px] text-muted">
          <CalendarClock className="size-5 text-subtle" aria-hidden="true" />
          No follow-ups scheduled.
        </div>
      )}
    </Card>
  );
}
