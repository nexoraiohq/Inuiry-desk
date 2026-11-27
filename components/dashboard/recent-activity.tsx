import {
  Activity as ActivityIcon,
  CalendarClock,
  CalendarX2,
  CheckCircle2,
  MessageSquare,
  Phone,
  RotateCcw,
  StickyNote,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/dashboard/panel";
import { cn } from "@/lib/cn";
import { formatRelative } from "@/lib/dashboard/format";
import type { ActivityRecord, ActivityType } from "@/lib/dashboard/types";

export const activityIcons: Record<ActivityType, LucideIcon> = {
  inquiry_created: MessageSquare,
  status_changed: ActivityIcon,
  communication_logged: Phone,
  follow_up_created: CalendarClock,
  follow_up_completed: CheckCircle2,
  follow_up_rescheduled: RotateCcw,
  follow_up_cancelled: CalendarX2,
  follow_up_deleted: Trash2,
  note_added: StickyNote,
};

export const activityTones: Record<ActivityType, string> = {
  inquiry_created: "bg-brand-soft text-brand",
  status_changed: "bg-surface text-muted",
  communication_logged: "bg-brand-soft text-brand",
  follow_up_created: "bg-brand-soft text-brand",
  follow_up_completed: "bg-success-soft text-success",
  follow_up_rescheduled: "bg-brand-soft text-brand",
  follow_up_cancelled: "bg-danger-soft text-danger",
  follow_up_deleted: "bg-danger-soft text-danger",
  note_added: "bg-surface text-muted",
};

export function RecentActivity({ activities }: { activities: ActivityRecord[] }) {
  return (
    <Panel
      title="Recent activity"
      description="Changes to inquiries and follow-ups, newest first."
      icon={ActivityIcon}
      meta={activities.length ? `Latest ${activities.length}` : undefined}
    >
      {activities.length === 0 ? (
        <div className="px-4 py-6 sm:px-5">
          <EmptyState
            icon={ActivityIcon}
            headingLevel="h3"
            title="No activity yet"
            description="When you add an inquiry or change its status, you will see it here."
          />
        </div>
      ) : (
        <ul className="divide-y divide-line/70">
          {activities.map((activity) => {
            const Icon = activityIcons[activity.type];
            return (
              <li
                key={activity.id}
                className="flex items-start gap-3 px-4 py-3.5 sm:px-5"
              >
                <span
                  className={cn(
                    "mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg sm:size-8",
                    activityTones[activity.type]
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] leading-5 text-ink">
                    {activity.description}
                  </p>
                </div>
                <time
                  dateTime={activity.createdAt.toISOString()}
                  className="shrink-0 text-[12px] text-subtle"
                >
                  {formatRelative(activity.createdAt)}
                </time>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
