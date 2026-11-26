import type { Metadata } from "next";
import { FollowUpsPage } from "@/components/follow-ups/follow-ups-page";
import { getPageMetadata } from "@/lib/navigation";

export const metadata: Metadata = getPageMetadata("/follow-ups");

// Next 16 instant-navigation validation: opt this segment out so it renders normally.
export const instant = false;

export default function FollowUpsRoute() {
  return <FollowUpsPage />;
}
