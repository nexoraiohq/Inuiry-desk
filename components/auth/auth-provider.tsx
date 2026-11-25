"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "firebase/auth";
import { auth, firebaseConfigured } from "@/lib/firebase";

export type AuthStatus =
  /** Firebase config is missing — auth cannot run. */
  | "unconfigured"
  /** Waiting for the first onAuthStateChanged result. */
  | "loading"
  /** Initial state resolved; `user` is authoritative. */
  | "ready";

type AuthContextValue = {
  user: User | null;
  status: AuthStatus;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  status: "loading",
});

/**
 * Single source of truth for authentication state. Every consumer (route
 * guard, header, login page) reads this one listener instead of performing
 * its own client-side check, so redirects can never fight each other.
 *
 * Note: client-side gating is a UX concern only. The actual security boundary
 * for workspace data is firestore.rules, enforced server-side by Firestore.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>(
    firebaseConfigured ? "loading" : "unconfigured"
  );

  useEffect(() => {
    if (!firebaseConfigured || !auth) return;
    // onAuthStateChanged fires once with the persisted session (if any),
    // which is what lets us avoid redirect flashes and loops.
    const unsubscribe = auth.onAuthStateChanged((nextUser) => {
      setUser(nextUser);
      setStatus("ready");
    });
    return unsubscribe;
  }, []);

  const value = useMemo(() => ({ user, status }), [user, status]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
