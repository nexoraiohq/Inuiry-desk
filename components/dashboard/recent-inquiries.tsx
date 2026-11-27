import Link from "next/link";
import { ArrowUpRight, Inbox } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses } from "@/components/ui/button";
import { SourceBadge, StatusBadge } from "@/components/dashboard/badges";
import { Panel } from "@/components/dashboard/panel";
import { formatDate } from "@/lib/dashboard/format";
import type { InquiryRecord } from "@/lib/dashboard/types";

export function RecentInquiries({ inquiries }: { inquiries: InquiryRecord[] }) {
  return (
    <Panel
      title="Recent inquiries"
      description="The newest enquiries, where they came from and where they stand."
      icon={Inbox}
      meta={inquiries.length ? `Latest ${inquiries.length}` : undefined}
      action={{ href: "/inquiries", label: "All inquiries" }}
    >
      {inquiries.length === 0 ? (
        <div className="px-4 py-6 sm:px-5">
          <EmptyState
            icon={Inbox}
            headingLevel="h3"
            title="No inquiries yet"
            description="Add your first enquiry and it will appear here with its source and status."
          >
            <Link href="/inquiries" className={buttonClasses("secondary", "sm")}>
              Go to inquiries
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          </EmptyState>
        </div>
      ) : (
        <ul className="divide-y divide-line/70">
          {inquiries.map((inquiry) => (
            <li
              key={inquiry.id}
              className="flex flex-col gap-2 px-4 py-3.5 transition-colors hover:bg-surface/60 sm:flex-row sm:items-center sm:gap-4 sm:px-5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-ink">
                  {inquiry.fullName}
                </p>
                <p className="mt-0.5 truncate text-[13px] text-muted">
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
                className="text-[12px] text-subtle"
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
