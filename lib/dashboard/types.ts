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
  "follow_up_created",
  "follow_up_completed",
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
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastContactedAt: Timestamp | null;
  nextFollowUpAt: Timestamp | null;
  createdByUid: string;
};

/** Raw stored shape in `workspaces/{uid}/followUps/{followUpId}`. */
export type FollowUpDocument = {
  inquiryId: string;
  customerName: string;
  title: string;
  dueAt: Timestamp;
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

type DateFields = "createdAt" | "updatedAt" | "lastContactedAt" | "nextFollowUpAt";

export type InquiryRecord = Omit<InquiryDocument, DateFields> & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  lastContactedAt: Date | null;
  nextFollowUpAt: Date | null;
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
} as const);
