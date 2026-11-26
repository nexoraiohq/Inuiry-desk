import {
  collection,
  getDocs,
  limit,
  query,
  Timestamp,
  where,
  type DocumentSnapshot,
} from "firebase/firestore";
import {
  DashboardServiceError,
  firestore,
  parseActivity,
  parseFollowUp,
  parseInquiry,
  toServiceError,
} from "@/lib/dashboard/service";
import {
  ACTIVITY_TYPES,
  COMMUNICATION_CHANNELS,
  COMMUNICATION_DIRECTIONS,
  INQUIRY_STATUSES,
  INQUIRY_SOURCES,
  type ActivityRecord,
  type CommunicationRecord,
  type FollowUpRecord,
} from "@/lib/dashboard/types";
import { parseCommunication } from "@/lib/communications/service";
import { dayKey, eachDay, type DateRange } from "@/lib/reports/date-range";
import type { NamedValue, ReportData, TrendPoint } from "@/lib/reports/types";

const REPORT_LIMIT = 500;

function requireUid(uid: string) {
  if (!uid) {
    throw new DashboardServiceError("Sign in to view reports.", "reports/unauthenticated");
  }
}

async function fetchWindow(
  uid: string,
  collectionName: string,
  field: string,
  range: DateRange
) {
  const reference = collection(firestore(), "workspaces", uid, collectionName);
  return getDocs(
    query(
      reference,
      where(field, ">=", Timestamp.fromDate(range.start)),
      where(field, "<", Timestamp.fromDate(range.end)),
      limit(REPORT_LIMIT)
    )
  );
}

function trend(counts: Map<string, number>, range: DateRange): TrendPoint[] {
  return eachDay(range).map((date) => {
    const key = dayKey(date);
    return {
      key,
      label: new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date),
      value: counts.get(key) ?? 0,
    };
  });
}

function bump(counts: Map<string, number>, key: string) {
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

function named(counts: Map<string, number>, order?: readonly string[]): NamedValue[] {
  const keys = order ? [...order, ...[...counts.keys()].filter((key) => !order.includes(key))] : [...counts.keys()];
  return keys
    .filter((key) => counts.has(key))
    .map((key) => ({ name: key, value: counts.get(key) ?? 0 }));
}

function normalizeSource(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) return "unknown";
  const normalized = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return (INQUIRY_SOURCES as readonly string[]).includes(normalized) ? normalized : "unknown";
}

function rate(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : Math.round((numerator / denominator) * 1000) / 10;
}

