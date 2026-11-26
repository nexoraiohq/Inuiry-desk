import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { updateProfile, type User } from "firebase/auth";
import {
  DashboardServiceError,
  firestore,
  toServiceError,
} from "@/lib/dashboard/service";
import { db } from "@/lib/firebase";
import {
  DEFAULT_REMINDER_PREFERENCES,
  type ReminderPreferences,
} from "@/lib/reminders/types";
import {
  DATE_FORMATS,
  DEFAULT_FOLLOW_UP_SETTINGS,
  DEFAULT_PREFERENCES,
  DEFAULT_PROFILE,
  REPORTING_PERIODS,
  WEEK_STARTS,
  defaultSources,
  isValidHttpUrl,
  isValidTime,
  isValidTimeZone,
  normalizeSourceId,
  type FollowUpSettings,
  type WorkspacePreferences,
  type WorkspaceProfile,
  type WorkspaceSettings,
  type WorkspaceSource,
} from "@/lib/settings/types";

export type SettingsInput = {
  businessName: string;
  profile: WorkspaceProfile;
  preferences: WorkspacePreferences;
  sources: WorkspaceSource[];
  followUpSettings: FollowUpSettings;
};

function requireUid(uid: string) {
  if (!uid) throw new DashboardServiceError("Sign in to manage settings.", "settings/unauthenticated");
}

function asText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asDate(value: unknown): Date | null {
  return value && typeof (value as { toDate?: unknown }).toDate === "function"
    ? ((value as { toDate: () => Date }).toDate())
    : null;
}

function toWorkspaceSource(value: unknown, fallback: WorkspaceSource): WorkspaceSource {
  const data = (value ?? {}) as Record<string, unknown>;
  return {
    id: asText(data.id, fallback.id),
    label: asText(data.label, fallback.label),
    active: typeof data.active === "boolean" ? data.active : fallback.active,
    system: fallback.system,
  };
}

function normalizeSources(raw: unknown): WorkspaceSource[] {
  const canonical = defaultSources();
  const byId = new Map(canonical.map((item) => [item.id, item]));
  const stored = Array.isArray(raw) ? raw : [];
  const result = new Map<string, WorkspaceSource>();

  for (const source of canonical) result.set(source.id, source);
  stored.forEach((value, index) => {
    const fallback = canonical[index] ?? {
      id: `source_${index}`,
      label: `Source ${index + 1}`,
      active: true,
      system: false,
    };
    const item = toWorkspaceSource(value, fallback);
    const id = normalizeSourceId(item.id) || fallback.id;
    if (byId.has(id)) {
      // System source: label stays canonical, active state is preserved.
      result.set(id, { ...byId.get(id) as WorkspaceSource, active: item.active });
    } else if (!result.has(id)) {
      result.set(id, { id, label: item.label.slice(0, 40) || id, active: item.active, system: false });
    }
  });
  return [...result.values()];
}

function parseReminderPreferences(value: unknown): ReminderPreferences {
  const raw = (value ?? {}) as Record<string, unknown>;
  return {
    remindersEnabled:
      typeof raw.remindersEnabled === "boolean"
        ? raw.remindersEnabled
        : DEFAULT_REMINDER_PREFERENCES.remindersEnabled,
    upcomingLeadMinutes:
      typeof raw.upcomingLeadMinutes === "number" &&
      raw.upcomingLeadMinutes >= 1 &&
      raw.upcomingLeadMinutes <= 1440
        ? raw.upcomingLeadMinutes
        : DEFAULT_REMINDER_PREFERENCES.upcomingLeadMinutes,
    dueRemindersEnabled:
      typeof raw.dueRemindersEnabled === "boolean"
        ? raw.dueRemindersEnabled
        : DEFAULT_REMINDER_PREFERENCES.dueRemindersEnabled,
    overdueFrequencyHours:
      typeof raw.overdueFrequencyHours === "number" &&
      raw.overdueFrequencyHours >= 1 &&
      raw.overdueFrequencyHours <= 168
        ? raw.overdueFrequencyHours
        : DEFAULT_REMINDER_PREFERENCES.overdueFrequencyHours,
    deliveryChannel: "in_app",
  };
}

