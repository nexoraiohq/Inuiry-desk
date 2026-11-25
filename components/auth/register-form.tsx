"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Input, Field, PasswordInput } from "@/components/ui/input";
import { buttonClasses } from "@/components/ui/button";
import { registerAccount } from "@/lib/auth";
import { safeNextPath } from "@/lib/navigation";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));

  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const nameError =
      fullName.trim().length < 2 || fullName.trim().length > 100
        ? "Enter your full name (2–100 characters)."
        : !businessName.trim() || businessName.trim().length > 150
          ? "Enter your business name (2–150 characters)."
          : !EMAIL_PATTERN.test(email)
            ? "Enter a valid email address."
            : password.length < 8
              ? "Password must be at least 8 characters."
              : confirmPassword !== password
                ? "Passwords do not match."
                : null;

    if (nameError) {
      setError(nameError);
      return;
    }

    setBusy(true);
    try {
      await registerAccount({
        fullName: fullName.trim(),
        businessName: businessName.trim(),
        email: email.trim(),
        password,
      });
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
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

      <form onSubmit={handleRegister} className="flex flex-col gap-4">
        <Field label="Full name">
          <Input id="fullName" autoComplete="name" placeholder="Alex Morgan" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={busy} required />
        </Field>
        <Field label="Business name">
          <Input id="businessName" autoComplete="organization" placeholder="Morgan Agency" value={businessName} onChange={(e) => setBusinessName(e.target.value)} disabled={busy} required />
        </Field>
        <Field label="Email">
          <Input id="register-email" type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} required />
        </Field>
        <Field label="Password">
          <PasswordInput id="register-password" autoComplete="new-password" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} required />
        </Field>
        <Field label="Confirm password">
          <PasswordInput id="register-confirm" autoComplete="new-password" placeholder="Repeat your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={busy} required />
        </Field>

        <button
          type="submit"
          disabled={busy}
          className={buttonClasses("primary", "md", "h-11 w-full")}
        >
          {busy ? (
            <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            "Create account"
          )}
        </button>

        <p className="text-center text-[13px] text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand hover:text-brand-strong">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
