import type { Metadata } from "next";
import { Settings } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getNavItem, getPageMetadata } from "@/lib/navigation";

export const metadata: Metadata = getPageMetadata("/settings");

// Next 16 instant-navigation validation: opt this segment out so it renders normally.
export const instant = false;

export default function SettingsPage() {
  const page = getNavItem("/settings");

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader title={page.title} description={page.description} />
      <Card className="bg-canvas/80 p-5 shadow-card sm:p-8">
        <EmptyState
          icon={Settings}
          headingLevel="h3"
          title="Settings are not available yet"
          description="Workspace preferences and account configuration will be managed here."
        />
      </Card>
    </div>
  );
}
