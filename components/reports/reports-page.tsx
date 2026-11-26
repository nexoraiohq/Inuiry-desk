"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { ReportsSkeleton } from "@/components/reports/reports-skeleton";
import { ReportsView } from "@/components/reports/reports-view";

export function ReportsPage() {
  const { user } = useAuth();
  if (!user) return <ReportsSkeleton />;
  return <ReportsView uid={user.uid} />;
}