/** All figures come from the authenticated workspace's existing collections. */
export async function getReportData(
  uid: string,
  range: DateRange,
  now: Date = new Date()
): Promise<ReportData> {
  requireUid(uid);

  try {
    const [inquirySnap, followUpSnap, communicationSnap, activitySnap] = await Promise.all([
      fetchWindow(uid, "inquiries", "createdAt", range),
      fetchWindow(uid, "followUps", "createdAt", range),
      fetchWindow(uid, "communications", "occurredAt", range),
      fetchWindow(uid, "activities", "createdAt", range),
    ]);

    const parse = <T>(snapshot: DocumentSnapshot, fn: (doc: DocumentSnapshot) => T) =>
      fn(snapshot as Parameters<typeof fn>[0]);

    const allInquiries = inquirySnap.docs.map((doc) => parse(doc, parseInquiry));
    const inquiries = allInquiries.filter((item) => !item.archived);
    const archivedExcluded = allInquiries.length - inquiries.length;

    const inquiryStatusCounts = new Map<string, number>();
    const inquiryTrendCounts = new Map<string, number>();
    const sourceCounts = new Map<string, number>();
    const convertedSourceCounts = new Map<string, number>();
    let unknownCount = 0;

    inquiries.forEach((item) => {
      bump(inquiryStatusCounts, item.status);
      bump(inquiryTrendCounts, dayKey(item.createdAt));
      const source = normalizeSource(item.source);
      if (source === "unknown" || !(INQUIRY_SOURCES as readonly string[]).includes(item.source)) {
        unknownCount += 1;
      }
      bump(sourceCounts, source);
      if (item.status === "converted") bump(convertedSourceCounts, source);
    });

    const converted = inquiryStatusCounts.get("converted") ?? 0;
    const lost = inquiryStatusCounts.get("lost") ?? 0;
    const newCount = inquiryStatusCounts.get("new") ?? 0;

    const transitionCounts = new Map<string, number>();
    const activityTypeCounts = new Map<string, number>();
    const activityTrendCounts = new Map<string, number>();
    const activities: ActivityRecord[] = activitySnap.docs.map((doc) => parse(doc, parseActivity));
    activities.forEach((item) => {
      bump(activityTypeCounts, item.type);
      bump(activityTrendCounts, dayKey(item.createdAt));
      if (item.type === "status_changed") {
        const match = /Status changed from (.+) to (.+)\./.exec(item.description);
        if (match) bump(transitionCounts, `${match[1]}→${match[2]}`);
      }
    });

    const followUps: FollowUpRecord[] = followUpSnap.docs.map((doc) => parse(doc, parseFollowUp));
    const followUpTrendCounts = new Map<string, number>();
    let completed = 0;
    let pending = 0;
    let overdue = 0;
    let cancelled = 0;
    followUps.forEach((item) => {
      bump(followUpTrendCounts, dayKey(item.createdAt));
      if (
        item.status === "completed" &&
        item.completedAt &&
        item.completedAt.getTime() >= range.start.getTime() &&
        item.completedAt.getTime() < range.end.getTime()
      ) {
        completed += 1;
      }
      if (item.status === "pending") {
        pending += 1;
        if (item.dueAt.getTime() < now.getTime()) overdue += 1;
      }
      if (item.status === "cancelled") cancelled += 1;
    });

    const communications: CommunicationRecord[] = communicationSnap.docs.map((doc) =>
      parse(doc, parseCommunication)
    );
    const channelCounts = new Map<string, number>();
    const directionCounts = new Map<string, number>();
    const outcomeCounts = new Map<string, Map<string, number>>();
    const communicationTrendCounts = new Map<string, number>();
    communications.forEach((item) => {
      bump(channelCounts, item.channel);
      bump(directionCounts, item.direction);
      bump(communicationTrendCounts, dayKey(item.occurredAt));
      if (!outcomeCounts.has(item.channel)) outcomeCounts.set(item.channel, new Map());
      bump(outcomeCounts.get(item.channel) as Map<string, number>, item.outcome);
    });

    const rateBySource = [...sourceCounts.entries()].map(([name, total]) => {
      const convertedForSource = convertedSourceCounts.get(name) ?? 0;
      return { name, total, converted: convertedForSource, rate: rate(convertedForSource, total) };
    });
    const bestSource = [...rateBySource]
      .filter((item) => item.total > 0 && item.rate !== null)
      .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0) || b.total - a.total)[0]?.name ?? null;

    const truncated =
      inquirySnap.size === REPORT_LIMIT ||
      followUpSnap.size === REPORT_LIMIT ||
      communicationSnap.size === REPORT_LIMIT ||
      activitySnap.size === REPORT_LIMIT;

    return {
      range,
      generatedAt: new Date(),
      truncated,
      inquiries: {
        total: inquiries.length,
        newCount,
        converted,
        lost,
        archivedExcluded,
        cohortConversionRate: rate(converted, inquiries.length),
        statusDistribution: named(inquiryStatusCounts, INQUIRY_STATUSES),
        convertedVsLost: [
          { name: "Converted", value: converted },
          { name: "Lost", value: lost },
        ],
        trend: trend(inquiryTrendCounts, range),
        transitions: [...transitionCounts.entries()]
          .map(([key, count]) => {
            const [from, to] = key.split("→");
            return { from, to, count };
          })
          .sort((a, b) => b.count - a.count),
      },
      acquisition: {
        bySource: named(sourceCounts),
        convertedBySource: named(convertedSourceCounts),
        rateBySource,
        bestSource,
        unknownCount,
      },
      followUps: {
        created: followUps.length,
        completed,
        pending,
        overdue,
        cancelled,
        completionRate: rate(completed, followUps.length),
        trend: trend(followUpTrendCounts, range),
      },
      communications: {
        total: communications.length,
        byChannel: named(channelCounts, COMMUNICATION_CHANNELS),
        byDirection: named(directionCounts, COMMUNICATION_DIRECTIONS),
        outcomesByChannel: [...outcomeCounts.entries()].map(([channel, counts]) => ({
          channel,
          outcomes: named(counts),
        })),
        trend: trend(communicationTrendCounts, range),
      },
      activities: {
        total: activities.length,
        byType: named(activityTypeCounts, ACTIVITY_TYPES),
        trend: trend(activityTrendCounts, range),
      },
    };
  } catch (error) {
    throw toServiceError(error);
  }
}
