import Link from "next/link";
import { ArrowUpRight, CalendarClock } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses } from "@/components/ui/button";
import { Panel } from "@/components/dashboard/panel";
import { formatDateTime, formatRelative, isOverdue } from "@/lib/dashboard/format";
import type { FollowUpRecord } from "@/lib/dashboard/types";

export function UpcomingFollowUps({
  followUps,
}: {
  followUps: FollowUpRecord[];
}) {
  return (
    <Panel
      title="Next follow-ups"
      description="Who to contact next, and when."
      meta={followUps.length ? `Next ${followUps.length}` : undefined}
      action={{ href: "/follow-ups", label: "All follow-ups" }}
    >
      {followUps.length === 0 ? (
        <div className="px-4 py-6 sm:px-5">
          <EmptyState
            icon={CalendarClock}
            headingLevel="h3"
            title="Nothing scheduled"
            description="Schedule a follow-up from an inquiry and it will show here, closest due date first."
          >
            <Link href="/follow-ups" className={buttonClasses("secondary", "sm")}>
              Open follow-ups
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          </EmptyState>
        </div>
      ) : (
        <ul className="divide-y divide-line/70">
          {followUps.map((followUp) => {
            const overdue = isOverdue(followUp.dueAt);
            return (
              <li
                key={followUp.id}
                className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-surface/60 sm:px-5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium text-ink">
                    {followUp.customerName}
                  </p>
                  <p className="mt-0.5 truncate text-[13px] text-muted">
                    {followUp.title}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <time
                    dateTime={followUp.dueAt.toISOString()}
                    title={formatDateTime(followUp.dueAt)}
                    className={`text-[12px] font-medium ${overdue ? "text-danger" : "text-ink"}`}
                  >
                    {formatRelative(followUp.dueAt)}
                  </time>
                  {overdue ? (
                    <span className="rounded-full bg-danger-soft px-2 py-0.5 text-[10px] font-semibold text-danger">
                      Overdue
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
