import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
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

function errorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    return String((error as { code: unknown }).code);
  }
  return "";
}

function toAuthError(error: unknown): Error {
  const code = errorCode(error);
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
 * Creates the auth account, then the private users/{uid} profile and
 * workspaces/{uid} workspace. Documents are keyed by the Firebase uid, so one
 * account can never read or overwrite another account's data (also enforced
 * by firestore.rules).
 *
 * If an auth account already exists but its documents are missing (e.g. a
 * previous setup failed), signing in with the same credentials completes the
 * setup instead of leaving a half-made account behind.
 */
export async function registerAccount(input: RegisterInput): Promise<void> {
  const services = requireServices();
  const { fullName, businessName, email, password } = input;

  let user: User;
  let createdNow = false;

  try {
    const credential = await createUserWithEmailAndPassword(
      services.auth,
      email,
      password
    );
    user = credential.user;
    createdNow = true;
  } catch (error) {
    if (errorCode(error) !== "auth/email-already-in-use") {
      throw toAuthError(error);
    }
    // Recover a partially created account without exposing that it exists to
    // someone who does not know the password: sign in with the given creds.
    try {
      const credential = await signInWithEmailAndPassword(
        services.auth,
        email,
        password
      );
      user = credential.user;
    } catch (repairError) {
      throw toAuthError(repairError);
    }
  }

  try {
    await updateProfile(user, { displayName: fullName });
    await writeWorkspaceDocuments(user.uid, fullName, email, businessName);
    await verifyOwnDocuments(user.uid);
  } catch (error) {
    // Only delete an account we created in this call. Never delete a
    // pre-existing account because its documents failed to write.
    if (createdNow) {
      try {
        await user.delete();
      } catch (rollbackError) {
        console.error("[auth] rollback failed after setup error", rollbackError);
        throw new Error(
          "Your account was created but workspace setup failed. Please sign in and try again later."
        );
      }
    }
    throw toAuthError(error);
  }
}

/** Reads back both private documents to confirm the account was fully stored. */
async function verifyOwnDocuments(uid: string): Promise<void> {
  const { db } = requireServices();
  const [workspace, profile] = await Promise.all([
    getDoc(doc(db, "workspaces", uid)),
    getDoc(doc(db, "users", uid)),
  ]);

  if (
    !workspace.exists() ||
    workspace.data().ownerUid !== uid ||
    !profile.exists() ||
    profile.data().workspaceId !== uid
  ) {
    throw new Error("Workspace setup could not be verified. Please try again.");
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
      // Never overwrite an existing workspace — that could destroy a real
      // user's data during a recovery registration.
      const [workspaceSnap, userSnap] = await Promise.all([
        getDoc(workspaceRef),
        getDoc(userRef),
      ]);

      // Workspace first: the profile may only reference an existing workspace.
      if (!workspaceSnap.exists()) {
        await setDoc(workspaceRef, {
          businessName,
          ownerUid: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          displayName,
          email,
          workspaceId: uid,
          createdAt: serverTimestamp(),
        });
      }
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
    // Never reveal whether an account exists for an address.
    if (errorCode(error) === "auth/user-not-found") return;
    throw toAuthError(error);
  }
}
