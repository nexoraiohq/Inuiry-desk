import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentSnapshot,
} from "firebase/firestore";
import { DashboardServiceError, firestore, toServiceError } from "@/lib/dashboard/service";
import type { ReminderNotification } from "@/lib/reminders/types";

function parse(snapshot: DocumentSnapshot): ReminderNotification {
  const data = snapshot.data() as Record<string, unknown>;
  const date = (key: string) => {
    const value = data[key];
    return value && typeof (value as { toDate?: unknown }).toDate === "function"
      ? (value as { toDate: () => Date }).toDate()
      : new Date(0);
  };
  return {
    id: snapshot.id,
    type: (data.type as ReminderNotification["type"]) ?? "follow_up_due",
    title: String(data.title ?? "Reminder"),
    message: String(data.message ?? ""),
    inquiryId: String(data.inquiryId ?? ""),
    followUpId: String(data.followUpId ?? ""),
    scheduledFor: date("scheduledFor"),
    createdAt: date("createdAt"),
    readAt: data.readAt && typeof (data.readAt as { toDate?: unknown }).toDate === "function"
      ? (data.readAt as { toDate: () => Date }).toDate()
      : null,
    status: (data.status as ReminderNotification["status"]) ?? "delivered",
    deduplicationKey: String(data.deduplicationKey ?? ""),
    scheduleVersion: typeof data.scheduleVersion === "number" ? data.scheduleVersion : 1,
    deliveryChannel: (data.deliveryChannel as ReminderNotification["deliveryChannel"]) ?? "in_app",
    deliveryStatus: (data.deliveryStatus as ReminderNotification["deliveryStatus"]) ?? "delivered",
    deliveredAt: data.deliveredAt && typeof (data.deliveredAt as { toDate?: unknown }).toDate === "function"
      ? (data.deliveredAt as { toDate: () => Date }).toDate()
      : null,
    error: typeof data.error === "string" ? data.error : null,
  };
}

export async function listReminders(uid: string): Promise<ReminderNotification[]> {
  if (!uid) throw new DashboardServiceError("Sign in to view reminders.", "reminders/unauthenticated");
  try {
    const snapshot = await getDocs(
      query(
        collection(firestore(), "workspaces", uid, "notifications"),
        where("status", "==", "delivered"),
        orderBy("createdAt", "desc"),
        limit(50)
      )
    );
    return snapshot.docs.map((item) => parse(item as DocumentSnapshot));
  } catch (error) {
    throw toServiceError(error);
  }
}

export function subscribeReminders(
  uid: string,
  onData: (items: ReminderNotification[]) => void,
  onError?: (message: string) => void
): () => void {
  return onSnapshot(
    query(
      collection(firestore(), "workspaces", uid, "notifications"),
      where("status", "==", "delivered"),
      orderBy("createdAt", "desc"),
      limit(50)
    ),
    (snapshot) => onData(snapshot.docs.map((item) => parse(item as DocumentSnapshot))),
    () => onError?.("Could not listen for new notifications.")
  );
}

export async function markReminderRead(uid: string, id: string): Promise<void> {
  if (!uid) return;
  try {
    await updateDoc(doc(firestore(), "workspaces", uid, "notifications", id), {
      readAt: serverTimestamp(),
    });
  } catch (error) {
    throw toServiceError(error);
  }
}

export async function deleteReminder(uid: string, id: string): Promise<void> {
  if (!uid) return;
  try {
    const batch = writeBatch(firestore());
    batch.delete(doc(firestore(), "workspaces", uid, "notifications", id));
    await batch.commit();
  } catch (error) {
    throw toServiceError(error);
  }
}

export async function markAllRemindersRead(uid: string): Promise<number> {
  if (!uid) return 0;
  try {
    const snapshot = await getDocs(
      query(
        collection(firestore(), "workspaces", uid, "notifications"),
        where("status", "==", "delivered"),
        limit(50)
      )
    );
    const unread = snapshot.docs.filter((item) => !(item.data() as Record<string, unknown>).readAt);
    const batch = writeBatch(firestore());
    unread.forEach((item) => {
      batch.update(item.ref, { readAt: serverTimestamp() });
    });
    await batch.commit();
    return unread.length;
  } catch (error) {
    throw toServiceError(error);
  }
}

export async function deleteAllReminders(uid: string): Promise<number> {
  if (!uid) return 0;
  try {
    const snapshot = await getDocs(
      query(
        collection(firestore(), "workspaces", uid, "notifications"),
        where("status", "==", "delivered"),
        limit(50)
      )
    );
    const batch = writeBatch(firestore());
    snapshot.docs.forEach((item) => {
      batch.delete(item.ref);
    });
    batch.update(doc(firestore(), "workspaces", uid), {
      notificationClearedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
    return snapshot.size;
  } catch (error) {
    throw toServiceError(error);
  }
}
