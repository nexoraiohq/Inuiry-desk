import type { Metadata } from "next";
import { CalendarClock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getPageMetadata } from "@/lib/navigation";

export const metadata: Metadata = getPageMetadata("/follow-ups");

export default function FollowUpsPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Card className="p-6 sm:p-8">
        <EmptyState
          icon={CalendarClock}
          title="Nothing scheduled"
          description="Schedule a follow-up on any inquiry to keep every potential customer moving forward."
        />
      </Card>
    </div>
  );
}
