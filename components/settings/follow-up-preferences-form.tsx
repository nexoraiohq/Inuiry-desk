"use client";

import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { buttonClasses } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { useUnsavedGuard } from "@/components/settings/use-unsaved-guard";
import type { FollowUpSettings, WorkspaceSettings } from "@/lib/settings/types";

const DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

export function FollowUpPreferencesForm({
  settings,
  onSave,
}: {
  settings: WorkspaceSettings;
  onSave: (next: WorkspaceSettings) => Promise<void>;
}) {
  const [values, setValues] = useState<FollowUpSettings>(settings.followUpSettings);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(values) !== JSON.stringify(settings.followUpSettings);
  useUnsavedGuard(dirty);

  function toggleDay(day: number) {
    setValues((current) => ({
      ...current,
      workingDays: current.workingDays.includes(day)
        ? current.workingDays.filter((item) => item !== day)
        : [...current.workingDays, day].sort((a, b) => a - b),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (values.defaultIntervalDays < 1 || values.defaultIntervalDays > 90) {
      setError("Default interval must be between 1 and 90 days.");
      return;
    }
    if (values.endTime <= values.startTime) {
      setError("End time must be after start time.");
      return;
    }
    setError(null);
    setSuccess(false);
    setBusy(true);
    try {
      await onSave({ ...settings, followUpSettings: values });
      setSuccess(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save follow-up preferences.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="bg-canvas/80 p-4 shadow-card sm:p-6">
      <h2 className="font-display text-[15px] font-semibold text-ink">Follow-up preferences</h2>
      <p className="mt-1 text-[12px] text-muted">Defaults for new follow-ups only. Existing follow-ups are never rescheduled.</p>
      {error ? <div className="mt-4"><Notice tone="danger" message={error} onDismiss={() => setError(null)} /></div> : null}
      {success ? <div className="mt-4"><Notice tone="success" message="Follow-up preferences saved." onDismiss={() => setSuccess(false)} /></div> : null}
      <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Default follow-up interval (days)">
          <Input
            type="number"
            min={1}
            max={90}
            value={values.defaultIntervalDays}
            onChange={(e) => setValues((current) => ({ ...current, defaultIntervalDays: Number(e.target.value) }))}
            disabled={busy}
          />
        </Field>
        <Field label="Preferred default time">
          <Input type="time" value={values.defaultTime} onChange={(e) => setValues((current) => ({ ...current, defaultTime: e.target.value }))} disabled={busy} />
        </Field>
        <Field label="Working day start">
          <Input type="time" value={values.startTime} onChange={(e) => setValues((current) => ({ ...current, startTime: e.target.value }))} disabled={busy} />
        </Field>
        <Field label="Working day end">
          <Input type="time" value={values.endTime} onChange={(e) => setValues((current) => ({ ...current, endTime: e.target.value }))} disabled={busy} />
        </Field>
        <div className="sm:col-span-2">
          <p className="text-[13px] font-medium text-ink">Working days</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {DAYS.map((day) => (
              <label key={day.value} className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[12px] text-muted">
                <input
                  type="checkbox"
                  checked={values.workingDays.includes(day.value)}
                  onChange={() => toggleDay(day.value)}
                  disabled={busy}
                  className="size-3.5 accent-brand"
                />
                {day.label}
              </label>
            ))}
          </div>
        </div>
        <div className="flex justify-end sm:col-span-2">
          <button type="submit" disabled={busy || !dirty} className={buttonClasses("primary", "md", "h-10")}>
            {busy ? "Saving…" : "Save follow-up preferences"}
          </button>
        </div>
      </form>
    </Card>
  );
}
