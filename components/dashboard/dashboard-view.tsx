"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  Inbox,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { DashboardError } from "@/components/dashboard/dashboard-error";
import { useWorkspaceSettings } from "@/components/settings/workspace-settings-provider";
import { DashboardSubscriptionCard } from "@/components/subscription/dashboard-subscription-card";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { MetricCard } from "@/components/dashboard/metric-card";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { RecentInquiries } from "@/components/dashboard/recent-inquiries";
import { UpcomingFollowUps } from "@/components/dashboard/upcoming-follow-ups";
import { useDashboardData } from "@/components/dashboard/use-dashboard-data";
import { buttonClasses } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { formatToday } from "@/lib/dashboard/format";
import { getNavItem } from "@/lib/navigation";
import type { DashboardData } from "@/lib/dashboard/types";

function DashboardResults({ data }: { data: DashboardData }) {
  const metrics = [
    {
      label: "Inquiries",
      value: data.metrics.totalInquiries,
      hint: "every enquiry on record",
      icon: Inbox,
      href: "/inquiries",
    },
    {
      label: "Need a first reply",
      value: data.metrics.newInquiries,
      hint: "still marked as new",
      icon: CircleDot,
      href: "/inquiries",
    },
    {
      label: "Won",
      value: data.metrics.convertedInquiries,
      hint: "marked as converted",
      icon: CheckCircle2,
      href: "/inquiries",
    },
    {
      label: "Follow-ups due",
      value: data.metrics.followUpsDue,
      hint: "overdue or due today",
      icon: CalendarClock,
      href: "/follow-ups",
    },
  ];

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[12px] font-semibold tracking-[0.12em] text-subtle uppercase">
          Workspace snapshot
        </h2>
        <p className="text-[12px] text-subtle">Counts come from your own records</p>
      </div>
      <section aria-label="Key metrics" className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <RecentInquiries inquiries={data.recentInquiries} />
        </div>
        <UpcomingFollowUps followUps={data.upcomingFollowUps} />
      </div>

      <RecentActivity activities={data.recentActivities} />
    </>
  );
}

function WorkspaceOverview({ uid }: { uid: string }) {
  const { settings } = useWorkspaceSettings();
  const { data, error, loading, retry } = useDashboardData(uid);
  const [today, setToday] = useState<Date | null>(null);
  const page = getNavItem("/dashboard");

  // Set on the client to avoid a timezone mismatch during prerendering.
  useEffect(() => {
    const timer = window.setTimeout(() => setToday(new Date()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader title={page.title} description={page.description}>
        <div className="flex flex-col items-start gap-1.5 sm:items-end">
          <p className="text-[13px] text-muted">
            {today ? formatToday(today) : ""}
          </p>
          {settings?.businessName ? (
            <p className="text-[12px] text-subtle">{settings.businessName}</p>
          ) : null}
          <Link
            href="/inquiries"
            className={buttonClasses("secondary", "md", "h-9")}
          >
            Open inquiries
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </PageHeader>

      <DashboardSubscriptionCard />

      {loading ? (
        <DashboardSkeleton />
      ) : error || !data ? (
        <DashboardError
          message={
            error ??
            "We couldn't load your dashboard data. Please try again."
          }
          onRetry={retry}
        />
      ) : (
        <DashboardResults data={data} />
      )}
    </div>
  );
}

/** Authenticated dashboard shell — data is scoped to the signed-in UID. */
export function DashboardView() {
  const { user } = useAuth();

  if (!user) return <DashboardSkeleton />;

  return <WorkspaceOverview key={user.uid} uid={user.uid} />;
}
