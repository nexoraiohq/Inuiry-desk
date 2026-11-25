import { Inbox } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { SourceBadge, StatusBadge } from "@/components/dashboard/badges";
import { Panel } from "@/components/dashboard/panel";
import { formatDate } from "@/lib/dashboard/format";
import type { InquiryRecord } from "@/lib/dashboard/types";

export function RecentInquiries({ inquiries }: { inquiries: InquiryRecord[] }) {
  return (
    <Panel
      title="Recent inquiries"
      description="The latest requests arriving in your workspace."
      meta={inquiries.length ? `${inquiries.length} shown` : "No data yet"}
    >
      {inquiries.length === 0 ? (
        <div className="px-4 py-6 sm:px-5">
          <EmptyState
            icon={Inbox}
            headingLevel="h3"
            title="No inquiries yet"
            description="When a customer gets in touch, their inquiry will appear here with its status and source."
          />
        </div>
      ) : (
        <ul className="divide-y divide-line/70">
          {inquiries.map((inquiry) => (
            <li
              key={inquiry.id}
              className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-ink">
                  {inquiry.fullName}
                </p>
                <p className="mt-0.5 truncate text-[12px] text-muted">
                  {inquiry.service}
                </p>
              </div>
              <div className="sm:w-32">
                <SourceBadge source={inquiry.source} />
              </div>
              <div className="sm:w-28">
                <StatusBadge status={inquiry.status} />
              </div>
              <time
                dateTime={inquiry.createdAt.toISOString()}
                className="text-[11px] text-subtle"
              >
                {formatDate(inquiry.createdAt)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
