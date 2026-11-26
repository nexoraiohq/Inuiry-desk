import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import {
  DashboardServiceError,
  firestore,
  parseActivity,
  parseFollowUp,
  parseInquiry,
  toServiceError,
} from "@/lib/dashboard/service";
import {
  INQUIRY_PRIORITIES,
  INQUIRY_SOURCES,
  INQUIRY_STATUSES,
  type ActivityRecord,
  type FollowUpRecord,
  type InquiryPriority,
  type InquiryRecord,
  type InquirySource,
  type InquiryStatus,
} from "@/lib/dashboard/types";
import { humanize } from "@/lib/dashboard/format";
import { isValidOptionalEmail, isValidPhone, normalizePhone } from "@/lib/inquiries/phone";

export const INQUIRY_PAGE_SIZE = 10;
/** Bounded working set for search/filter/sort. See FIREBASE_SETUP.md. */
export const INQUIRY_FETCH_LIMIT = 200;

export type InquiryInput = {
  fullName: string;
  phone: string;
  email: string;
  service: string;
  source: InquirySource;
  priority: InquiryPriority;
  notes: string;
};

export type InquiryEdit = Omit<InquiryInput, "notes">;

export type InquiryDetail = {
  inquiry: InquiryRecord;
  followUps: FollowUpRecord[];
  activities: ActivityRecord[];
};

function inquiriesRef(uid: string) {
  return collection(firestore(), "workspaces", uid, "inquiries");
}

function activitiesRef(uid: string) {
  return collection(firestore(), "workspaces", uid, "activities");
}

function followUpsRef(uid: string) {
  return collection(firestore(), "workspaces", uid, "followUps");
}

function requireUid(uid: string) {
  if (!uid) {
    throw new DashboardServiceError(
      "Sign in to manage inquiries.",
      "inquiries/unauthenticated"
    );
  }
}

function validateInput(input: InquiryInput): void {
  const name = input.fullName.trim();
  const service = input.service.trim();
  if (name.length < 2 || name.length > 100) {
    throw new DashboardServiceError("Enter a full name between 2 and 100 characters.");
  }
  if (!isValidPhone(input.phone)) {
    throw new DashboardServiceError("Enter a valid phone number with country code.");
  }
  if (!isValidOptionalEmail(input.email)) {
    throw new DashboardServiceError("Enter a valid email address or leave it blank.");
  }
  if (!service || service.length > 150) {
    throw new DashboardServiceError("Enter a service (up to 150 characters).");
  }
  if (!INQUIRY_SOURCES.includes(input.source)) {
    throw new DashboardServiceError("Choose a valid inquiry source.");
  }
  if (!INQUIRY_PRIORITIES.includes(input.priority)) {
    throw new DashboardServiceError("Choose a valid priority.");
  }
  if (input.notes.length > 2000) {
    throw new DashboardServiceError("Notes must be 2000 characters or fewer.");
  }
}

/** Backfills fields added after the first inquiries existed. */
function legacyFields(data: Record<string, unknown>) {
  return {
    pinned: typeof data.pinned === "boolean" ? data.pinned : false,
    pinnedAt: data.pinnedAt ?? null,
    sortOrder:
      typeof data.sortOrder === "number" && Number.isFinite(data.sortOrder)
        ? data.sortOrder
        : Date.now(),
    archived: typeof data.archived === "boolean" ? data.archived : false,
    notes: typeof data.notes === "string" ? data.notes : null,
  };
}

function editableData(input: InquiryEdit) {
  const email = input.email.trim();
  return {
    fullName: input.fullName.trim(),
    phone: normalizePhone(input.phone),
    email: email || null,
    service: input.service.trim(),
    source: input.source,
    priority: input.priority,
  };
}

/** Bounded list for the management screen — no unbounded collection reads. */
export async function listInquiries(
  uid: string,
  includeArchived = false
): Promise<InquiryRecord[]> {
  requireUid(uid);
  try {
    const base = inquiriesRef(uid);
    // No field filters in the query: every workspace document is readable and
    // legacy records without optional fields are handled by parseInquiry.
    const listQuery = query(base, limit(INQUIRY_FETCH_LIMIT));
    const snapshot = await getDocs(listQuery);
    const records = snapshot.docs.map((doc) =>
      parseInquiry(doc as Parameters<typeof parseInquiry>[0])
    );
    return records
      .filter((item) => includeArchived || !item.archived)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    throw toServiceError(error);
  }
}

export async function getInquiryDetail(
  uid: string,
  inquiryId: string
): Promise<InquiryDetail> {
  requireUid(uid);
  if (!inquiryId) {
    throw new DashboardServiceError("Inquiry not found.", "inquiries/not-found");
  }
  try {
    const inquirySnapshot = await getDoc(doc(inquiriesRef(uid), inquiryId));
    if (!inquirySnapshot.exists()) {
      throw new DashboardServiceError("Inquiry not found.", "inquiries/not-found");
    }

    const [followUps, activities] = await Promise.all([
      getDocs(
        query(
          followUpsRef(uid),
          where("inquiryId", "==", inquiryId),
          limit(20)
        )
      ),
      getDocs(
        query(
          activitiesRef(uid),
          where("inquiryId", "==", inquiryId),
          orderBy("createdAt", "desc"),
          limit(20)
        )
      ),
    ]);

    return {
      inquiry: parseInquiry(inquirySnapshot),
      followUps: followUps.docs.map((doc) =>
        parseFollowUp(doc as Parameters<typeof parseFollowUp>[0])
      ),
      activities: activities.docs.map((doc) =>
        parseActivity(doc as Parameters<typeof parseActivity>[0])
      ),
    };
  } catch (error) {
    throw toServiceError(error);
  }
}

