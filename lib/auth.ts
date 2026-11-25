import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import {
  auth,
  db,
  FIREBASE_UNCONFIGURED_MESSAGE,
  firebaseConfigured,
} from "@/lib/firebase";

/** Human-readable messages for the Firebase error codes this app can hit. */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/invalid-email": "Enter a valid email address.",
  "auth/missing-email": "Enter your email address.",
  "auth/missing-password": "Enter your password.",
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/user-not-found": "Incorrect email or password.",
  "auth/email-already-in-use": "An account already exists for this email.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/too-many-requests":
    "Too many attempts. Wait a moment and try again.",
  "auth/network-request-failed":
    "Network error. Check your connection and try again.",
  "auth/operation-not-allowed":
    "Email/password sign-in is not enabled for this project.",
  "auth/requires-recent-login":
    "For security, please sign in again to complete this action.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/config-not-found":
    "Firebase Auth is not configured for this project.",
};

function toAuthError(error: unknown): Error {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  const message = AUTH_ERROR_MESSAGES[code];
  if (message) return new Error(message);
  // Never swallow unknown errors: surface them for debugging.
  console.error("[auth] unexpected error", error);
  if (code) return new Error(`Authentication failed (${code}).`);
  return new Error(
    error instanceof Error
      ? error.message
      : "Something went wrong. Please try again."
  );
}

function requireServices() {
  if (!firebaseConfigured || !auth || !db) {
    throw new Error(FIREBASE_UNCONFIGURED_MESSAGE);
  }
  return { auth, db };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type RegisterInput = {
  fullName: string;
  businessName: string;
  email: string;
  password: string;
};

/**
 * Creates the auth account, the users/{uid} profile and the private
 * workspaces/{uid} workspace (workspaceId === uid for the MVP).
 *
 * Partial-failure safety: the workspace/profile writes are retried, and if
 * they still fail the freshly created auth account is rolled back so the user
 * can retry registration cleanly instead of ending up with a half-made account.
 */
export async function registerAccount(input: RegisterInput): Promise<void> {
  const services = requireServices();
  const { fullName, businessName, email, password } = input;

  let credential;
  try {
    credential = await createUserWithEmailAndPassword(
      services.auth,
      email,
      password
    );
  } catch (error) {
    throw toAuthError(error);
  }

  const user = credential.user;
  try {
    await updateProfile(user, { displayName: fullName });
    await writeWorkspaceDocuments(user.uid, fullName, email, businessName);
  } catch (error) {
    let rolledBack = false;
    try {
      await user.delete();
      rolledBack = true;
    } catch (rollbackError) {
      // The account exists but setup failed — report that exact state so it
      // is recoverable (sign in and retry, or try again later).
      console.error("[auth] rollback failed after setup error", rollbackError);
    }
    if (rolledBack) throw toAuthError(error);
    throw new Error(
      "Your account was created but workspace setup failed. Please sign in and retry, or try again later."
    );
  }
}

async function writeWorkspaceDocuments(
  uid: string,
  displayName: string,
  email: string,
  businessName: string
): Promise<void> {
  const { db } = requireServices();
  const workspaceRef = doc(db, "workspaces", uid);
  const userRef = doc(db, "users", uid);

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // Workspace first: the user profile may only exist once its
      // workspaceId target exists.
      await setDoc(workspaceRef, {
        businessName,
        ownerUid: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await setDoc(userRef, {
        displayName,
        email,
        workspaceId: uid,
        createdAt: serverTimestamp(),
      });
      return;
    } catch (error) {
      lastError = error;
      await sleep(400 * (attempt + 1));
    }
  }
  throw lastError;
}

/**
 * Signs in with email/password. Session persistence follows the "remember me"
 * choice: local persistence survives browser restarts, session persistence
 * ends when the tab closes.
 */
export async function login(
  email: string,
  password: string,
  remember: boolean
): Promise<void> {
  const { auth } = requireServices();
  try {
    await setPersistence(
      auth,
      remember ? browserLocalPersistence : browserSessionPersistence
    );
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    throw toAuthError(error);
  }
}

export async function logout(): Promise<void> {
  const { auth } = requireServices();
  try {
    await signOut(auth);
  } catch (error) {
    throw toAuthError(error);
  }
}

export async function sendPasswordReset(email: string): Promise<void> {
  const { auth } = requireServices();
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    throw toAuthError(error);
  }
}
