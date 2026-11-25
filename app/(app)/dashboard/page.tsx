import type { Metadata } from "next";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { getPageMetadata } from "@/lib/navigation";

export const metadata: Metadata = getPageMetadata("/dashboard");

// Next 16 instant-navigation validation: this segment opts out so it renders normally.
export const instant = false;

export default function OverviewPage() {
  return <DashboardView />;
}
