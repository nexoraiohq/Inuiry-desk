"use client";

import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { buttonClasses } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { useUnsavedGuard } from "@/components/settings/use-unsaved-guard";
import type { WorkspaceProfile, WorkspaceSettings } from "@/lib/settings/types";

export function BusinessProfileForm({
  settings,
  onSave,
}: {
  settings: WorkspaceSettings;
  onSave: (next: WorkspaceSettings) => Promise<void>;
}) {
  const [businessName, setBusinessName] = useState(settings.businessName);
  const [profile, setProfile] = useState<WorkspaceProfile>(settings.profile);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const dirty = businessName !== settings.businessName || JSON.stringify(profile) !== JSON.stringify(settings.profile);
  useUnsavedGuard(dirty);

  function setField(key: keyof WorkspaceProfile, value: string) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!businessName.trim() || businessName.trim().length > 150) {
      setError("Enter a business name (up to 150 characters).");
      return;
    }
    if (profile.logoUrl && !/^https?:\/\//i.test(profile.logoUrl)) {
      setError("Logo URL must start with http:// or https://.");
      return;
    }
    setError(null);
    setSuccess(false);
    setBusy(true);
    try {
      await onSave({ ...settings, businessName: businessName.trim(), profile });
      setSuccess(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the business profile.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="bg-canvas/80 p-4 shadow-card sm:p-6">
      <h2 className="font-display text-[15px] font-semibold text-ink">Business profile</h2>
      <p className="mt-1 text-[12px] text-muted">Shown across your workspace. Only your own workspace is updated.</p>
      {error ? <div className="mt-4"><Notice tone="danger" message={error} onDismiss={() => setError(null)} /></div> : null}
      {success ? <div className="mt-4"><Notice tone="success" message="Business profile saved." onDismiss={() => setSuccess(false)} /></div> : null}
      <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Business name">
          <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} disabled={busy} required />
        </Field>
        <Field label="Industry">
          <Input value={profile.industry} onChange={(e) => setField("industry", e.target.value)} disabled={busy} placeholder="SaaS, Agency, Retail…" />
        </Field>
        <Field label="Business email">
          <Input type="email" value={profile.email} onChange={(e) => setField("email", e.target.value)} disabled={busy} />
        </Field>
        <Field label="Business phone">
          <Input type="tel" value={profile.phone} onChange={(e) => setField("phone", e.target.value)} disabled={busy} />
        </Field>
        <Field label="Website">
          <Input value={profile.website} onChange={(e) => setField("website", e.target.value)} disabled={busy} placeholder="https://example.com" />
        </Field>
        <Field label="Logo URL" hint="A direct https:// image URL. No upload infrastructure is used.">
          <Input value={profile.logoUrl} onChange={(e) => setField("logoUrl", e.target.value)} disabled={busy} placeholder="https://example.com/logo.png" />
        </Field>
        <Field label="Country">
          <Input value={profile.country} onChange={(e) => setField("country", e.target.value)} disabled={busy} />
        </Field>
        <Field label="City / location">
          <Input value={profile.city} onChange={(e) => setField("city", e.target.value)} disabled={busy} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Business description">
            <Textarea value={profile.description} onChange={(e) => setField("description", e.target.value)} disabled={busy} placeholder="What does your business do?" />
          </Field>
        </div>
        <div className="flex justify-end sm:col-span-2">
          <button type="submit" disabled={busy || !dirty} className={buttonClasses("primary", "md", "h-10")}>
            {busy ? "Saving…" : "Save business profile"}
          </button>
        </div>
      </form>
    </Card>
  );
}
