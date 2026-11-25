import type { Metadata } from "next";
import { Activity, CalendarClock, CircleDot, Inbox, Timer } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getPageMetadata } from "@/lib/navigation";

export const metadata: Metadata = getPageMetadata("/dashboard");

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
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div className="min-w-0">
        <h2 className="font-display text-base font-semibold tracking-[-0.01em] text-ink">
          {title}
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">
          {description}
        </p>
      </div>
      <span className="shrink-0 text-xs text-subtle">{meta}</span>
    </div>
  );
}

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <section aria-labelledby="metrics-heading">
        <h2 id="metrics-heading" className="sr-only">
          Key metrics
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {METRICS.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <PanelHeader
            title="Inquiry activity"
            description="Every change to an inquiry is recorded here as your team works."
            meta="No data yet"
          />
          <div className="px-5 py-6">
            <EmptyState
              icon={Activity}
              headingLevel="h3"
              title="No activity yet"
              description="Updates to inquiries and follow-ups will appear here once your workspace is connected."
            />
          </div>
        </Card>

        <Card className="overflow-hidden">
          <PanelHeader
            title="Follow-ups"
            description="The next step for every potential customer."
            meta="No data yet"
          />
          <div className="px-5 py-6">
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
