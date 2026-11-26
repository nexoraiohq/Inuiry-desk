"use client";

import { useState } from "react";
import { DashboardError } from "@/components/dashboard/dashboard-error";
import { AccountSettingsForm } from "@/components/settings/account-settings-form";
import { BusinessProfileForm } from "@/components/settings/business-profile-form";
import { FollowUpPreferencesForm } from "@/components/settings/follow-up-preferences-form";
import { InquiryConfigForm } from "@/components/settings/inquiry-config-form";
import { PreferencesForm } from "@/components/settings/preferences-form";
import { SettingsSkeleton } from "@/components/settings/settings-skeleton";
import { useWorkspaceSettings } from "@/components/settings/workspace-settings-provider";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { saveWorkspaceSettings, toSettingsInput } from "@/lib/settings/service";
import type { WorkspaceSettings } from "@/lib/settings/types";

const SECTIONS = [
  { id: "business", label: "Business profile" },
  { id: "preferences", label: "Workspace preferences" },
  { id: "inquiry", label: "Inquiry configuration" },
  { id: "followUps", label: "Follow-up preferences" },
  { id: "account", label: "Account settings" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export function SettingsView({ uid }: { uid: string }) {
  const { settings, loading, error, refresh } = useWorkspaceSettings();
  const [active, setActive] = useState<SectionId>("business");
  const [saveError, setSaveError] = useState<string | null>(null);

  async function save(next: WorkspaceSettings) {
    setSaveError(null);
    await saveWorkspaceSettings(uid, toSettingsInput(next));
    refresh();
  }

  if (loading || !settings) {
    return (
      <div className="space-y-4">
        <PageHeader title="Settings" description="Manage your workspace and account." />
        {error ? <Notice tone="danger" message={error} /> : null}
        <SettingsSkeleton />
      </div>
    );
  }

  if (error && !settings) {
    return <DashboardError title="We couldn't load settings" message={error} onRetry={refresh} />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader title="Settings" description="Manage your business identity, preferences and account." />
      {saveError ? <Notice tone="danger" message={saveError} onDismiss={() => setSaveError(null)} /> : null}

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActive(section.id)}
              aria-current={active === section.id ? "page" : undefined}
              className={`shrink-0 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${
                active === section.id ? "bg-brand-soft text-brand" : "text-muted hover:bg-surface hover:text-ink"
              }`}
            >
              {section.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0 space-y-4">
          {active === "business" ? <BusinessProfileForm settings={settings} onSave={save} /> : null}
          {active === "preferences" ? <PreferencesForm settings={settings} onSave={save} /> : null}
          {active === "inquiry" ? <InquiryConfigForm settings={settings} onSave={save} /> : null}
          {active === "followUps" ? <FollowUpPreferencesForm settings={settings} onSave={save} /> : null}
          {active === "account" ? <AccountSettingsForm /> : null}
        </div>
      </div>
    </div>
  );
}
