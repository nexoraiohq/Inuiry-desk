import { createHash } from "node:crypto";
import { adminDb } from "@/lib/server/firebase-admin";
import type { FollowUpRecord } from "@/lib/dashboard/types";
import { evaluateReminders } from "@/lib/reminders/core";
import {
  DEFAULT_REMINDER_PREFERENCES,
  type ReminderPreferences,
} from "@/lib/reminders/types";

const MAX_WORKSPACES_PER_RUN = 50;
const MAX_FOLLOW_UPS_PER_WORKSPACE = 200;

function idFor(key: string): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 40);
}

function preferencesFrom(data: Record<string, unknown>): ReminderPreferences {
  const value = (data.followUpSettings ?? {}) as Record<string, unknown>;
  const reminders = (value.reminders ?? {}) as Record<string, unknown>;
  return {
    remindersEnabled:
      typeof reminders.remindersEnabled === "boolean"
        ? reminders.remindersEnabled
        : DEFAULT_REMINDER_PREFERENCES.remindersEnabled,
    upcomingLeadMinutes:
      typeof reminders.upcomingLeadMinutes === "number" &&
      reminders.upcomingLeadMinutes >= 1 &&
      reminders.upcomingLeadMinutes <= 1440
        ? reminders.upcomingLeadMinutes
        : DEFAULT_REMINDER_PREFERENCES.upcomingLeadMinutes,
    dueRemindersEnabled:
      typeof reminders.dueRemindersEnabled === "boolean"
        ? reminders.dueRemindersEnabled
        : DEFAULT_REMINDER_PREFERENCES.dueRemindersEnabled,
    overdueFrequencyHours:
      typeof reminders.overdueFrequencyHours === "number" &&
      reminders.overdueFrequencyHours >= 1 &&
      reminders.overdueFrequencyHours <= 168
        ? reminders.overdueFrequencyHours
        : DEFAULT_REMINDER_PREFERENCES.overdueFrequencyHours,
    deliveryChannel: "in_app",
  };
}

type FollowUpView = FollowUpRecord & Record<string, unknown>;

function followUpFrom(data: Record<string, unknown>, id: string): FollowUpView {
  const timestamp = (key: string): Date => {
    const value = data[key];
    return value && typeof (value as { toDate?: unknown }).toDate === "function"
      ? (value as { toDate: () => Date }).toDate()
      : new Date(0);
  };
  return {
    id,
    inquiryId: String(data.inquiryId ?? ""),
    customerName: String(data.customerName ?? ""),
    title: String(data.title ?? ""),
    description: typeof data.description === "string" ? data.description : null,
    dueAt: timestamp("dueAt"),
    status: (data.status === "completed" || data.status === "cancelled" ? data.status : "pending"),
    createdAt: timestamp("createdAt"),
    updatedAt: timestamp("updatedAt"),
    completedAt: data.completedAt && typeof (data.completedAt as { toDate?: unknown }).toDate === "function"
      ? (data.completedAt as { toDate: () => Date }).toDate()
      : null,
    createdByUid: String(data.createdByUid ?? ""),
    priority: "normal",
    scheduleVersion: typeof data.scheduleVersion === "number" ? data.scheduleVersion : 1,
  } as FollowUpView;
}

export type ReminderSweepResult = {
  workspaces: number;
  evaluated: number;
  created: number;
  skipped: number;
  failures: number;
};

/** Idempotent, bounded sweep. Safe to call repeatedly or concurrently. */
export async function runReminderSweep(now: Date = new Date()): Promise<ReminderSweepResult> {
  const db = adminDb();
  const result: ReminderSweepResult = {
    workspaces: 0,
    evaluated: 0,
    created: 0,
    skipped: 0,
    failures: 0,
  };

  const workspaces = await db.collection("workspaces").limit(MAX_WORKSPACES_PER_RUN).get();
  for (const workspace of workspaces.docs) {
    result.workspaces += 1;
    const uid = workspace.id;
    try {
      const data = workspace.data() as Record<string, unknown>;
      const preferences = preferencesFrom(data);
      if (!preferences.remindersEnabled) continue;

      const timezone =
        typeof (data.preferences as Record<string, unknown> | undefined)?.timezone === "string"
          ? ((data.preferences as Record<string, unknown>).timezone as string)
          : "UTC";
      const { setWorkspaceTimeZone } = await import("@/lib/datetime/zone");
      setWorkspaceTimeZone(timezone);

      const followUpSnapshot = await db
        .collection("workspaces")
        .doc(uid)
        .collection("followUps")
        .where("status", "==", "pending")
        .limit(MAX_FOLLOW_UPS_PER_WORKSPACE)
        .get();
      const followUps = followUpSnapshot.docs.map((doc) =>
        followUpFrom(doc.data() as Record<string, unknown>, doc.id)
      );
      result.evaluated += followUps.length;

      const candidates = evaluateReminders({ followUps, preferences, now, idFor });
      for (const candidate of candidates) {
        const notificationRef = db
          .collection("workspaces")
          .doc(uid)
          .collection("notifications")
          .doc(candidate.notification.id);
        const jobRef = db
          .collection("workspaces")
          .doc(uid)
          .collection("reminderJobs")
          .doc(candidate.job.id);
        const followUpRef = db
          .collection("workspaces")
          .doc(uid)
          .collection("followUps")
          .doc(candidate.job.followUpId);

        const created = await db.runTransaction(async (transaction) => {
          const [existingNotification, existingJob, followUpSnap] = await Promise.all([
            transaction.get(notificationRef),
            transaction.get(jobRef),
            transaction.get(followUpRef),
          ]);
          if (existingNotification.exists || existingJob.exists) return false;
          if (!followUpSnap.exists) return false;
          const current = followUpSnap.data() as Record<string, unknown>;
          if (current.status !== "pending") return false;
          const currentVersion =
            typeof current.scheduleVersion === "number" ? current.scheduleVersion : 1;
          if (currentVersion !== candidate.job.scheduleVersion) return false;
          const currentDue = current.dueAt as { toDate?: () => Date } | undefined;
          if (!currentDue?.toDate) return false;
          if (currentDue.toDate().getTime() !== candidate.job.dueAt.getTime()) return false;

          transaction.set(notificationRef, {
            ...candidate.notification,
            scheduledFor: candidate.notification.scheduledFor,
            createdAt: now,
            readAt: null,
            status: "delivered",
            deliveryStatus: "delivered",
            deliveredAt: now,
            error: null,
          });
          transaction.set(jobRef, {
            ...candidate.job,
            status: "delivered",
            attempts: 1,
            createdAt: now,
            updatedAt: now,
            lastError: null,
          });
          return true;
        });

        if (created) result.created += 1;
        else result.skipped += 1;
      }
    } catch (error) {
      result.failures += 1;
      console.error("[reminders] workspace sweep failed", {
        uid,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.info("[reminders] sweep complete", result);
  return result;
}
