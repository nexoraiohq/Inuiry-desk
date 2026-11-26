import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  type DocumentSnapshot,
  type Transaction,
} from "firebase/firestore";
import {
  DashboardServiceError,
  firestore,
  toServiceError,
} from "@/lib/dashboard/service";
import {
  COMMUNICATION_CHANNELS,
  COMMUNICATION_DIRECTIONS,
  COMMUNICATION_OUTCOMES,
  type CommunicationChannel,
  type CommunicationDirection,
  type CommunicationDocument,
  type CommunicationOutcome,
  type CommunicationRecord,
} from "@/lib/dashboard/types";
import { humanize } from "@/lib/dashboard/format";
import { combineLocalDateTime } from "@/lib/follow-ups/date";

const FETCH_LIMIT = 200;

export type CommunicationInput = {
  inquiryId: string;
  channel: CommunicationChannel;
  direction: CommunicationDirection;
  outcome: CommunicationOutcome;
  occurredDate: string;
  occurredTime: string;
  summary: string;
  followUpId: string | null;
};

function communicationsRef(uid: string) {
  return collection(firestore(), "workspaces", uid, "communications");
}

function activitiesRef(uid: string) {
  return collection(firestore(), "workspaces", uid, "activities");
}

function inquiryRef(uid: string, inquiryId: string) {
  return doc(firestore(), "workspaces", uid, "inquiries", inquiryId);
}

function requireUid(uid: string) {
  if (!uid) {
    throw new DashboardServiceError("Sign in to view communications.", "communications/unauthenticated");
  }
}

function text(data: Record<string, unknown>, field: string, fallback = "—"): string {
  const value = data[field];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function time(data: Record<string, unknown>, field: string): Date {
  const value = data[field];
  return value instanceof Timestamp ? value.toDate() : new Date(0);
}


function parseCommunication(snapshot: DocumentSnapshot): CommunicationRecord {
  const data = snapshot.data() as Record<string, unknown>;
  const channel = COMMUNICATION_CHANNELS.includes(data.channel as CommunicationChannel)
    ? (data.channel as CommunicationChannel)
    : "other";
  const allowed = COMMUNICATION_OUTCOMES[channel] as readonly string[];
  const outcome = allowed.includes(data.outcome as string)
    ? (data.outcome as CommunicationOutcome)
    : (allowed[0] as CommunicationOutcome);
  const record: CommunicationDocument = {
    inquiryId: text(data, "inquiryId", ""),
    channel,
    direction: COMMUNICATION_DIRECTIONS.includes(data.direction as CommunicationDirection)
      ? (data.direction as CommunicationDirection)
      : "outgoing",
    outcome,
    summary: text(data, "summary", "Interaction logged"),
    occurredAt: data.occurredAt as Timestamp,
    createdAt: data.createdAt as Timestamp,
    updatedAt: data.updatedAt as Timestamp,
    createdByUid: text(data, "createdByUid", ""),
    followUpId: typeof data.followUpId === "string" ? data.followUpId : null,
  };
  return {
    id: snapshot.id,
    inquiryId: record.inquiryId,
    channel: record.channel,
    direction: record.direction,
    outcome: record.outcome,
    summary: record.summary,
    createdByUid: record.createdByUid,
    followUpId: record.followUpId,
    occurredAt: time(data, "occurredAt"),
    createdAt: time(data, "createdAt"),
    updatedAt: time(data, "updatedAt"),
  };
}

function validate(input: CommunicationInput): Timestamp {
  if (!input.inquiryId) {
    throw new DashboardServiceError("An inquiry is required.");
  }
  if (!COMMUNICATION_CHANNELS.includes(input.channel)) {
    throw new DashboardServiceError("Choose a supported channel.");
  }
  if (!COMMUNICATION_DIRECTIONS.includes(input.direction)) {
    throw new DashboardServiceError("Choose a valid direction.");
  }
  const allowed = COMMUNICATION_OUTCOMES[input.channel] as readonly string[];
  if (!allowed.includes(input.outcome)) {
    throw new DashboardServiceError("Choose an outcome supported by this channel.");
  }
  if (!input.summary.trim() || input.summary.trim().length > 2000) {
    throw new DashboardServiceError("Enter a summary (up to 2000 characters).");
  }
  const occurred = combineLocalDateTime(input.occurredDate, input.occurredTime);
  if (!occurred) throw new DashboardServiceError("Enter a valid interaction date and time.");
  return Timestamp.fromDate(occurred);
}

function recordActivity(
  transaction: Transaction,
  uid: string,
  inquiryId: string,
  direction: CommunicationDirection,
  channel: CommunicationChannel
): void {
  transaction.set(doc(activitiesRef(uid)), {
    type: "communication_logged",
    inquiryId,
    description: `${humanize(direction)} ${humanize(channel)} interaction logged.`,
    createdAt: serverTimestamp(),
    createdByUid: uid,
  });
}

/** Bounded, newest-first history. No server-side field filters or ordering. */
export async function listCommunications(
  uid: string,
  inquiryId?: string
): Promise<CommunicationRecord[]> {
  requireUid(uid);
  try {
    const snapshot = await getDocs(query(communicationsRef(uid), limit(FETCH_LIMIT)));
    return snapshot.docs
      .map((doc) => parseCommunication(doc as Parameters<typeof parseCommunication>[0]))
      .filter((item) => !inquiryId || item.inquiryId === inquiryId)
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  } catch (error) {
    throw toServiceError(error);
  }
}

export async function getCommunication(
  uid: string,
  id: string
): Promise<CommunicationRecord> {
  requireUid(uid);
  try {
    const snapshot = await getDoc(doc(communicationsRef(uid), id));
    if (!snapshot.exists()) {
      throw new DashboardServiceError("Interaction not found.", "communications/not-found");
    }
    return parseCommunication(snapshot);
  } catch (error) {
    throw toServiceError(error);
  }
}

export async function createCommunication(
  uid: string,
  input: CommunicationInput
): Promise<string> {
  requireUid(uid);
  const occurredAt = validate(input);
  const reference = doc(communicationsRef(uid));

  try {
    await runTransaction(firestore(), async (transaction) => {
      transaction.set(reference, {
        inquiryId: input.inquiryId,
        channel: input.channel,
        direction: input.direction,
        outcome: input.outcome,
        summary: input.summary.trim(),
        occurredAt,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdByUid: uid,
        followUpId: input.followUpId,
      });
      recordActivity(transaction, uid, input.inquiryId, input.direction, input.channel);
      transaction.update(inquiryRef(uid, input.inquiryId), {
        lastContactedAt: occurredAt,
        updatedAt: serverTimestamp(),
      });
    });
    return reference.id;
  } catch (error) {
    throw toServiceError(error);
  }
}

/** Edits mutable fields only; inquiry, creator and createdAt stay untouched. */
export async function updateCommunication(
  uid: string,
  id: string,
  input: CommunicationInput
): Promise<void> {
  requireUid(uid);
  const occurredAt = validate(input);
  const reference = doc(communicationsRef(uid), id);

  try {
    await runTransaction(firestore(), async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) {
        throw new DashboardServiceError("Interaction not found.", "communications/not-found");
      }
      transaction.update(reference, {
        channel: input.channel,
        direction: input.direction,
        outcome: input.outcome,
        summary: input.summary.trim(),
        occurredAt,
        followUpId: input.followUpId,
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    throw toServiceError(error);
  }
}
