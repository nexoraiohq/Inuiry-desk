import type { Metadata } from "next";
import { Settings } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { getPageMetadata } from "@/lib/navigation";

export const metadata: Metadata = getPageMetadata("/settings");

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <EmptyState
        icon={Settings}
        title="Settings are not available yet"
        description="Workspace preferences and account configuration will be managed here."
      />
    </div>
  );
}
