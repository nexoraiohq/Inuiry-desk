"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
  /** Re-reads the current Firebase user after profile edits. */
  refreshUser: () => void;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  status: "loading",
  refreshUser: () => undefined,
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
  const [, forceProfileUpdate] = useState(0);

  const refreshUser = useCallback(() => {
    // onAuthStateChanged does not fire for updateProfile; bump the context so
    // consumers immediately re-read the mutated Firebase user object.
    forceProfileUpdate((value) => value + 1);
  }, []);

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

  // A fresh value object on every render makes profile edits visible to all
  // consumers as soon as refreshUser bumps profileVersion.
  return (
    <AuthContext.Provider value={{ user, status, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