/** Repairs legacy accounts that have Auth identity but missing workspace docs. */
export async function ensureWorkspaceForUser(user: User): Promise<void> {
  if (!db) return;
  const workspaceRef = doc(db, "workspaces", user.uid);
  const userRef = doc(db, "users", user.uid);
  try {
    const [workspace, profile] = await Promise.all([
      getDoc(workspaceRef),
      getDoc(userRef),
    ]);
    const displayName = user.displayName?.trim() || user.email?.split("@")[0] || "Member";
    const email = user.email ?? "";

    if (!workspace.exists()) {
      await setDoc(workspaceRef, {
        businessName: `${displayName}'s workspace`.slice(0, 150),
        ownerUid: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    if (!profile.exists() && email) {
      await setDoc(userRef, {
        displayName,
        email,
        workspaceId: user.uid,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    throw toServiceError(error);
  }
}

/** Older workspaces simply receive defaults — no destructive migration. */
export async function getWorkspaceSettings(uid: string): Promise<WorkspaceSettings> {
  requireUid(uid);
  try {
    const snapshot = await getDoc(doc(firestore(), "workspaces", uid));
    if (!snapshot.exists()) {
      // Bootstrap handles this; returning defaults keeps settings readable.
      return {
        businessName: "My Business",
        ownerUid: uid,
        createdAt: null,
        updatedAt: null,
        profile: DEFAULT_PROFILE,
        preferences: {
          ...DEFAULT_PREFERENCES,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        },
        inquirySettings: {
          sources: defaultSources(),
          sourceIds: defaultSources().map((item) => item.id),
          activeSourceIds: defaultSources().map((item) => item.id),
        },
        followUpSettings: DEFAULT_FOLLOW_UP_SETTINGS,
      };
    }
    const data = snapshot.data() as Record<string, unknown>;
    const profileRaw = (data.profile ?? {}) as Record<string, unknown>;
    const preferencesRaw = (data.preferences ?? {}) as Record<string, unknown>;
    const followUpRaw = (data.followUpSettings ?? {}) as Record<string, unknown>;
    const sources = normalizeSources((data.inquirySettings as Record<string, unknown> | undefined)?.sources);

    return {
      businessName: asText(data.businessName, "My Business"),
      ownerUid: asText(data.ownerUid, uid),
      createdAt: asDate(data.createdAt),
      updatedAt: asDate(data.updatedAt),
      profile: {
        description: asText(profileRaw.description, DEFAULT_PROFILE.description),
        industry: asText(profileRaw.industry, DEFAULT_PROFILE.industry),
        email: asText(profileRaw.email, DEFAULT_PROFILE.email),
        phone: asText(profileRaw.phone, DEFAULT_PROFILE.phone),
        website: asText(profileRaw.website, DEFAULT_PROFILE.website),
        country: asText(profileRaw.country, DEFAULT_PROFILE.country),
        city: asText(profileRaw.city, DEFAULT_PROFILE.city),
        logoUrl: asText(profileRaw.logoUrl, DEFAULT_PROFILE.logoUrl),
      },
      preferences: {
        timezone: isValidTimeZone(asText(preferencesRaw.timezone))
          ? asText(preferencesRaw.timezone)
          : Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        dateFormat: (DATE_FORMATS as readonly string[]).includes(asText(preferencesRaw.dateFormat))
          ? (preferencesRaw.dateFormat as WorkspacePreferences["dateFormat"])
          : DEFAULT_PREFERENCES.dateFormat,
        weekStartsOn: (WEEK_STARTS as readonly number[]).includes(Number(preferencesRaw.weekStartsOn))
          ? (Number(preferencesRaw.weekStartsOn) as WorkspacePreferences["weekStartsOn"])
          : DEFAULT_PREFERENCES.weekStartsOn,
        defaultReportingPeriod: (REPORTING_PERIODS as readonly string[]).includes(
          asText(preferencesRaw.defaultReportingPeriod)
        )
          ? (preferencesRaw.defaultReportingPeriod as WorkspacePreferences["defaultReportingPeriod"])
          : DEFAULT_PREFERENCES.defaultReportingPeriod,
      },
      inquirySettings: {
        sources,
        sourceIds: sources.map((item) => item.id),
        activeSourceIds: sources.filter((item) => item.active).map((item) => item.id),
      },
      followUpSettings: {
        defaultIntervalDays:
          typeof followUpRaw.defaultIntervalDays === "number" &&
          followUpRaw.defaultIntervalDays >= 1 &&
          followUpRaw.defaultIntervalDays <= 90
            ? followUpRaw.defaultIntervalDays
            : DEFAULT_FOLLOW_UP_SETTINGS.defaultIntervalDays,
        workingDays: Array.isArray(followUpRaw.workingDays)
          ? followUpRaw.workingDays.filter((day): day is number => typeof day === "number" && day >= 0 && day <= 6)
          : DEFAULT_FOLLOW_UP_SETTINGS.workingDays,
        startTime: isValidTime(asText(followUpRaw.startTime))
          ? asText(followUpRaw.startTime)
          : DEFAULT_FOLLOW_UP_SETTINGS.startTime,
        endTime: isValidTime(asText(followUpRaw.endTime))
          ? asText(followUpRaw.endTime)
          : DEFAULT_FOLLOW_UP_SETTINGS.endTime,
        defaultTime: isValidTime(asText(followUpRaw.defaultTime))
          ? asText(followUpRaw.defaultTime)
          : DEFAULT_FOLLOW_UP_SETTINGS.defaultTime,
        reminders: parseReminderPreferences(followUpRaw.reminders),
      },
    };
  } catch (error) {
    throw toServiceError(error);
  }
}

function validate(input: SettingsInput): WorkspaceSource[] {
  if (!input.businessName.trim() || input.businessName.trim().length > 150) {
    throw new DashboardServiceError("Enter a business name (up to 150 characters).");
  }
  if (!isValidTimeZone(input.preferences.timezone)) {
    throw new DashboardServiceError("Choose a valid IANA timezone.");
  }
  if (!isValidHttpUrl(input.profile.logoUrl)) {
    throw new DashboardServiceError("Logo URL must be a valid http(s) URL.");
  }
  if (input.sources.length > 50) {
    throw new DashboardServiceError("A workspace can have at most 50 sources.");
  }
  const seen = new Set<string>();
  const sources: WorkspaceSource[] = [];
  for (const source of input.sources) {
    const label = source.label.trim();
    if (!label || label.length > 40) {
      throw new DashboardServiceError("Source names must be 1–40 characters.");
    }
    const id = normalizeSourceId(source.id);
    if (!id) throw new DashboardServiceError(`Invalid source id: ${label}.`);
    if (seen.has(id)) throw new DashboardServiceError(`Duplicate source: ${label}.`);
    seen.add(id);
    sources.push({ id, label, active: source.active, system: source.system });
  }
  for (const canonical of defaultSources()) {
    if (!seen.has(canonical.id)) {
      sources.push(canonical);
    }
  }
  const days = input.followUpSettings.workingDays;
  if (days.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
    throw new DashboardServiceError("Choose valid working days.");
  }
  if (
    !isValidTime(input.followUpSettings.startTime) ||
    !isValidTime(input.followUpSettings.endTime) ||
    !isValidTime(input.followUpSettings.defaultTime)
  ) {
    throw new DashboardServiceError("Enter valid times.");
  }
  if (input.followUpSettings.endTime <= input.followUpSettings.startTime) {
    throw new DashboardServiceError("End time must be after start time.");
  }
  if (
    input.followUpSettings.defaultIntervalDays < 1 ||
    input.followUpSettings.defaultIntervalDays > 90
  ) {
    throw new DashboardServiceError("Default follow-up interval must be 1–90 days.");
  }
  const reminders = input.followUpSettings.reminders;
  if (reminders.upcomingLeadMinutes < 1 || reminders.upcomingLeadMinutes > 1440) {
    throw new DashboardServiceError("Upcoming reminder lead time must be 1–1440 minutes.");
  }
  if (reminders.overdueFrequencyHours < 1 || reminders.overdueFrequencyHours > 168) {
    throw new DashboardServiceError("Overdue reminder frequency must be 1–168 hours.");
  }
  return sources;
}

/** Partial update — unrelated workspace fields are never overwritten. */
export function toSettingsInput(settings: WorkspaceSettings): SettingsInput {
  return {
    businessName: settings.businessName,
    profile: settings.profile,
    preferences: settings.preferences,
    sources: settings.inquirySettings.sources,
    followUpSettings: settings.followUpSettings,
  };
}

export async function saveWorkspaceSettings(uid: string, input: SettingsInput): Promise<void> {
  requireUid(uid);
  const sources = validate(input);
  try {
    await updateDoc(doc(firestore(), "workspaces", uid), {
      businessName: input.businessName.trim(),
      profile: input.profile,
      preferences: input.preferences,
      inquirySettings: {
        sources,
        sourceIds: sources.map((item) => item.id),
        activeSourceIds: sources.filter((item) => item.active).map((item) => item.id),
      },
      followUpSettings: input.followUpSettings,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw toServiceError(error);
  }
}

/** Updates Firebase Auth display name and the owner's own profile document. */
export async function updateAccountDisplayName(user: User, displayName: string): Promise<void> {
  const name = displayName.trim();
  if (name.length < 2 || name.length > 100) {
    throw new DashboardServiceError("Enter a display name between 2 and 100 characters.");
  }
  if (!db) throw new DashboardServiceError("Firestore is not configured.", "settings/unconfigured");
  try {
    await updateProfile(user, { displayName: name });
    await updateDoc(doc(db, "users", user.uid), { displayName: name });
  } catch (error) {
    throw toAuthAwareError(error, "Could not update display name. Please sign in again and retry.");
  }
}

function toAuthAwareError(error: unknown, fallback: string): Error {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  if (code === "auth/requires-recent-login") {
    return new Error("For security, sign in again before changing account details.");
  }
  return error instanceof Error ? error : new Error(fallback);
}
