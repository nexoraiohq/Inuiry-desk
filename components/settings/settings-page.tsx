"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { SettingsSkeleton } from "@/components/settings/settings-skeleton";
import { SettingsView } from "@/components/settings/settings-view";

export function SettingsPage() {
  const { user } = useAuth();
  if (!user) return <SettingsSkeleton />;
  return <SettingsView uid={user.uid} />;
}
