"use client";

import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { buttonClasses } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { useUnsavedGuard } from "@/components/settings/use-unsaved-guard";
import {
  DATE_FORMATS,
  isValidTimeZone,
  type WorkspacePreferences,
  type WorkspaceSettings,
} from "@/lib/settings/types";

const TIMEZONES: string[] =
  typeof Intl.supportedValuesOf === "function"
    ? [...Intl.supportedValuesOf("timeZone")].sort()
    : ["UTC", "Africa/Nairobi", "Europe/London", "America/New_York", "Asia/Dubai"];

export function PreferencesForm({
  settings,
  onSave,
}: {
  settings: WorkspaceSettings;
  onSave: (next: WorkspaceSettings) => Promise<void>;
}) {
  const [preferences, setPreferences] = useState<WorkspacePreferences>(settings.preferences);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(preferences) !== JSON.stringify(settings.preferences);
  useUnsavedGuard(dirty);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValidTimeZone(preferences.timezone)) {
      setError("Choose a valid IANA timezone.");
      return;
    }
    setError(null);
    setSuccess(false);
    setBusy(true);
    try {
      await onSave({ ...settings, preferences });
      setSuccess(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save preferences.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="bg-canvas/80 p-4 shadow-card sm:p-6">
      <h2 className="font-display text-[15px] font-semibold text-ink">Workspace preferences</h2>
      <p className="mt-1 text-[12px] text-muted">Applies to date display, follow-up scheduling and reports.</p>
      {error ? <div className="mt-4"><Notice tone="danger" message={error} onDismiss={() => setError(null)} /></div> : null}
      {success ? <div className="mt-4"><Notice tone="success" message="Preferences saved." onDismiss={() => setSuccess(false)} /></div> : null}
      <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="min-w-0">
          <Field label="Timezone" hint="Valid IANA identifier. Existing timestamps stay absolute.">
            <Input
              list="workspace-timezones"
              value={preferences.timezone}
              onChange={(e) => setPreferences((current) => ({ ...current, timezone: e.target.value }))}
              disabled={busy}
              required
            />
          </Field>
          <datalist id="workspace-timezones">
            {TIMEZONES.map((zone) => <option key={zone} value={zone} />)}
          </datalist>
        </div>
        <Field label="Date format">
          <Select
            value={preferences.dateFormat}
            onChange={(e) => setPreferences((current) => ({ ...current, dateFormat: e.target.value as WorkspacePreferences["dateFormat"] }))}
            disabled={busy}
          >
            {DATE_FORMATS.map((format) => <option key={format} value={format}>{format}</option>)}
          </Select>
        </Field>
        <Field label="Week starts on">
          <Select
            value={preferences.weekStartsOn}
            onChange={(e) => setPreferences((current) => ({ ...current, weekStartsOn: Number(e.target.value) as WorkspacePreferences["weekStartsOn"] }))}
            disabled={busy}
          >
            <option value={1}>Monday</option>
            <option value={0}>Sunday</option>
            <option value={6}>Saturday</option>
          </Select>
        </Field>
        <Field label="Default reporting period">
          <Select
            value={preferences.defaultReportingPeriod}
            onChange={(e) => setPreferences((current) => ({ ...current, defaultReportingPeriod: e.target.value as WorkspacePreferences["defaultReportingPeriod"] }))}
            disabled={busy}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="thisMonth">This month</option>
          </Select>
        </Field>
        <div className="flex justify-end sm:col-span-2">
          <button type="submit" disabled={busy || !dirty} className={buttonClasses("primary", "md", "h-10")}>
            {busy ? "Saving…" : "Save preferences"}
          </button>
        </div>
      </form>
    </Card>
  );
}
