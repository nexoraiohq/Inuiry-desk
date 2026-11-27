import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Shared server-only Firebase Admin bootstrap. Never import this from a
 * client component. Credentials come exclusively from server environment
 * variables; the private key keeps literal \n escapes in Vercel.
 */
let cachedApp: App | null = null;

export function adminApp(): App {
  if (cachedApp) return cachedApp;
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin is not configured. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY."
    );
  }
  cachedApp = getApps()[0] ?? initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  return cachedApp;
}

export function adminDb(): Firestore {
  return getFirestore(adminApp());
}

export function adminAuth(): Auth {
  return getAuth(adminApp());
}
