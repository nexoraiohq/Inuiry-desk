import type { Metadata } from "next";
import { Activity, CalendarClock, CircleDot, Inbox, Timer } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getNavItem, getPageMetadata } from "@/lib/navigation";

export const metadata: Metadata = getPageMetadata("/dashboard");

// Next 16 instant-navigation validation: this segment opts out so it renders normally.
export const instant = false;

const METRICS = [
  { label: "Total inquiries", icon: Inbox },
  { label: "Open inquiries", icon: CircleDot },
  { label: "Follow-ups due", icon: CalendarClock },
  { label: "Avg. response time", icon: Timer },
];

function PanelHeader({
  title,
  description,
  meta,
}: {
  title: string;
  description: string;
  meta: string;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-line px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-5 sm:py-4">
      <div className="min-w-0">
        <h2 className="font-display text-[14px] font-semibold tracking-[-0.01em] text-ink sm:text-[15px]">
          {title}
        </h2>
        <p className="mt-1 text-[12px] leading-relaxed text-muted sm:text-[13px]">{description}</p>
      </div>
      <span className="text-[10px] text-subtle sm:text-[11px]">{meta}</span>
    </div>
  );
}

export default function OverviewPage() {
  const page = getNavItem("/dashboard");

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader title={page.title} description={page.description} />

      <section aria-label="Key metrics" className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {METRICS.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
        <Card className="overflow-hidden bg-canvas/80 shadow-card lg:col-span-2">
          <PanelHeader
            title="Inquiry activity"
            description="Every change to an inquiry is recorded here as your team works."
            meta="No data yet"
          />
          <div className="px-4 py-5 sm:px-5 sm:py-6">
            <EmptyState
              icon={Activity}
              headingLevel="h3"
              title="No activity yet"
              description="Updates to inquiries and follow-ups will appear here once your workspace is connected."
            />
          </div>
        </Card>

        <Card className="overflow-hidden bg-canvas/80 shadow-card">
          <PanelHeader
            title="Follow-ups"
            description="The next step for every potential customer."
            meta="No data yet"
          />
          <div className="px-4 py-5 sm:px-5 sm:py-6">
            <EmptyState
              icon={CalendarClock}
              headingLevel="h3"
              title="Nothing due yet"
              description="Follow-ups you schedule on an inquiry will be listed here so nothing slips through."
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
