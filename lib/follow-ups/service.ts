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
  Timestamp,
  where,
  type Transaction,
} from "firebase/firestore";
import {
  DashboardServiceError,
  firestore,
  parseActivity,
  parseFollowUp,
  toServiceError,
} from "@/lib/dashboard/service";
import {
  INQUIRY_PRIORITIES,
  type ActivityRecord,
  type FollowUpRecord,
  type InquiryPriority,
} from "@/lib/dashboard/types";
import { listInquiries } from "@/lib/inquiries/service";
import { groupFor } from "@/lib/follow-ups/date";

const FOLLOW_UP_FETCH_LIMIT = 200;

export type FollowUpInput = {
  inquiryId: string;
  customerName: string;
  title: string;
  description: string;
  dueDate: string;
  dueTime: string;
  priority: InquiryPriority;
};

export type FollowUpEdit = {
  title: string;
  description: string;
  dueDate: string;
  dueTime: string;
  priority: InquiryPriority;
};

export type FollowUpDetail = {
  followUp: FollowUpRecord;
  activities: ActivityRecord[];
};

export type FollowUpCounts = {
  overdue: number;
  today: number;
  upcoming: number;
  completed: number;
};

function followUpsRef(uid: string) {
  return collection(firestore(), "workspaces", uid, "followUps");
}

function activitiesRef(uid: string) {
  return collection(firestore(), "workspaces", uid, "activities");
}

function inquiryRef(uid: string, inquiryId: string) {
  return doc(firestore(), "workspaces", uid, "inquiries", inquiryId);
}

function requireUid(uid: string) {
  if (!uid) {
    throw new DashboardServiceError("Sign in to view follow-ups.", "followups/unauthenticated");
  }
}

function toTimestamp(date: string, time: string): Timestamp {
  const matchDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const matchTime = /^(\d{2}):(\d{2})$/.exec(time);
  if (!matchDate || !matchTime) {
    throw new DashboardServiceError("Enter a valid due date and time.");
  }
  const result = new Date(
    Number(matchDate[1]),
    Number(matchDate[2]) - 1,
    Number(matchDate[3]),
    Number(matchTime[1]),
    Number(matchTime[2])
  );
  if (
    result.getFullYear() !== Number(matchDate[1]) ||
    result.getMonth() !== Number(matchDate[2]) - 1 ||
    result.getDate() !== Number(matchDate[3])
  ) {
    throw new DashboardServiceError("Enter a valid due date and time.");
  }
  return Timestamp.fromDate(result);
}

function validateInput(input: FollowUpInput | FollowUpEdit): void {
  if (!("inquiryId" in input) || !input.inquiryId) {
    throw new DashboardServiceError("Choose a customer inquiry.");
  }
  if (!input.title.trim() || input.title.trim().length > 150) {
    throw new DashboardServiceError("Enter a title (up to 150 characters).");
  }
  if (input.description.length > 2000) {
    throw new DashboardServiceError("Description must be 2000 characters or fewer.");
  }
  if (!INQUIRY_PRIORITIES.includes(input.priority)) {
    throw new DashboardServiceError("Choose a valid priority.");
  }
  toTimestamp(input.dueDate, input.dueTime);
}

/** Finds the earliest remaining pending date before the transaction starts. */
async function nextFollowUpTimestamp(
  uid: string,
  inquiryId: string,
  options: { excludeId?: string; includeDueAt?: Timestamp } = {}
): Promise<Timestamp | null> {
  const pending = await getDocs(
    query(followUpsRef(uid), where("inquiryId", "==", inquiryId), limit(50))
  );
  const dates: Timestamp[] = [];
  pending.forEach((snapshot) => {
    if (snapshot.id === options.excludeId) return;
    const data = snapshot.data() as Record<string, unknown>;
    if (data.status === "pending" && data.dueAt instanceof Timestamp) {
      dates.push(data.dueAt);
    }
  });
  if (options.includeDueAt) dates.push(options.includeDueAt);
  return dates.sort((a, b) => a.toMillis() - b.toMillis())[0] ?? null;
}

/** Keeps inquiry.nextFollowUpAt equal to the earliest remaining pending date. */
function writeNextFollowUp(
  transaction: Transaction,
  uid: string,
  inquiryId: string,
  next: Timestamp | null
): void {
  transaction.update(inquiryRef(uid, inquiryId), {
    nextFollowUpAt: next,
    updatedAt: serverTimestamp(),
  });
}

