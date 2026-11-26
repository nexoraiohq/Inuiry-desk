import type { Metadata } from "next";
import { InquiriesPage } from "@/components/inquiries/inquiries-page";
import { getPageMetadata } from "@/lib/navigation";

export const metadata: Metadata = getPageMetadata("/inquiries");

// Next 16 instant-navigation validation: opt this segment out so it renders normally.
export const instant = false;

export default function InquiriesRoute() {
  return <InquiriesPage />;
}
