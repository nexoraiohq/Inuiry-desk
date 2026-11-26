/** Workspace-scoped reminder records. Stored fields use Firestore Timestamps. */
export const REMINDER_TYPES = [
  "follow_up_upcoming",
  "follow_up_due",
  "follow_up_overdue",
] as const;
export type ReminderType = (typeof REMINDER_TYPES)[number];

export const REMINDER_STATUSES = [
  "scheduled",
  "delivered",
  "cancelled",
  "failed",
] as const;
export type ReminderStatus = (typeof REMINDER_STATUSES)[number];

export const DELIVERY_CHANNELS = ["in_app"] as const;
export type DeliveryChannel = (typeof DELIVERY_CHANNELS)[number];

export const DELIVERY_STATUSES = ["pending", "delivered", "failed"] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export type ReminderNotificationInput = {
  id: string;
  type: ReminderType;
  title: string;
  message: string;
  inquiryId: string;
  followUpId: string;
  scheduledFor: Date;
  deduplicationKey: string;
  scheduleVersion: number;
  deliveryChannel: DeliveryChannel;
};

export type ReminderNotification = ReminderNotificationInput & {
  createdAt: Date;
  readAt: Date | null;
  status: ReminderStatus;
  deliveryStatus: DeliveryStatus;
  deliveredAt: Date | null;
  error: string | null;
};

export type ReminderJobInput = {
  id: string;
  type: ReminderType;
  followUpId: string;
  inquiryId: string;
  dueAt: Date;
  scheduledFor: Date;
  deduplicationKey: string;
  scheduleVersion: number;
};

export type ReminderJob = ReminderJobInput & {
  status: ReminderStatus;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
  lastError: string | null;
};

export type ReminderPreferences = {
  remindersEnabled: boolean;
  upcomingLeadMinutes: number;
  dueRemindersEnabled: boolean;
  overdueFrequencyHours: number;
  deliveryChannel: DeliveryChannel;
};

export const DEFAULT_REMINDER_PREFERENCES: ReminderPreferences = {
  remindersEnabled: true,
  upcomingLeadMinutes: 60,
  dueRemindersEnabled: true,
  overdueFrequencyHours: 24,
  deliveryChannel: "in_app",
};
