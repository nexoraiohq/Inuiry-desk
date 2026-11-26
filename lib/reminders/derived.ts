import { doc, getDoc, runTransaction, serverTimestamp, Timestamp, type Firestore } from "firebase/firestore";
import { firestore } from "@/lib/dashboard/service";
import { groupFor } from "@/lib/follow-ups/date";
import { dayKeyInZone } from "@/lib/datetime/zone";
import type { FollowUpRecord, InquiryRecord } from "@/lib/dashboard/types";

type Candidate = {
  id: string;
  type: "follow_up_due" | "follow_up_overdue" | "new_inquiry";
  title: string;
  message: string;
  inquiryId: string;
  followUpId: string;
  scheduledFor: Date;
  deduplicationKey: string;
};

/** Turns live workspace conditions into persisted, manageable notifications. */
export async function syncDerivedNotifications(
  uid: string,
  followUps: FollowUpRecord[],
  inquiries: InquiryRecord[]
): Promise<number> {
  const db: Firestore = firestore();
  const workspaceSnap = await getDoc(doc(db, "workspaces", uid));
  const cleared = workspaceSnap.data()?.notificationClearedAt;
  const clearedAt = cleared && typeof cleared.toDate === "function" ? cleared.toDate() : null;
  const now = new Date();
  const today = dayKeyInZone(now);
  const candidates: Candidate[] = [];

  for (const item of followUps.filter((value) => value.status === "pending").slice(0, 20)) {
    const group = groupFor(item.status, item.dueAt, now);
    if (group !== "overdue" && group !== "today") continue;
    const type = group === "overdue" ? "follow_up_overdue" : "follow_up_due";
    candidates.push({
      id: `derived_${type}_${item.id}_${today}`.slice(0, 120),
      type,
      title: group === "overdue" ? "Follow-up overdue" : "Follow-up due today",
      message: group === "overdue"
        ? "A pending follow-up is past its due date."
        : "A pending follow-up is due today.",
      inquiryId: item.inquiryId,
      followUpId: item.id,
      scheduledFor: item.dueAt,
      deduplicationKey: `${item.id}:${type}:${today}`,
    });
  }

  for (const item of inquiries.filter((value) => !value.archived && value.status === "new").slice(0, 20)) {
    candidates.push({
      id: `derived_new_inquiry_${item.id}`.slice(0, 120),
      type: "new_inquiry",
      title: "New inquiry",
      message: "A customer inquiry is awaiting first contact.",
      inquiryId: item.id,
      followUpId: "",
      scheduledFor: item.createdAt,
      deduplicationKey: `${item.id}:new_inquiry`,
    });
  }

  let created = 0;
  for (const candidate of candidates.slice(0, 30)) {
    if (clearedAt && candidate.scheduledFor.getTime() <= clearedAt.getTime()) continue;
    const ref = doc(db, "workspaces", uid, "notifications", candidate.id);
    const didCreate = await runTransaction(db, async (transaction) => {
      if ((await transaction.get(ref)).exists()) return false;
      transaction.set(ref, {
        ...candidate,
        createdAt: serverTimestamp(),
        readAt: null,
        status: "delivered",
        deliveryChannel: "in_app",
        deliveryStatus: "delivered",
        deliveredAt: Timestamp.fromDate(new Date()),
        error: null,
        createdByUid: uid,
        scheduleVersion: 1,
      });
      return true;
    });
    if (didCreate) created += 1;
  }
  return created;
}
