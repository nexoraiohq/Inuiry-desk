"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getDashboardData,
  DashboardServiceError,
} from "@/lib/dashboard/service";
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

/** Loads dashboard data for one authenticated workspace. */
export function useDashboardData(uid: string): DashboardState {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const result = await getDashboardData(uid);
        if (!active) return;
        setData(result);
        setError(null);
      } catch (caught) {
        if (!active) return;
        setError(errorMessage(caught));
        if (caught instanceof DashboardServiceError) {
          console.error("[dashboard] failed to load", caught.code);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [uid]);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const result = await getDashboardData(uid);
        setData(result);
        setError(null);
      } catch (caught) {
        setError(errorMessage(caught));
        if (caught instanceof DashboardServiceError) {
          console.error("[dashboard] retry failed", caught.code);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [uid]);

  return { data, error, loading, retry };
}
