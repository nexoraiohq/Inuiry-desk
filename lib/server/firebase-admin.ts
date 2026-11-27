import { createPublicKey, createVerify } from "node:crypto";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
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

/** Verified Firebase ID-token identity. No client-supplied uid is ever trusted. */
export type VerifiedToken = { uid: string; email: string };

const CERT_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
const CERT_TTL_MS = 60 * 60 * 1000;
let cachedCerts: Record<string, string> | null = null;
let certsFetchedAt = 0;

async function publicCerts(): Promise<Record<string, string>> {
  if (cachedCerts && Date.now() - certsFetchedAt < CERT_TTL_MS) return cachedCerts;
  const response = await fetch(CERT_URL, { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load Firebase signing certificates.");
  cachedCerts = (await response.json()) as Record<string, string>;
  certsFetchedAt = Date.now();
  return cachedCerts;
}

/** RS256 verification of Firebase ID tokens using Google's public x509 certs. */
export async function verifyIdToken(token: string): Promise<VerifiedToken> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid authentication token.");
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = JSON.parse(Buffer.from(encodedHeader, "base64url").toString("utf8")) as { kid?: string; alg?: string };
  if (!header.kid || header.alg !== "RS256") throw new Error("Unsupported authentication token.");

  const certificate = (await publicCerts())[header.kid];
  if (!certificate) throw new Error("Unknown authentication token key.");
  const valid = createVerify("RSA-SHA256")
    .update(`${encodedHeader}.${encodedPayload}`)
    .verify(createPublicKey(certificate), Buffer.from(encodedSignature, "base64url"));
  if (!valid) throw new Error("Invalid authentication token signature.");

  const claims = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as {
    aud?: string;
    iss?: string;
    sub?: string;
    email?: string;
    exp?: number;
    iat?: number;
  };
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const now = Math.floor(Date.now() / 1000);
  if (
    !claims.sub ||
    !claims.email ||
    claims.aud !== projectId ||
    claims.iss !== `https://securetoken.google.com/${projectId}` ||
    typeof claims.exp !== "number" ||
    claims.exp <= now ||
    typeof claims.iat !== "number" ||
    claims.iat > now + 60
  ) {
    throw new Error("Authentication token claims are invalid.");
  }
  return { uid: claims.sub, email: claims.email.toLowerCase() };
}
