"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { buttonClasses } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { sendPasswordReset } from "@/lib/auth";
import { updateAccountDisplayName } from "@/lib/settings/service";

export function AccountSettingsForm() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.displayName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await updateAccountDisplayName(user, name);
      setSuccess("Display name updated.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update display name.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    if (!user?.email) return;
    setBusy(true);
    setError(null);
    try {
      await sendPasswordReset(user.email);
      setResetSent(true);
      setSuccess("Password reset instructions sent to your email.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send reset instructions.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="bg-surface p-4 shadow-card sm:p-6">
      <h2 className="font-display text-[15px] font-semibold text-ink">Account settings</h2>
      <p className="mt-1 text-[12px] text-muted">Personal details for your signed-in account.</p>
      {error ? <div className="mt-4"><Notice tone="danger" message={error} onDismiss={() => setError(null)} /></div> : null}
      {success ? <div className="mt-4"><Notice tone="success" message={success} onDismiss={() => setSuccess(null)} /></div> : null}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-medium text-subtle">Email</p>
          <p className="mt-1 truncate text-[13px] text-ink">{user?.email ?? "—"}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-subtle">Account ID</p>
          <p className="mt-1 truncate font-mono text-[11px] text-muted">{user?.uid ?? "—"}</p>
        </div>
      </div>

      <form onSubmit={handleName} className="mt-5 space-y-4">
        <Field label="Display name">
          <Input value={name} onChange={(e) => setName(e.target.value)} disabled={busy} required />
        </Field>
        <button type="submit" disabled={busy || name.trim() === (user?.displayName ?? "")} className={buttonClasses("primary", "md", "h-10")}>
          {busy ? "Saving…" : "Save display name"}
        </button>
      </form>

      <div className="mt-6 border-t border-line pt-5">
        <h3 className="text-[13px] font-semibold text-ink">Password</h3>
        <p className="mt-1 text-[12px] text-muted">Uses Firebase&#39;s secure password reset flow. No messages are sent by this app beyond the reset email.</p>
        <button type="button" onClick={() => void handleReset()} disabled={busy || !user?.email} className={buttonClasses("secondary", "md", "mt-3 h-10")}>
          {resetSent ? "Resend reset email" : "Send password reset email"}
        </button>
      </div>
    </Card>
  );
}
