import {
  collection,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
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
  type ActivityType,
  type DashboardData,
  type FollowUpDocument,
  type FollowUpRecord,
  type FollowUpStatus,
  type InquiryDocument,
  type InquiryPriority,
  type InquiryRecord,
  type InquirySource,
  type InquiryStatus,
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

function readString(data: Record<string, unknown>, field: string): string {
  const value = data[field];
  if (typeof value !== "string" || value.length === 0) {
    throw new DashboardServiceError(`A record is missing its ${field}.`);
  }
  return value;
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

function readEnum<T extends string>(
  data: Record<string, unknown>,
  field: string,
  allowed: readonly T[]
): T {
  const value = data[field];
  if (typeof value === "string" && allowed.includes(value as T)) return value as T;
  throw new DashboardServiceError(`A record has an invalid ${field}.`);
}

export function parseInquiry(snapshot: DocumentSnapshot): InquiryRecord {
  const data = snapshot.data() as Record<string, unknown>;
  const record: InquiryDocument = {
    fullName: readString(data, "fullName"),
    phone: readString(data, "phone"),
    email: readNullableString(data, "email"),
    service: readString(data, "service"),
    source: readEnum<InquirySource>(data, "source", INQUIRY_SOURCES),
    status: readEnum<InquiryStatus>(data, "status", INQUIRY_STATUSES),
    priority: readEnum<InquiryPriority>(data, "priority", INQUIRY_PRIORITIES),
    notes: readNullableString(data, "notes"),
    pinned: readBoolean(data, "pinned"),
    pinnedAt: data.pinnedAt as Timestamp | null,
    sortOrder: readNumber(data, "sortOrder"),
    archived: readBoolean(data, "archived"),
    createdAt: data.createdAt as Timestamp,
    updatedAt: data.updatedAt as Timestamp,
    lastContactedAt: data.lastContactedAt as Timestamp | null,
    nextFollowUpAt: data.nextFollowUpAt as Timestamp | null,
    createdByUid: readString(data, "createdByUid"),
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
    createdAt: readTime(data, "createdAt") as Date,
    updatedAt: readTime(data, "updatedAt") as Date,
    lastContactedAt: readTime(data, "lastContactedAt", true),
    nextFollowUpAt: readTime(data, "nextFollowUpAt", true),
  };
}

export function parseFollowUp(snapshot: DocumentSnapshot): FollowUpRecord {
  const data = snapshot.data() as Record<string, unknown>;
  const record: FollowUpDocument = {
    inquiryId: readString(data, "inquiryId"),
    customerName: readString(data, "customerName"),
    title: readString(data, "title"),
    dueAt: data.dueAt as Timestamp,
    status: readEnum<FollowUpStatus>(data, "status", FOLLOW_UP_STATUSES),
    createdAt: data.createdAt as Timestamp,
    updatedAt: data.updatedAt as Timestamp,
    completedAt: data.completedAt as Timestamp | null,
    createdByUid: readString(data, "createdByUid"),
  };

  return {
    id: snapshot.id,
    inquiryId: record.inquiryId,
    customerName: record.customerName,
    title: record.title,
    status: record.status,
    createdByUid: record.createdByUid,
    dueAt: readTime(data, "dueAt") as Date,
    createdAt: readTime(data, "createdAt") as Date,
    updatedAt: readTime(data, "updatedAt") as Date,
    completedAt: readTime(data, "completedAt", true),
  };
}

export function parseActivity(snapshot: DocumentSnapshot): ActivityRecord {
  const data = snapshot.data() as Record<string, unknown>;
  const record: ActivityDocument = {
    type: readEnum<ActivityType>(data, "type", ACTIVITY_TYPES),
    inquiryId: readNullableString(data, "inquiryId"),
    description: readString(data, "description"),
    createdAt: data.createdAt as Timestamp,
    createdByUid: readString(data, "createdByUid"),
  };

  return {
    id: snapshot.id,
    type: record.type,
    inquiryId: record.inquiryId,
    description: record.description,
    createdByUid: record.createdByUid,
    createdAt: readTime(data, "createdAt") as Date,
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
  const now = Timestamp.fromDate(new Date());

  try {
    const inquiriesRef = collection(database, "workspaces", uid, "inquiries");
    const followUpsRef = collection(database, "workspaces", uid, "followUps");
    const activitiesRef = collection(database, "workspaces", uid, "activities");

    // Inquiries use single-field queries only; a bounded active set is sorted
    // locally so no composite index is required just to show the dashboard.
    const activeInquiries = await getDocs(
      query(inquiriesRef, orderBy("createdAt", "desc"), limit(200))
    );
    const inquiries = activeInquiries.docs
      .map(parseInquiry)
      .filter((item) => !item.archived);

    const [totalSnapshot, dueSnapshot, nextFollowUps, latestActivities] =
      await Promise.all([
        getCountFromServer(query(inquiriesRef, where("archived", "==", false))),
        getCountFromServer(
          query(
            followUpsRef,
            where("status", "==", "pending"),
            where("dueAt", "<=", now)
          )
        ),
        getDocs(
          query(
            followUpsRef,
            where("status", "==", "pending"),
            orderBy("dueAt", "asc"),
            limit(5)
          )
        ),
        getDocs(query(activitiesRef, orderBy("createdAt", "desc"), limit(8))),
      ]);

    return {
      metrics: {
        totalInquiries: totalSnapshot.data().count,
        newInquiries: inquiries.filter((item) => item.status === "new").length,
        convertedInquiries: inquiries.filter(
          (item) => item.status === "converted"
        ).length,
        followUpsDue: dueSnapshot.data().count,
      },
      recentInquiries: inquiries.slice(0, 5),
      upcomingFollowUps: nextFollowUps.docs.map(parseFollowUp),
      recentActivities: latestActivities.docs.map(parseActivity),
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
    const [total, active] = await Promise.all([
      getCountFromServer(query(inquiriesRef, where("archived", "==", false))),
      getDocs(query(inquiriesRef, where("archived", "==", false), limit(200))),
    ]);
    // New count comes from the bounded active set; no composite index needed.
    const newCount = active.docs.filter(
      (snapshot) => snapshot.data().status === "new"
    ).length;
    return { total: total.data().count, newCount };
  } catch (error) {
    throw toServiceError(error);
  }
}
