import type { Metadata } from "next";
import { SettingsPage } from "@/components/settings/settings-page";
import { getPageMetadata } from "@/lib/navigation";

export const metadata: Metadata = getPageMetadata("/settings");

// Next 16 instant-navigation validation: opt this segment out so it renders normally.
export const instant = false;

export default function SettingsRoute() {
  return <SettingsPage />;
}
