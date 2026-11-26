"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { setWorkspaceTimeZone } from "@/lib/datetime/zone";
import { getWorkspaceSettings } from "@/lib/settings/service";
import type { WorkspaceSettings } from "@/lib/settings/types";

type ContextValue = {
  settings: WorkspaceSettings | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

const WorkspaceSettingsContext = createContext<ContextValue>({
  settings: null,
  loading: true,
  error: null,
  refresh: () => undefined,
});

/** Loads workspace preferences once and applies the timezone to all date display helpers. */
export function WorkspaceSettingsProvider({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, rerender] = useState(0);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const result = await getWorkspaceSettings(user.uid);
      setSettings(result);
      setError(null);
      setWorkspaceTimeZone(result.preferences.timezone);
      rerender((value) => value + 1);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load workspace settings.");
      setWorkspaceTimeZone(undefined);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (status !== "ready" || !user) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [status, user, load]);

  const refresh = useCallback(() => {
    setLoading(true);
    void load();
  }, [load]);

  const value = useMemo(
    () => ({ settings, loading, error, refresh }),
    [settings, loading, error, refresh]
  );

  return (
    <WorkspaceSettingsContext.Provider value={value}>
      {children}
    </WorkspaceSettingsContext.Provider>
  );
}

export function useWorkspaceSettings(): ContextValue {
  return useContext(WorkspaceSettingsContext);
}
