"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { DashboardError } from "@/components/dashboard/dashboard-error";
import { DashboardSummary } from "@/components/dashboard/dashboard-summary";
import { PriorityQueue } from "@/components/dashboard/priority-queue";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { RecentInquiries } from "@/components/dashboard/recent-inquiries";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { useDashboardData } from "@/components/dashboard/use-dashboard-data";
import { DashboardSubscriptionCard } from "@/components/subscription/dashboard-subscription-card";
import { buttonClasses } from "@/components/ui/button";
import { useWorkspaceSettings } from "@/components/settings/workspace-settings-provider";
import { formatToday } from "@/lib/dashboard/format";
import { getNavItem } from "@/lib/navigation";
import type { DashboardData } from "@/lib/dashboard/types";

function DashboardResults({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="eyebrow text-subtle">Workspace snapshot</h2>
        <p className="text-[11px] text-subtle">Live counts from your records</p>
      </div>
      <DashboardSummary
        totalInquiries={data.metrics.totalInquiries}
        newInquiries={data.metrics.newInquiries}
        convertedInquiries={data.metrics.convertedInquiries}
        followUpsDue={data.metrics.followUpsDue}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
        <RecentInquiries inquiries={data.recentInquiries} />
        <PriorityQueue
          followUps={data.upcomingFollowUps}
          followUpsDue={data.metrics.followUpsDue}
          newInquiries={data.metrics.newInquiries}
        />
      </div>

      <RecentActivity activities={data.recentActivities} />
    </div>
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
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div className="min-w-0">
          <h1 className="font-display text-[28px] leading-none font-semibold tracking-[-0.035em] text-ink">
            {page.title}
          </h1>
          <p className="mt-2 text-[13px] leading-5 text-muted">{page.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[13px] text-muted">{today ? formatToday(today) : ""}</p>
          {settings?.businessName ? (
            <p className="text-[12px] text-subtle">{settings.businessName}</p>
          ) : null}
          <Link href="/inquiries" className={buttonClasses("primary", "md")}>
            Open inquiries
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <DashboardSubscriptionCard />

      {loading ? (
        <DashboardSkeleton />
      ) : error || !data ? (
        <DashboardError
          message={error ?? "We couldn't load your dashboard data. Please try again."}
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
