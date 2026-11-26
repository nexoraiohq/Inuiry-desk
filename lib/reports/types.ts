import type { DateRange } from "@/lib/reports/date-range";

export type TrendPoint = { key: string; label: string; value: number };
export type NamedValue = { name: string; value: number };

export type ReportData = {
  range: DateRange;
  generatedAt: Date;
  /** True when a bounded read stopped before all records were loaded. */
  truncated: boolean;
  inquiries: {
    total: number;
    newCount: number;
    converted: number;
    lost: number;
    archivedExcluded: number;
    cohortConversionRate: number | null;
    statusDistribution: NamedValue[];
    convertedVsLost: NamedValue[];
    trend: TrendPoint[];
    transitions: { from: string; to: string; count: number }[];
  };
  acquisition: {
    bySource: NamedValue[];
    convertedBySource: NamedValue[];
    rateBySource: { name: string; total: number; converted: number; rate: number | null }[];
    bestSource: string | null;
    unknownCount: number;
  };
  followUps: {
    created: number;
    completed: number;
    pending: number;
    overdue: number;
    cancelled: number;
    completionRate: number | null;
    trend: TrendPoint[];
  };
  communications: {
    total: number;
    byChannel: NamedValue[];
    byDirection: NamedValue[];
    outcomesByChannel: { channel: string; outcomes: NamedValue[] }[];
    trend: TrendPoint[];
  };
  activities: {
    total: number;
    byType: NamedValue[];
    trend: TrendPoint[];
  };
};
