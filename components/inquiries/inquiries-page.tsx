"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { InquiriesSkeleton } from "@/components/inquiries/inquiries-skeleton";
import { InquiriesView } from "@/components/inquiries/inquiries-view";

export function InquiriesPage() {
  const { user } = useAuth();
  if (!user) return <InquiriesSkeleton />;
  return <InquiriesView uid={user.uid} />;
}
