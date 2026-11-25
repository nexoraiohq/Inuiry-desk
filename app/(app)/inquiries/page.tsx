import type { Metadata } from "next";
import { Inbox } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getPageMetadata } from "@/lib/navigation";

export const metadata: Metadata = getPageMetadata("/inquiries");

export default function InquiriesPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Card className="p-6 sm:p-8">
        <EmptyState
          icon={Inbox}
          title="No inquiries yet"
          description="When a customer gets in touch, their inquiry will be captured here with its full history and status."
        />
      </Card>
    </div>
  );
}
