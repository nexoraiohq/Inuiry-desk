import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { getPageMetadata } from "@/lib/navigation";

export const metadata: Metadata = getPageMetadata("/reports");

export default function ReportsPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <EmptyState
        icon={BarChart3}
        title="Reports are not available yet"
        description="Response times, inquiry volume and follow-up performance will be summarized here."
      />
    </div>
  );
}
