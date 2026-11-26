import type { Metadata } from "next";
import { FollowUpDetailPage } from "@/components/follow-ups/follow-up-detail-page";
import { getPageMetadata } from "@/lib/navigation";

export const metadata: Metadata = getPageMetadata("/follow-ups");

// Next 16 instant-navigation validation: opt this segment out so it renders normally.
export const instant = false;

export default async function FollowUpDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FollowUpDetailPage id={id} />;
}
