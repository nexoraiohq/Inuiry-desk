import type { Metadata } from "next";
import { CalendarClock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getNavItem, getPageMetadata } from "@/lib/navigation";

export const metadata: Metadata = getPageMetadata("/follow-ups");

// Next 16 instant-navigation validation: opt this segment out so it renders normally.
export const instant = false;

export default function FollowUpsPage() {
  const page = getNavItem("/follow-ups");

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader title={page.title} description={page.description} />
      <Card className="bg-canvas/80 p-5 shadow-card sm:p-8">
        <EmptyState
          icon={CalendarClock}
          headingLevel="h3"
          title="Nothing scheduled"
          description="Schedule a follow-up on any inquiry to keep every potential customer moving forward."
        />
      </Card>
    </div>
  );
}
