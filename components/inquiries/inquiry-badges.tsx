import { cn } from "@/lib/cn";
import { humanize } from "@/lib/dashboard/format";
import type { InquiryPriority } from "@/lib/dashboard/types";

export { StatusBadge, SourceBadge } from "@/components/dashboard/badges";

const priorityTones: Record<InquiryPriority, string> = {
  high: "bg-danger-soft text-danger",
  normal: "bg-brand-soft text-brand",
  low: "bg-surface text-muted",
};

export function PriorityBadge({ priority }: { priority: InquiryPriority }) {
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-medium",
        priorityTones[priority]
      )}
    >
      {humanize(priority)}
    </span>
  );
}
