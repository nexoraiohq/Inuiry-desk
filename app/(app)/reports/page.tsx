import type { Metadata } from "next";
import { ReportsPage } from "@/components/reports/reports-page";
import { getPageMetadata } from "@/lib/navigation";

export const metadata: Metadata = getPageMetadata("/reports");

// Next 16 instant-navigation validation: opt this segment out so it renders normally.
export const instant = false;

export default function ReportsRoute() {
  return <ReportsPage />;
}