/** Creates the inquiry and its activity events in one atomic transaction. */
export async function createInquiry(
  uid: string,
  input: InquiryInput
): Promise<string> {
  requireUid(uid);
  validateInput(input);
  const database = firestore();

  try {
    const inquiryRef = doc(inquiriesRef(uid));
    const activityRef = doc(activitiesRef(uid));
    const noteActivityRef = doc(activitiesRef(uid));
    const notes = input.notes.trim();

    await runTransaction(database, async (transaction) => {
      transaction.set(inquiryRef, {
        ...editableData(input),
        status: "new",
        notes: notes || null,
        pinned: false,
        pinnedAt: null,
        sortOrder: Date.now(),
        archived: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastContactedAt: null,
        nextFollowUpAt: null,
        createdByUid: uid,
      });

      // Descriptions never include phone, email or note contents.
      transaction.set(activityRef, {
        type: "inquiry_created",
        inquiryId: inquiryRef.id,
        description: `New inquiry received via ${humanize(input.source)}.`,
        createdAt: serverTimestamp(),
        createdByUid: uid,
      });

      if (notes) {
        transaction.set(noteActivityRef, {
          type: "note_added",
          inquiryId: inquiryRef.id,
          description: "Initial notes added to the inquiry.",
          createdAt: serverTimestamp(),
          createdByUid: uid,
        });
      }
    });

    return inquiryRef.id;
  } catch (error) {
    throw toServiceError(error);
  }
}

/** Edits only mutable fields; createdAt, createdByUid and status stay intact. */
export async function updateInquiry(
  uid: string,
  inquiryId: string,
  input: InquiryEdit
): Promise<void> {
  requireUid(uid);
  validateInput({ ...input, notes: "" });
  const reference = doc(inquiriesRef(uid), inquiryId);

  try {
    await runTransaction(firestore(), async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) {
        throw new DashboardServiceError("Inquiry not found.", "inquiries/not-found");
      }
      transaction.update(reference, {
        ...legacyFields(snapshot.data() as Record<string, unknown>),
        ...editableData(input),
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    throw toServiceError(error);
  }
}

/** Atomic status change with exactly one activity event per real change. */
export async function changeInquiryStatus(
  uid: string,
  inquiryId: string,
  nextStatus: InquiryStatus
): Promise<void> {
  requireUid(uid);
  if (!INQUIRY_STATUSES.includes(nextStatus)) {
    throw new DashboardServiceError("Choose a valid status.");
  }
  const reference = doc(inquiriesRef(uid), inquiryId);

  try {
    await runTransaction(firestore(), async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) {
        throw new DashboardServiceError("Inquiry not found.", "inquiries/not-found");
      }
      const previous = parseInquiry(snapshot).status;
      if (previous === nextStatus) return; // no duplicate write or activity

      transaction.update(reference, {
        ...legacyFields(snapshot.data() as Record<string, unknown>),
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      transaction.set(doc(activitiesRef(uid)), {
        type: "status_changed",
        inquiryId,
        description: `Status changed from ${humanize(previous)} to ${humanize(nextStatus)}.`,
        createdAt: serverTimestamp(),
        createdByUid: uid,
      });
    });
  } catch (error) {
    throw toServiceError(error);
  }
}

/** Pins or unpins an inquiry inside its owner's workspace. */
export async function setInquiryPinned(
  uid: string,
  inquiryId: string,
  pinned: boolean
): Promise<void> {
  requireUid(uid);
  const reference = doc(inquiriesRef(uid), inquiryId);
  try {
    await runTransaction(firestore(), async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) {
        throw new DashboardServiceError("Inquiry not found.", "inquiries/not-found");
      }
      transaction.update(reference, {
        ...legacyFields(snapshot.data() as Record<string, unknown>),
        pinned,
        pinnedAt: pinned ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    throw toServiceError(error);
  }
}

/** Soft-delete: keeps the inquiry, follow-ups and activity history intact. */
export async function archiveInquiry(
  uid: string,
  inquiryId: string,
  archived: boolean
): Promise<void> {
  requireUid(uid);
  const reference = doc(inquiriesRef(uid), inquiryId);
  try {
    await runTransaction(firestore(), async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) {
        throw new DashboardServiceError("Inquiry not found.", "inquiries/not-found");
      }
      transaction.update(reference, {
        ...legacyFields(snapshot.data() as Record<string, unknown>),
        archived,
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    throw toServiceError(error);
  }
}

/** Applies a manual order within the owner's workspace. */
export async function reorderInquiries(
  uid: string,
  orderedIds: string[]
): Promise<void> {
  requireUid(uid);
  try {
    await runTransaction(firestore(), async (transaction) => {
      for (const [index, id] of orderedIds.entries()) {
        const reference = doc(inquiriesRef(uid), id);
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists()) continue;
        transaction.update(reference, {
          ...legacyFields(snapshot.data() as Record<string, unknown>),
          sortOrder: index,
          updatedAt: serverTimestamp(),
        });
      }
    });
  } catch (error) {
    throw toServiceError(error);
  }
}
