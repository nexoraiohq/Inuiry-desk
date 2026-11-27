import { auth } from "@/lib/firebase";
import type { SubscriptionStateView } from "@/lib/subscription/view";

/** Reads subscription state from the authenticated server route. */
export async function fetchSubscriptionState(): Promise<SubscriptionStateView> {
  const token = auth ? await auth.currentUser?.getIdToken() : null;
  if (!token) throw new Error("Sign in to view subscription information.");
  const response = await fetch("/api/subscription/state", {
    headers: { authorization: `Bearer ${token}` },
  });
  const payload = (await response.json()) as SubscriptionStateView & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Could not load subscription information.");
  return payload;
}

/** Explicit trial bootstrap for a genuinely new workspace, called after registration. */
export async function initializeSubscription(): Promise<void> {
  const token = auth ? await auth.currentUser?.getIdToken() : null;
  if (!token) return;
  const response = await fetch("/api/subscription/trial", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Could not start the trial.");
  }
}
