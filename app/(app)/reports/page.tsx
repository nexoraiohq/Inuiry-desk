import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getNavItem, getPageMetadata } from "@/lib/navigation";

export const metadata: Metadata = getPageMetadata("/reports");

// Next 16 instant-navigation validation: opt this segment out so it renders normally.
export const instant = false;

export default function ReportsPage() {
  const page = getNavItem("/reports");

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader title={page.title} description={page.description} />
      <Card className="bg-canvas/80 p-5 shadow-card sm:p-8">
        <EmptyState
          icon={BarChart3}
          headingLevel="h3"
          title="Reports are not available yet"
          description="Response times, inquiry volume and follow-up performance will be summarized here."
        />
      </Card>
    </div>
  );
}
