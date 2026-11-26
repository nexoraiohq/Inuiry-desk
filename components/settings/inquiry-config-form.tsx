"use client";

import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { buttonClasses } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { useUnsavedGuard } from "@/components/settings/use-unsaved-guard";
import type { WorkspaceSettings, WorkspaceSource } from "@/lib/settings/types";
import { normalizeSourceId } from "@/lib/settings/types";

export function InquiryConfigForm({
  settings,
  onSave,
}: {
  settings: WorkspaceSettings;
  onSave: (next: WorkspaceSettings) => Promise<void>;
}) {
  const [sources, setSources] = useState<WorkspaceSource[]>(settings.inquirySettings.sources);
  const [newSource, setNewSource] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(sources) !== JSON.stringify(settings.inquirySettings.sources);
  useUnsavedGuard(dirty);

  function toggle(id: string) {
    setSources((current) => current.map((item) => (item.id === id ? { ...item, active: !item.active } : item)));
  }

  function rename(id: string, label: string) {
    setSources((current) => current.map((item) => (item.id === id && !item.system ? { ...item, label } : item)));
  }

  function addSource(event: FormEvent) {
    event.preventDefault();
    const label = newSource.trim();
    const id = normalizeSourceId(label);
    if (!label || label.length > 40 || !id) {
      setError("Source names must be 1–40 characters using letters, numbers and spaces.");
      return;
    }
    if (sources.some((item) => item.id === id)) {
      setError("A source with that name already exists.");
      return;
    }
    setSources((current) => [...current, { id, label, active: true, system: false }]);
    setNewSource("");
    setError(null);
  }

  async function save() {
    setBusy(true);
    setError(null);
    setSuccess(false);
    try {
      await onSave({ ...settings, inquirySettings: { ...settings.inquirySettings, sources } });
      setSuccess(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save inquiry sources.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="bg-canvas/80 p-4 shadow-card sm:p-6">
      <h2 className="font-display text-[15px] font-semibold text-ink">Inquiry configuration</h2>
      <p className="mt-1 text-[12px] text-muted">
        Source ids stay stable, so historical inquiries and reports remain valid. Deactivated sources remain available on older records.
      </p>
      {error ? <div className="mt-4"><Notice tone="danger" message={error} onDismiss={() => setError(null)} /></div> : null}
      {success ? <div className="mt-4"><Notice tone="success" message="Inquiry sources saved." onDismiss={() => setSuccess(false)} /></div> : null}

      <ul className="mt-5 divide-y divide-line/70">
        {sources.map((source) => (
          <li key={source.id} className="flex flex-wrap items-center gap-3 py-3">
            <label className="flex min-w-0 flex-1 items-center gap-2">
              <input
                type="checkbox"
                checked={source.active}
                onChange={() => toggle(source.id)}
                disabled={busy}
                className="size-4 rounded border-line accent-brand"
                aria-label={`${source.active ? "Deactivate" : "Activate"} ${source.label}`}
              />
              {source.system ? (
                <span className="truncate text-[13px] font-medium text-ink">{source.label}</span>
              ) : (
                <Input
                  value={source.label}
                  onChange={(e) => rename(source.id, e.target.value)}
                  disabled={busy}
                  className="h-9 max-w-xs"
                  aria-label={`Rename ${source.label}`}
                />
              )}
            </label>
            <div className="flex items-center gap-2">
              {source.system ? <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold text-muted">System</span> : null}
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${source.active ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
                {source.active ? "Active" : "Inactive"}
              </span>
              <code className="text-[10px] text-subtle">{source.id}</code>
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={addSource} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <Field label="Add a source">
            <Input value={newSource} onChange={(e) => setNewSource(e.target.value)} placeholder="Referral partner" disabled={busy} />
          </Field>
        </div>
        <button type="submit" disabled={busy} className={buttonClasses("secondary", "md", "h-10")}>Add source</button>
      </form>

      <div className="mt-6 flex justify-end">
        <button type="button" onClick={() => void save()} disabled={busy || !dirty} className={buttonClasses("primary", "md", "h-10")}>
          {busy ? "Saving…" : "Save inquiry sources"}
        </button>
      </div>
      <p className="mt-3 text-[11px] text-subtle">Status values and priorities remain system-managed.</p>
    </Card>
  );
}