function recordActivity(
  transaction: Transaction,
  uid: string,
  inquiryId: string,
  type: "follow_up_created" | "follow_up_completed" | "follow_up_rescheduled" | "follow_up_cancelled" | "follow_up_deleted" | "note_added",
  description: string
): void {
  transaction.set(doc(activitiesRef(uid)), {
    type,
    inquiryId,
    description,
    createdAt: serverTimestamp(),
    createdByUid: uid,
  });
}

/** Bounded list; classification is dynamic and based on the viewer's clock. */
export async function listFollowUps(uid: string): Promise<FollowUpRecord[]> {
  requireUid(uid);
  try {
    const snapshot = await getDocs(query(followUpsRef(uid), limit(FOLLOW_UP_FETCH_LIMIT)));
    return snapshot.docs
      .map((doc) => parseFollowUp(doc as Parameters<typeof parseFollowUp>[0]))
      .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
  } catch (error) {
    throw toServiceError(error);
  }
}

export async function getFollowUpCounts(uid: string): Promise<FollowUpCounts> {
  const records = await listFollowUps(uid);
  const now = new Date();
  return {
    overdue: records.filter((item) => groupFor(item.status, item.dueAt, now) === "overdue").length,
    today: records.filter((item) => groupFor(item.status, item.dueAt, now) === "today").length,
    upcoming: records.filter((item) => groupFor(item.status, item.dueAt, now) === "upcoming").length,
    completed: records.filter((item) => item.status === "completed").length,
  };
}

export async function getFollowUpDetail(
  uid: string,
  followUpId: string
): Promise<FollowUpDetail> {
  requireUid(uid);
  try {
    const snapshot = await getDoc(doc(followUpsRef(uid), followUpId));
    if (!snapshot.exists()) {
      throw new DashboardServiceError("Follow-up not found.", "followups/not-found");
    }
    const followUp = parseFollowUp(snapshot);
    const activities = await getDocs(
      query(
        activitiesRef(uid),
        where("inquiryId", "==", followUp.inquiryId),
        orderBy("createdAt", "desc"),
        limit(20)
      )
    );
    return { followUp, activities: activities.docs.map((doc) =>
      parseActivity(doc as Parameters<typeof parseActivity>[0])
    ) };
  } catch (error) {
    throw toServiceError(error);
  }
}

export async function getSelectableInquiries(uid: string) {
  const inquiries = await listInquiries(uid);
  return inquiries.filter((item) => !item.archived);
}

export async function createFollowUp(
  uid: string,
  input: FollowUpInput
): Promise<string> {
  requireUid(uid);
  validateInput(input);
  const database = firestore();
  const dueAt = toTimestamp(input.dueDate, input.dueTime);

  try {
    const followUpRef = doc(followUpsRef(uid));
    const next = await nextFollowUpTimestamp(uid, input.inquiryId, { includeDueAt: dueAt });
    await runTransaction(database, async (transaction) => {
      transaction.set(followUpRef, {
        inquiryId: input.inquiryId,
        customerName: input.customerName,
        title: input.title.trim(),
        description: input.description.trim() || null,
        dueAt,
        priority: input.priority,
        status: "pending",
        scheduleVersion: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        completedAt: null,
        createdByUid: uid,
      });
      recordActivity(transaction, uid, input.inquiryId, "follow_up_created", "Follow-up scheduled.");
      writeNextFollowUp(transaction, uid, input.inquiryId, next);
    });
    return followUpRef.id;
  } catch (error) {
    throw toServiceError(error);
  }
}

