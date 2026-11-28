"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { collection, doc, limit, onSnapshot, query } from "firebase/firestore";
import { useAuth } from "@/components/auth/auth-provider";
import { firestore } from "@/lib/dashboard/service";

type LiveContextValue = { revision: number };

const LiveContext = createContext<LiveContextValue>({ revision: 0 });

const WATCHED = [
  "inquiries",
  "followUps",
  "communications",
  "activities",
  "notifications",
  "subscription",
  "checkouts",
  "billing",
] as const;

/**
 * One set of realtime listeners per signed-in workspace. Any write from any
 * tab or server process bumps a revision; consumers refetch their own data.
 * Events are coalesced so a batch of writes causes one refresh.
 */
export function WorkspaceLiveProvider({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const [revision, setRevision] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initial = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (status !== "ready" || !user) return;
    initial.current = new Set();
    const db = firestore();
    const schedule = (key: string) => () => {
      // Firestore fires once with existing data on subscribe; that is not a change.
      if (!initial.current.has(key)) {
        initial.current.add(key);
        return;
      }
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setRevision((value) => value + 1), 120);
    };
    const unsubscribers = [
      onSnapshot(doc(db, "workspaces", user.uid), schedule("workspace"), () => undefined),
      ...WATCHED.map((name) =>
        onSnapshot(query(collection(db, "workspaces", user.uid, name), limit(200)), schedule(name), () => undefined)
      ),
    ];
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      if (timer.current) clearTimeout(timer.current);
    };
  }, [status, user]);

  return <LiveContext.Provider value={{ revision }}>{children}</LiveContext.Provider>;
}

export function useWorkspaceRevision(): number {
  return useContext(LiveContext).revision;
}
