import type { Metadata } from "next";
import { InquiryDetailPage } from "@/components/inquiries/inquiry-detail-page";
import { getPageMetadata } from "@/lib/navigation";

export const metadata: Metadata = getPageMetadata("/inquiries");

// Next 16 instant-navigation validation: opt this segment out so it renders normally.
export const instant = false;

export default async function InquiryDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <InquiryDetailPage id={id} />;
}
