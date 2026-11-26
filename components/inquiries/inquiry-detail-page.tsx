"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { InquiryDetailSkeleton } from "@/components/inquiries/inquiry-detail-skeleton";
import { InquiryDetailView } from "@/components/inquiries/inquiry-detail-view";

export function InquiryDetailPage({ id }: { id: string }) {
  const { user } = useAuth();
  if (!user) return <InquiryDetailSkeleton />;
  return <InquiryDetailView uid={user.uid} inquiryId={id} />;
}
