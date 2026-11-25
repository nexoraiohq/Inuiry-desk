import type { Metadata } from "next";
import { Activity, CalendarClock, CircleDot, Inbox, Timer } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getPageMetadata } from "@/lib/navigation";

export const metadata: Metadata = getPageMetadata("/dashboard");

const METRICS = [
  { label: "Total inquiries", icon: Inbox },
  { label: "Open inquiries", icon: CircleDot },
  { label: "Follow-ups due", icon: CalendarClock },
  { label: "Avg. response time", icon: Timer },
];

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

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Inquiry activity</CardTitle>
            <CardDescription>
              Every change to an inquiry is recorded here as your team works.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Activity}
              headingLevel="h3"
              title="No activity yet"
              description="Updates to inquiries and follow-ups will appear here once your workspace is connected."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Follow-ups</CardTitle>
            <CardDescription>
              The next step for every potential customer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={CalendarClock}
              headingLevel="h3"
              title="Nothing due yet"
              description="Follow-ups you schedule on an inquiry will be listed here so nothing slips through."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
