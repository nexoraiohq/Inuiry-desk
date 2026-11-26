import type { Timestamp } from "firebase/firestore";

/** Workspace-scoped Phase 3 data model. All document IDs are Firestore IDs. */
export const INQUIRY_SOURCES = [
  "whatsapp",
  "website",
  "phone",
  "instagram",
  "facebook",
  "walk_in",
  "referral",
  "other",
] as const;
export type InquirySource = (typeof INQUIRY_SOURCES)[number];

export const INQUIRY_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "converted",
  "lost",
] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export const INQUIRY_PRIORITIES = ["low", "normal", "high"] as const;
export type InquiryPriority = (typeof INQUIRY_PRIORITIES)[number];

export const FOLLOW_UP_STATUSES = ["pending", "completed", "cancelled"] as const;
export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];

export const ACTIVITY_TYPES = [
  "inquiry_created",
  "status_changed",
  "communication_logged",
  "follow_up_created",
  "follow_up_completed",
  "follow_up_rescheduled",
  "follow_up_cancelled",
  "follow_up_deleted",
  "note_added",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/** Raw stored shape in `workspaces/{uid}/inquiries/{inquiryId}`. */
export type InquiryDocument = {
  fullName: string;
  phone: string;
  email: string | null;
  service: string;
  source: InquirySource;
  status: InquiryStatus;
  priority: InquiryPriority;
  notes: string | null;
  pinned: boolean;
  pinnedAt: Timestamp | null;
  sortOrder: number;
  archived: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastContactedAt: Timestamp | null;
  nextFollowUpAt: Timestamp | null;
  createdByUid: string;
};

export const COMMUNICATION_CHANNELS = [
  "phone",
  "whatsapp",
  "email",
  "sms",
  "in_person",
  "other",
] as const;
export type CommunicationChannel = (typeof COMMUNICATION_CHANNELS)[number];

export const COMMUNICATION_DIRECTIONS = ["incoming", "outgoing"] as const;
export type CommunicationDirection = (typeof COMMUNICATION_DIRECTIONS)[number];

/** Supported outcomes are strictly scoped to their channel. */
export const COMMUNICATION_OUTCOMES = {
  phone: ["connected", "no_answer", "voicemail"],
  whatsapp: ["message_sent", "customer_replied", "no_response"],
  email: ["email_sent", "customer_replied", "no_response"],
  sms: ["message_sent", "customer_replied", "no_response"],
  in_person: ["meeting_completed", "meeting_missed"],
  other: ["completed", "no_response", "other"],
} as const satisfies Record<CommunicationChannel, readonly string[]>;

export type CommunicationOutcome =
  (typeof COMMUNICATION_OUTCOMES)[CommunicationChannel][number];

export type CommunicationDocument = {
  inquiryId: string;
  channel: CommunicationChannel;
  direction: CommunicationDirection;
  outcome: CommunicationOutcome;
  summary: string;
  occurredAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdByUid: string;
  followUpId: string | null;
};

export type CommunicationRecord = Omit<
  CommunicationDocument,
  "occurredAt" | "createdAt" | "updatedAt"
> & {
  id: string;
  occurredAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

/** Raw stored shape in `workspaces/{uid}/followUps/{followUpId}`. */
export type FollowUpDocument = {
  inquiryId: string;
  customerName: string;
  title: string;
  description: string | null;
  dueAt: Timestamp;
  priority: InquiryPriority;
  status: FollowUpStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt: Timestamp | null;
  createdByUid: string;
};

/** Raw stored shape in `workspaces/{uid}/activities/{activityId}`. */
export type ActivityDocument = {
  type: ActivityType;
  inquiryId: string | null;
  description: string;
  createdAt: Timestamp;
  createdByUid: string;
};

type DateFields = "createdAt" | "updatedAt" | "lastContactedAt" | "nextFollowUpAt" | "pinnedAt";

export type InquiryRecord = Omit<InquiryDocument, DateFields> & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  lastContactedAt: Date | null;
  nextFollowUpAt: Date | null;
  pinnedAt: Date | null;
};

type FollowUpDateFields = "dueAt" | "createdAt" | "updatedAt" | "completedAt";
export type FollowUpRecord = Omit<FollowUpDocument, FollowUpDateFields> & {
  id: string;
  dueAt: Date;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
};

type ActivityDateFields = "createdAt";
export type ActivityRecord = Omit<ActivityDocument, ActivityDateFields> & {
  id: string;
  createdAt: Date;
};

export type DashboardMetrics = {
  totalInquiries: number;
  newInquiries: number;
  convertedInquiries: number;
  followUpsDue: number;
};

export type DashboardData = {
  metrics: DashboardMetrics;
  recentInquiries: InquiryRecord[];
  upcomingFollowUps: FollowUpRecord[];
  recentActivities: ActivityRecord[];
  generatedAt: Date;
};

/** Collection paths are always derived from the authenticated user's UID. */
export const workspaceCollections = (uid: string) => ({
  inquiries: `workspaces/${uid}/inquiries`,
  followUps: `workspaces/${uid}/followUps`,
  activities: `workspaces/${uid}/activities`,
  communications: `workspaces/${uid}/communications`,
} as const);
