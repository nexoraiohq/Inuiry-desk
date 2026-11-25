import { CalendarClock } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
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
      title="Upcoming follow-ups"
      description="The next conversations you need to have."
      meta={followUps.length ? `${followUps.length} shown` : "No data yet"}
    >
      {followUps.length === 0 ? (
        <div className="px-4 py-6 sm:px-5">
          <EmptyState
            icon={CalendarClock}
            headingLevel="h3"
            title="Nothing scheduled"
            description="Follow-ups attached to inquiries will appear here, ordered by their due date."
          />
        </div>
      ) : (
        <ul className="divide-y divide-line/70">
          {followUps.map((followUp) => {
            const overdue = isOverdue(followUp.dueAt);
            return (
              <li
                key={followUp.id}
                className="flex items-start gap-3 px-4 py-3.5 sm:px-5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-ink">
                    {followUp.customerName}
                  </p>
                  <p className="mt-0.5 truncate text-[12px] text-muted">
                    {followUp.title}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <time
                    dateTime={followUp.dueAt.toISOString()}
                    title={formatDateTime(followUp.dueAt)}
                    className="text-[11px] font-medium text-ink"
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
