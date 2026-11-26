import {
  collection,
  getCountFromServer,
  getDocs,
  limit,
  query,
  Timestamp,
  where,
  type DocumentSnapshot,
  type Firestore,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  ACTIVITY_TYPES,
  FOLLOW_UP_STATUSES,
  INQUIRY_PRIORITIES,
  INQUIRY_SOURCES,
  INQUIRY_STATUSES,
  type ActivityDocument,
  type ActivityRecord,
  type DashboardData,
  type FollowUpDocument,
  type FollowUpRecord,
  type InquiryDocument,
  type InquiryRecord,
} from "@/lib/dashboard/types";

export class DashboardServiceError extends Error {
  readonly code: string;

  constructor(message: string, code = "dashboard/load-failed") {
    super(message);
    this.name = "DashboardServiceError";
    this.code = code;
  }
}

export function firestore(): Firestore {
  if (!db) {
    throw new DashboardServiceError(
      "Firestore is not configured for this project.",
      "dashboard/unconfigured"
    );
  }
  return db;
}

function errorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    return String((error as { code: unknown }).code);
  }
  return "";
}

export function toServiceError(error: unknown): DashboardServiceError {
  if (error instanceof DashboardServiceError) return error;
  console.error("[dashboard] load failed", error);
  const code = errorCode(error);
  const messages: Record<string, string> = {
    "permission-denied": "You don't have access to this workspace.",
    unavailable: "The database is temporarily unavailable. Please try again.",
    "failed-precondition":
      "The database is preparing a query. Try again in a moment.",
  };
  return new DashboardServiceError(
    messages[code] ?? "We couldn't load your dashboard. Please try again.",
    code || "dashboard/unknown"
  );
}

function readNullableString(
  data: Record<string, unknown>,
  field: string
): string | null {
  const value = data[field];
  if (value == null) return null;
  if (typeof value !== "string") {
    throw new DashboardServiceError(`A record has an invalid ${field}.`);
  }
  return value;
}

function readTime(
  data: Record<string, unknown>,
  field: string,
  nullable = false
): Date | null {
  const value = data[field];
  if (value == null) {
    if (nullable) return null;
    throw new DashboardServiceError(`A record is missing its ${field}.`);
  }
  if (!(value instanceof Timestamp)) {
    throw new DashboardServiceError(`A record has an invalid ${field}.`);
  }
  return value.toDate();
}

function readBoolean(data: Record<string, unknown>, field: string, fallback = false): boolean {
  const value = data[field];
  return typeof value === "boolean" ? value : fallback;
}

