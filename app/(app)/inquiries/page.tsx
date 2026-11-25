import type { Metadata } from "next";
import { Inbox } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getNavItem, getPageMetadata } from "@/lib/navigation";

export const metadata: Metadata = getPageMetadata("/inquiries");

// Next 16 instant-navigation validation: opt this segment out so it renders normally.
export const instant = false;

export default function InquiriesPage() {
  const page = getNavItem("/inquiries");

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader title={page.title} description={page.description} />
      <Card className="bg-canvas/80 p-5 shadow-card sm:p-8">
        <EmptyState
          icon={Inbox}
          headingLevel="h3"
          title="No inquiries yet"
          description="When a customer gets in touch, their inquiry will be captured here with its full history and status."
        />
      </Card>
    </div>
  );
}
