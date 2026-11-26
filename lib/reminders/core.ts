import type { FollowUpRecord } from "@/lib/dashboard/types";
import { dayKeyInZone } from "@/lib/datetime/zone";
import type {
  ReminderJobInput,
  ReminderNotificationInput,
  ReminderPreferences,
} from "@/lib/reminders/types";

type Candidate = {
  notification: ReminderNotificationInput;
  job: ReminderJobInput;
};

function scheduleVersion(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 1
    ? Math.floor(value)
    : 1;
}

function versionOf(followUp: FollowUpRecord & Record<string, unknown>): number {
  return scheduleVersion((followUp as Record<string, unknown>).scheduleVersion);
}

/**
 * Provider-independent evaluation. The caller sets the workspace timezone
 * before invoking this function and re-reads follow-ups before delivery.
 */
export function evaluateReminders({
  followUps,
  preferences,
  now,
  idFor,
}: {
  followUps: Array<FollowUpRecord & Record<string, unknown>>;
  preferences: ReminderPreferences;
  now: Date;
  idFor: (deduplicationKey: string) => string;
}): Candidate[] {
  if (!preferences.remindersEnabled) return [];

  const nowMs = now.getTime();
  const leadMs = Math.max(1, preferences.upcomingLeadMinutes) * 60_000;
  const overdueWindowMs = Math.max(1, preferences.overdueFrequencyHours) * 3_600_000;
  const todayKey = dayKeyInZone(now);
  const candidates: Candidate[] = [];

  for (const followUp of followUps) {
    if (followUp.status !== "pending") continue;
    const dueMs = followUp.dueAt.getTime();
    const version = versionOf(followUp);

    const push = (
      type: "follow_up_upcoming" | "follow_up_due" | "follow_up_overdue",
      bucket: string,
      title: string,
      message: string,
      scheduledFor: Date
    ) => {
      const deduplicationKey = `${followUp.id}:${type}:${version}:${bucket}`;
      const id = idFor(deduplicationKey);
      candidates.push({
        notification: {
          id,
          type,
          title,
          message,
          inquiryId: followUp.inquiryId,
          followUpId: followUp.id,
          scheduledFor,
          deduplicationKey,
          scheduleVersion: version,
          deliveryChannel: preferences.deliveryChannel,
        },
        job: {
          id,
          type,
          followUpId: followUp.id,
          inquiryId: followUp.inquiryId,
          dueAt: followUp.dueAt,
          scheduledFor,
          deduplicationKey,
          scheduleVersion: version,
        },
      });
    };

    if (dueMs > nowMs && dueMs <= nowMs + leadMs) {
      push(
        "follow_up_upcoming",
        `due-${dueMs}`,
        "Follow-up due soon",
        `A follow-up is due within ${preferences.upcomingLeadMinutes} minute${preferences.upcomingLeadMinutes === 1 ? "" : "s"}.`,
        new Date(dueMs - leadMs)
      );
    }

    if (preferences.dueRemindersEnabled && dueMs <= nowMs && dayKeyInZone(followUp.dueAt) === todayKey) {
      push("follow_up_due", `due-${dueMs}`, "Follow-up due today", "A follow-up is due now.", new Date(dueMs));
    }

    if (dueMs < nowMs && nowMs - dueMs >= overdueWindowMs) {
      const bucket = `overdue-${Math.floor(nowMs / overdueWindowMs)}`;
      push(
        "follow_up_overdue",
        bucket,
        "Follow-up overdue",
        "A follow-up is past its due date and still pending.",
        new Date(dueMs + overdueWindowMs)
      );
    }
  }

  return candidates;
}
