import type { Firestore } from "firebase-admin/firestore";
import type { UsageSnapshotInput } from "@/lib/subscription/entitlements";

/** Bounded usage measurement using Firestore count aggregations. */
export type UsageSnapshot = UsageSnapshotInput & {
  measuredAt: Date;
  periodStart: Date;
  periodEnd: Date;
};

/**
 * Counts are computed with server-side count() aggregations, so no documents
 * are streamed to the client. The period is the current UTC calendar month,
 * which gives a clear, documentable counting window for limits.
 */
export function currentUsagePeriod(now: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

export async function measureWorkspaceUsage(
  db: Firestore,
  workspaceId: string,
  now: Date = new Date()
): Promise<UsageSnapshot> {
  const workspace = db.collection("workspaces").doc(workspaceId);
  const inquiries = workspace.collection("inquiries");
  const followUps = workspace.collection("followUps");

  const [allInquiries, activeInquiries, allFollowUps] = await Promise.all([
    inquiries.count().get(),
    inquiries.where("archived", "==", false).count().get(),
    followUps.count().get(),
  ]);

  const period = currentUsagePeriod(now);
  return {
    totalInquiries: allInquiries.data().count,
    activeInquiries: activeInquiries.data().count,
    followUps: allFollowUps.data().count,
    measuredAt: now,
    periodStart: period.start,
    periodEnd: period.end,
  };
}
