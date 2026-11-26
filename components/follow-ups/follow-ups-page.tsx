"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { FollowUpsSkeleton } from "@/components/follow-ups/follow-ups-skeleton";
import { FollowUpsView } from "@/components/follow-ups/follow-ups-view";

export function FollowUpsPage() {
  const { user } = useAuth();
  if (!user) return <FollowUpsSkeleton />;
  return <FollowUpsView uid={user.uid} />;
}
