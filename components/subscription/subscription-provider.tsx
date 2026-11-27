"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { fetchSubscriptionState } from "@/lib/subscription/client";
import type { SubscriptionStateView } from "@/lib/subscription/view";

type SubscriptionContextValue = {
  state: SubscriptionStateView | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const [state, setState] = useState<SubscriptionStateView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchSubscriptionState();
      setState(next);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load subscription.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status !== "ready" || !user) return;
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [status, user, refresh]);

  const active = status === "ready" && Boolean(user);
  return (
    <SubscriptionContext.Provider
      value={{
        state: active ? state : null,
        loading: active ? loading : false,
        error: active ? error : null,
        refresh,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextValue {
  const value = useContext(SubscriptionContext);
  if (!value) throw new Error("useSubscription must be used inside SubscriptionProvider.");
  return value;
}
