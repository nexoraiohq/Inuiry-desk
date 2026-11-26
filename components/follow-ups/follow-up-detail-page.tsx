"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { FollowUpsSkeleton } from "@/components/follow-ups/follow-ups-skeleton";
import { FollowUpDetailView } from "@/components/follow-ups/follow-up-detail-view";

export function FollowUpDetailPage({ id }: { id: string }) {
  const { user } = useAuth();
  if (!user) return <FollowUpsSkeleton />;
  return <FollowUpDetailView uid={user.uid} id={id} />;
}