export async function updateFollowUp(
  uid: string,
  followUpId: string,
  input: FollowUpEdit
): Promise<void> {
  requireUid(uid);
  validateInput({ ...input, inquiryId: "required" });
  const reference = doc(followUpsRef(uid), followUpId);
  const dueAt = toTimestamp(input.dueDate, input.dueTime);

  try {
    const existing = await getDoc(reference);
    if (!existing.exists()) throw new DashboardServiceError("Follow-up not found.", "followups/not-found");
    const existingRecord = parseFollowUp(existing);
    const next = await nextFollowUpTimestamp(uid, existingRecord.inquiryId, {
      excludeId: followUpId,
      includeDueAt: dueAt,
    });
    await runTransaction(firestore(), async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) throw new DashboardServiceError("Follow-up not found.", "followups/not-found");
      const current = parseFollowUp(snapshot);
      const rescheduled = current.dueAt.getTime() !== dueAt.toMillis();
      const notesChanged = (current.description ?? "") !== input.description.trim();

      const raw = snapshot.data() as Record<string, unknown>;
      const currentVersion =
        typeof raw.scheduleVersion === "number" && raw.scheduleVersion >= 1
          ? raw.scheduleVersion
          : 1;

      transaction.update(reference, {
        title: input.title.trim(),
        description: input.description.trim() || null,
        dueAt,
        priority: input.priority,
        ...(rescheduled ? { scheduleVersion: currentVersion + 1 } : {}),
        updatedAt: serverTimestamp(),
      });
      if (rescheduled) {
        recordActivity(transaction, uid, current.inquiryId, "follow_up_rescheduled", "Follow-up rescheduled.");
      }
      if (notesChanged) {
        recordActivity(transaction, uid, current.inquiryId, "note_added", "Follow-up notes updated.");
      }
      writeNextFollowUp(transaction, uid, current.inquiryId, next);
    });
  } catch (error) {
    throw toServiceError(error);
  }
}

export async function completeFollowUp(uid: string, followUpId: string): Promise<void> {
  requireUid(uid);
  const reference = doc(followUpsRef(uid), followUpId);
  try {
    const existing = await getDoc(reference);
    if (!existing.exists()) throw new DashboardServiceError("Follow-up not found.", "followups/not-found");
    const existingRecord = parseFollowUp(existing);
    if (existingRecord.status === "completed") return;
    const next = await nextFollowUpTimestamp(uid, existingRecord.inquiryId, { excludeId: followUpId });
    await runTransaction(firestore(), async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) throw new DashboardServiceError("Follow-up not found.", "followups/not-found");
      const current = parseFollowUp(snapshot);
      if (current.status === "completed") return; // no duplicate event
      transaction.update(reference, {
        status: "completed",
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      recordActivity(transaction, uid, current.inquiryId, "follow_up_completed", "Follow-up completed.");
      writeNextFollowUp(transaction, uid, current.inquiryId, next);
    });
  } catch (error) {
    throw toServiceError(error);
  }
}

export async function rescheduleFollowUp(
  uid: string,
  followUpId: string,
  dueDate: string,
  dueTime: string
): Promise<void> {
  const detail = await getFollowUpDetail(uid, followUpId);
  await updateFollowUp(uid, followUpId, {
    title: detail.followUp.title,
    description: detail.followUp.description ?? "",
    dueDate,
    dueTime,
    priority: detail.followUp.priority,
  });
}

/** Permanently removes a follow-up and keeps the inquiry's next date accurate. */
export async function deleteFollowUp(uid: string, followUpId: string): Promise<void> {
  requireUid(uid);
  const reference = doc(followUpsRef(uid), followUpId);
  try {
    const existing = await getDoc(reference);
    if (!existing.exists()) throw new DashboardServiceError("Follow-up not found.", "followups/not-found");
    const current = parseFollowUp(existing);
    const next = await nextFollowUpTimestamp(uid, current.inquiryId, { excludeId: followUpId });
    await runTransaction(firestore(), async (transaction) => {
      transaction.delete(reference);
      recordActivity(transaction, uid, current.inquiryId, "follow_up_deleted", "Follow-up deleted.");
      writeNextFollowUp(transaction, uid, current.inquiryId, next);
    });
  } catch (error) {
    throw toServiceError(error);
  }
}

export async function cancelFollowUp(uid: string, followUpId: string): Promise<void> {
  requireUid(uid);
  const reference = doc(followUpsRef(uid), followUpId);
  try {
    const existing = await getDoc(reference);
    if (!existing.exists()) throw new DashboardServiceError("Follow-up not found.", "followups/not-found");
    const existingRecord = parseFollowUp(existing);
    if (existingRecord.status === "cancelled") return;
    const next = await nextFollowUpTimestamp(uid, existingRecord.inquiryId, { excludeId: followUpId });
    await runTransaction(firestore(), async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) throw new DashboardServiceError("Follow-up not found.", "followups/not-found");
      const current = parseFollowUp(snapshot);
      if (current.status === "cancelled") return;
      transaction.update(reference, { status: "cancelled", updatedAt: serverTimestamp() });
      recordActivity(transaction, uid, current.inquiryId, "follow_up_cancelled", "Follow-up cancelled.");
      writeNextFollowUp(transaction, uid, current.inquiryId, next);
    });
  } catch (error) {
    throw toServiceError(error);
  }
}
