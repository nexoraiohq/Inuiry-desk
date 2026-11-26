import type { InquirySource } from "@/lib/dashboard/types";
import type { ReminderPreferences } from "@/lib/reminders/types";
import { DEFAULT_REMINDER_PREFERENCES } from "@/lib/reminders/types";

export const DATE_FORMATS = ["MMM d, yyyy", "dd/MM/yyyy", "yyyy-MM-dd", "MM/dd/yyyy"] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];

export const WEEK_STARTS = [0, 1, 6] as const;
export type WeekStart = (typeof WEEK_STARTS)[number];

export const REPORTING_PERIODS = ["7d", "30d", "90d", "thisMonth"] as const;
export type ReportingPeriod = (typeof REPORTING_PERIODS)[number];

export type WorkspaceSource = {
  /** Stable id used in inquiry documents. */
  id: string;
  label: string;
  active: boolean;
  system: boolean;
};

export type WorkspaceProfile = {
  description: string;
  industry: string;
  email: string;
  phone: string;
  website: string;
  country: string;
  city: string;
  logoUrl: string;
};

export type WorkspacePreferences = {
  timezone: string;
  dateFormat: DateFormat;
  weekStartsOn: WeekStart;
  defaultReportingPeriod: ReportingPeriod;
};

export type FollowUpSettings = {
  defaultIntervalDays: number;
  workingDays: number[];
  startTime: string;
  endTime: string;
  defaultTime: string;
  reminders: ReminderPreferences;
};

export type WorkspaceSettings = {
  businessName: string;
  ownerUid: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  profile: WorkspaceProfile;
  preferences: WorkspacePreferences;
  inquirySettings: {
    sources: WorkspaceSource[];
    sourceIds: string[];
    activeSourceIds: string[];
  };
  followUpSettings: FollowUpSettings;
};

export const DEFAULT_PROFILE: WorkspaceProfile = {
  description: "",
  industry: "",
  email: "",
  phone: "",
  website: "",
  country: "",
  city: "",
  logoUrl: "",
};

export const DEFAULT_PREFERENCES: WorkspacePreferences = {
  timezone: "UTC",
  dateFormat: "MMM d, yyyy",
  weekStartsOn: 1,
  defaultReportingPeriod: "30d",
};

export const DEFAULT_FOLLOW_UP_SETTINGS: FollowUpSettings = {
  defaultIntervalDays: 3,
  workingDays: [1, 2, 3, 4, 5],
  startTime: "09:00",
  endTime: "17:00",
  defaultTime: "10:00",
  reminders: DEFAULT_REMINDER_PREFERENCES,
};

/** Canonical sources keep their original ids so existing records stay valid. */
export const SYSTEM_SOURCES: InquirySource[] = [
  "whatsapp",
  "website",
  "phone",
  "instagram",
  "facebook",
  "walk_in",
  "referral",
  "other",
];

export function defaultSources(): WorkspaceSource[] {
  return SYSTEM_SOURCES.map((id) => ({
    id,
    label: id
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
    active: true,
    system: true,
  }));
}

/** Valid IANA timezone identifiers only. */
export function isValidTimeZone(timezone: string): boolean {
  if (!timezone || timezone.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function normalizeSourceId(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
}

export function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function isValidHttpUrl(value: string): boolean {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