function readNumber(data: Record<string, unknown>, field: string, fallback = 0): number {
  const value = data[field];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readEnumOrDefault<T extends string>(
  data: Record<string, unknown>,
  field: string,
  allowed: readonly T[],
  fallback: T
): T {
  const value = data[field];
  return typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : fallback;
}

function readStringOrDefault(
  data: Record<string, unknown>,
  field: string,
  fallback = "—"
): string {
  const value = data[field];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

export function parseInquiry(snapshot: DocumentSnapshot): InquiryRecord {
  const data = snapshot.data() as Record<string, unknown>;
  const record: InquiryDocument = {
    fullName: readStringOrDefault(data, "fullName", "Unnamed"),
    phone: readStringOrDefault(data, "phone", "—"),
    email: readNullableString(data, "email"),
    service: readStringOrDefault(data, "service", "—"),
    source: readEnumOrDefault(data, "source", INQUIRY_SOURCES, "other"),
    status: readEnumOrDefault(data, "status", INQUIRY_STATUSES, "new"),
    priority: readEnumOrDefault(data, "priority", INQUIRY_PRIORITIES, "normal"),
    notes: readNullableString(data, "notes"),
    pinned: readBoolean(data, "pinned"),
    pinnedAt: data.pinnedAt as Timestamp | null,
    sortOrder: readNumber(data, "sortOrder"),
    archived: readBoolean(data, "archived"),
    createdAt: data.createdAt as Timestamp,
    updatedAt: data.updatedAt as Timestamp,
    lastContactedAt: data.lastContactedAt as Timestamp | null,
    nextFollowUpAt: data.nextFollowUpAt as Timestamp | null,
    createdByUid: readStringOrDefault(data, "createdByUid", ""),
  };

  return {
    id: snapshot.id,
    fullName: record.fullName,
    phone: record.phone,
    email: record.email,
    service: record.service,
    source: record.source,
    status: record.status,
    priority: record.priority,
    notes: record.notes,
    pinned: record.pinned,
    pinnedAt: readTime(data, "pinnedAt", true),
    sortOrder: record.sortOrder,
    archived: record.archived,
    createdByUid: record.createdByUid,
    createdAt: readTime(data, "createdAt", true) ?? new Date(0),
    updatedAt: readTime(data, "updatedAt", true) ?? new Date(0),
    lastContactedAt: readTime(data, "lastContactedAt", true),
    nextFollowUpAt: readTime(data, "nextFollowUpAt", true),
  };
}

export function parseFollowUp(snapshot: DocumentSnapshot): FollowUpRecord {
  const data = snapshot.data() as Record<string, unknown>;
  const record: FollowUpDocument = {
    inquiryId: readStringOrDefault(data, "inquiryId", ""),
    customerName: readStringOrDefault(data, "customerName", "Unknown customer"),
    title: readStringOrDefault(data, "title", "Follow-up"),
    description: readNullableString(data, "description"),
    dueAt: data.dueAt as Timestamp,
    priority: readEnumOrDefault(data, "priority", INQUIRY_PRIORITIES, "normal"),
    status: readEnumOrDefault(data, "status", FOLLOW_UP_STATUSES, "pending"),
    createdAt: data.createdAt as Timestamp,
    updatedAt: data.updatedAt as Timestamp,
    completedAt: data.completedAt as Timestamp | null,
    createdByUid: readStringOrDefault(data, "createdByUid", ""),
  };

  return {
    id: snapshot.id,
    inquiryId: record.inquiryId,
    customerName: record.customerName,
    title: record.title,
    description: record.description,
    priority: record.priority,
    status: record.status,
    createdByUid: record.createdByUid,
    dueAt: readTime(data, "dueAt", true) ?? new Date(0),
    createdAt: readTime(data, "createdAt", true) ?? new Date(0),
    updatedAt: readTime(data, "updatedAt", true) ?? new Date(0),
    completedAt: readTime(data, "completedAt", true),
  };
}

export function parseActivity(snapshot: DocumentSnapshot): ActivityRecord {
  const data = snapshot.data() as Record<string, unknown>;
  const record: ActivityDocument = {
    type: readEnumOrDefault(data, "type", ACTIVITY_TYPES, "note_added"),
    inquiryId: readNullableString(data, "inquiryId"),
    description: readStringOrDefault(data, "description", "Activity recorded"),
    createdAt: data.createdAt as Timestamp,
    createdByUid: readStringOrDefault(data, "createdByUid", ""),
  };

  return {
    id: snapshot.id,
    type: record.type,
    inquiryId: record.inquiryId,
    description: record.description,
    createdByUid: record.createdByUid,
    createdAt: readTime(data, "createdAt", true) ?? new Date(0),
  };
}

/**
 * Loads only the aggregates and bounded lists the dashboard needs.
 * Every path is scoped by the authenticated user's UID.
 */
export async function getDashboardData(uid: string): Promise<DashboardData> {
  if (!uid) {
    throw new DashboardServiceError(
      "Sign in to view your workspace dashboard.",
      "dashboard/unauthenticated"
    );
  }

  const database = firestore();

  try {
    const inquiriesRef = collection(database, "workspaces", uid, "inquiries");
    const followUpsRef = collection(database, "workspaces", uid, "followUps");
    const activitiesRef = collection(database, "workspaces", uid, "activities");

    // No field-filter/orderBy on the query itself: documents missing optional
    // fields still load and are handled by the tolerant parsers.
    const [inquirySnapshot, followUpSnapshot, latestActivities, allCount, archivedCount] =
      await Promise.all([
        getDocs(query(inquiriesRef, limit(200))),
        getDocs(query(followUpsRef, limit(200))),
        getDocs(query(activitiesRef, limit(200))),
        getCountFromServer(query(inquiriesRef)),
        getCountFromServer(query(inquiriesRef, where("archived", "==", true))),
      ]);

    const inquiries = inquirySnapshot.docs
      .map((doc) => parseInquiry(doc as Parameters<typeof parseInquiry>[0]))
      .filter((item) => !item.archived)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const followUps = followUpSnapshot.docs.map((doc) =>
      parseFollowUp(doc as Parameters<typeof parseFollowUp>[0])
    );
    const pending = followUps.filter((item) => item.status === "pending");
    const nowMs = Date.now();
    const upcoming = pending
      .filter((item) => item.dueAt.getTime() > nowMs)
      .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());

    return {
      metrics: {
        totalInquiries: allCount.data().count - archivedCount.data().count,
        newInquiries: inquiries.filter((item) => item.status === "new").length,
        convertedInquiries: inquiries.filter(
          (item) => item.status === "converted"
        ).length,
        followUpsDue: pending.filter((item) => item.dueAt.getTime() <= nowMs).length,
      },
      recentInquiries: inquiries.slice(0, 5),
      upcomingFollowUps: upcoming.slice(0, 5),
      recentActivities: latestActivities.docs
        .map((doc) => parseActivity(doc as Parameters<typeof parseActivity>[0]))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 8),
      generatedAt: new Date(),
    };
  } catch (error) {
    throw toServiceError(error);
  }
}

/** Exact counts for the inquiries page, using server-side aggregation. */
export async function getInquiryCounts(
  uid: string
): Promise<{ total: number; newCount: number }> {
  if (!uid) {
    throw new DashboardServiceError("Sign in to view your inquiries.", "dashboard/unauthenticated");
  }
  const inquiriesRef = collection(firestore(), "workspaces", uid, "inquiries");
  try {
    const [all, archived, active] = await Promise.all([
      getCountFromServer(query(inquiriesRef)),
      getCountFromServer(query(inquiriesRef, where("archived", "==", true))),
      getDocs(query(inquiriesRef, limit(200))),
    ]);
    // Records without `archived` are active; count them correctly.
    const newCount = active.docs.filter((snapshot) => {
      const data = snapshot.data() as Record<string, unknown>;
      return data.status === "new" && data.archived !== true;
    }).length;
    return { total: all.data().count - archived.data().count, newCount };
  } catch (error) {
    throw toServiceError(error);
  }
}
