"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Input, Field, PasswordInput } from "@/components/ui/input";
import { buttonClasses } from "@/components/ui/button";
import { FIREBASE_UNCONFIGURED_MESSAGE } from "@/lib/firebase";
import { login, sendPasswordReset } from "@/lib/auth";
import { safeNextPath } from "@/lib/navigation";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm() {
  const { user, status } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));

  const [mode, setMode] = useState<"signin" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [busy, setBusy] = useState(false);

  // Authenticated users land on the dashboard; never bounce a signed-in user
  // back into the auth screen.
  useEffect(() => {
    if (status === "ready" && user) {
      router.replace(next);
    }
  }, [status, user, router, next]);

  if (status === "loading") {
    return (
      <div className="grid min-h-[60vh] place-items-center" role="status" aria-label="Checking your session">
        <span className="size-8 animate-spin rounded-full border-2 border-line border-t-brand" />
      </div>
    );
  }

  if (status === "unconfigured") {
    return (
      <div className="flex flex-col items-center text-center">
        <p className="text-sm font-medium text-danger">{FIREBASE_UNCONFIGURED_MESSAGE}</p>
      </div>
    );
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!EMAIL_PATTERN.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }
    setBusy(true);
    try {
      await login(email.trim(), password, remember);
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSendReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!EMAIL_PATTERN.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    try {
      await sendPasswordReset(email.trim());
      setResetSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col">
      {error ? (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-danger/20 bg-danger-soft px-3.5 py-2.5 text-[13px] font-medium text-danger"
        >
          {error}
        </div>
      ) : null}

      {mode === "reset" ? (
        resetSent ? (
          <div className="flex flex-col items-center text-center">
            <span className="grid size-10 place-items-center rounded-full bg-success-soft text-success">
              <CheckCircle2 className="size-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-display text-lg font-semibold tracking-[-0.01em] text-ink">
              Reset link sent
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
              If an account exists for <span className="font-medium text-ink">{email}</span>,
              a password reset link is on its way. Check your inbox.
            </p>
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setResetSent(false);
                setError(null);
              }}
              className={buttonClasses("secondary", "md", "mt-6 h-10 w-full")}
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={handleSendReset} className="flex flex-col gap-4">
            <Field label="Email">
              <Input
                id="reset-email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={busy}
                required
              />
            </Field>
            <button
              type="submit"
              disabled={busy}
              className={buttonClasses("primary", "md", "h-11 w-full")}
            >
              {busy ? (
                <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                "Send reset link"
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError(null);
              }}
              className="text-[13px] font-medium text-brand hover:text-brand-strong"
            >
              Back to sign in
            </button>
          </form>
        )
      ) : (
        <form onSubmit={handleSignIn} className="flex flex-col gap-4">
          <Field label="Email">
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={busy}
              required
            />
          </Field>

          <Field label="Password">
            <PasswordInput
              id="password"
              autoComplete="current-password"
              placeholder="Your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={busy}
              required
            />
          </Field>

          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-muted">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="size-4 rounded border-line accent-brand"
            />
            Keep me signed in
          </label>

          <button
            type="submit"
            disabled={busy}
            className={buttonClasses("primary", "md", "h-11 w-full")}
          >
            {busy ? (
              <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              "Sign in"
            )}
          </button>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setMode("reset");
                setError(null);
                setResetSent(false);
              }}
              className="text-[13px] font-medium text-brand hover:text-brand-strong"
            >
              Forgot password?
            </button>
            <Link
              href="/register"
              className="text-[13px] font-medium text-brand hover:text-brand-strong"
            >
              Create an account
            </Link>
          </div>
        </form>
      )}

      <p className="mt-6 text-center text-[13px] text-muted">
        <Link href="/dashboard" className="font-medium text-ink hover:text-brand">
          Back to dashboard
        </Link>
        <span className="mx-1.5 text-subtle">·</span>
        <Link href="/register" className="font-medium text-ink hover:text-brand">
          New here? Create an account
        </Link>
      </p>

      {busy ? <Loader2 className="hidden" aria-hidden="true" /> : null}
      <span className="sr-only" aria-live="polite">
        {busy ? "Please wait." : ""}
      </span>
    </div>
  );
}
