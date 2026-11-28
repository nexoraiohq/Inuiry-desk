"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getDashboardData,
  DashboardServiceError,
} from "@/lib/dashboard/service";
import { useWorkspaceRevision } from "@/components/live/workspace-live-provider";
import type { DashboardData } from "@/lib/dashboard/types";

type DashboardState = {
  data: DashboardData | null;
  error: string | null;
  loading: boolean;
  retry: () => void;
};

const errorMessage = (caught: unknown) =>
  caught instanceof Error
    ? caught.message
    : "We couldn't load your dashboard. Please try again.";

/** Loads dashboard data and reloads it whenever the workspace changes. */
export function useDashboardData(uid: string): DashboardState {
  const revision = useWorkspaceRevision();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getDashboardData(uid);
      setData(result);
      setError(null);
    } catch (caught) {
      setError(errorMessage(caught));
      if (caught instanceof DashboardServiceError) {
        console.error("[dashboard] failed to load", caught.code);
      }
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load, revision]);

  return { data, error, loading, retry: () => void load() };
}
