import { cn } from "@/lib/cn";
import { humanize } from "@/lib/dashboard/format";
import type { InquiryPriority } from "@/lib/dashboard/types";
import type { FollowUpGroup } from "@/lib/follow-ups/date";
import type { FollowUpStatus } from "@/lib/dashboard/types";

const statusTones: Record<FollowUpStatus, string> = {
  pending: "bg-brand-soft text-brand",
  completed: "bg-success-soft text-success",
  cancelled: "bg-surface text-muted",
};

const groupTones: Record<FollowUpGroup, string> = {
  overdue: "bg-danger-soft text-danger",
  today: "bg-brand-soft text-brand",
  upcoming: "bg-surface text-muted",
  completed: "bg-success-soft text-success",
  cancelled: "bg-surface text-muted",
};

const priorityTones: Record<InquiryPriority, string> = {
  high: "bg-danger-soft text-danger",
  normal: "bg-brand-soft text-brand",
  low: "bg-surface text-muted",
};

function Pill({ label, tone }: { label: string; tone: string }) {
  return (
    <span className={cn("inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold", tone)}>
      {label}
    </span>
  );
}

export function FollowUpStatusBadge({ status }: { status: FollowUpStatus }) {
  return <Pill label={humanize(status)} tone={statusTones[status]} />;
}

export function FollowUpGroupBadge({ group }: { group: FollowUpGroup }) {
  const label = group === "today" ? "Due today" : humanize(group);
  return <Pill label={label} tone={groupTones[group]} />;
}

export function FollowUpPriorityBadge({ priority }: { priority: InquiryPriority }) {
  return <Pill label={humanize(priority)} tone={priorityTones[priority]} />;
}
