"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Download, RefreshCw } from "lucide-react";
import { DashboardError } from "@/components/dashboard/dashboard-error";
import { useWorkspaceSettings } from "@/components/settings/workspace-settings-provider";
import { BarList, TrendBars } from "@/components/reports/charts";
import { ReportsSkeleton } from "@/components/reports/reports-skeleton";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { buildReportCsv, downloadCsv } from "@/lib/reports/csv";
import {
  formatShort,
  resolveDateRange,
  type DateRange,
  type RangePreset,
} from "@/lib/reports/date-range";
import { getReportData } from "@/lib/reports/service";
import type { ReportData } from "@/lib/reports/types";

const PRESETS: { value: RangePreset; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "thisMonth", label: "This month" },
  { value: "all", label: "All time" },
  { value: "previousMonth", label: "Previous month" },
  { value: "custom", label: "Custom range" },
];

function todayInput(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function Metric({ label, value, hint }: { label: string; value: number | string | null; hint: string }) {
  return (
    <Card className="bg-canvas/80 p-4 shadow-card sm:p-5">
      <p className="truncate text-[12px] font-medium text-muted sm:text-[13px]">{label}</p>
      <p className="mt-3 font-display text-[26px] leading-none font-semibold tracking-[-0.03em] text-ink tabular-nums sm:text-[30px]">
        {value === null ? "N/A" : value}
      </p>
      <p className="mt-2 text-[10px] text-subtle sm:text-[11px]">{hint}</p>
    </Card>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Card className="bg-canvas/80 p-4 shadow-card sm:p-5">
      <h2 className="font-display text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
      <p className="mt-1 text-[12px] leading-relaxed text-muted sm:text-[13px]">{description}</p>
      <div className="mt-5">{children}</div>
    </Card>
  );
}

export function ReportsView({ uid }: { uid: string }) {
  const { settings } = useWorkspaceSettings();
  const [preset, setPreset] = useState<RangePreset>("30d");
  const [customStart, setCustomStart] = useState(todayInput());
  const [customEnd, setCustomEnd] = useState(todayInput());
  const [range, setRange] = useState<DateRange | null>(() => resolveDateRange("30d", "", ""));
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rangeError, setRangeError] = useState<string | null>(null);

  useEffect(() => {
    if (!settings) return;
    const timer = window.setTimeout(() => {
      const preferred = settings.preferences.defaultReportingPeriod;
      setPreset(preferred);
      setLoading(true);
      setRange(resolveDateRange(preferred, "", ""));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [settings]);

  const load = useCallback(
    async (activeRange: DateRange) => getReportData(uid, activeRange),
    [uid]
  );

  const refresh = useCallback(() => {
    if (!range) return;
    setLoading(true);
    void load(range)
      .then((result) => { setData(result); setError(null); })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "Could not load reports.");
      })
      .finally(() => setLoading(false));
  }, [load, range]);

  useEffect(() => {
    if (!range) return;
    let active = true;
    void load(range)
      .then((result) => { if (active) { setData(result); setError(null); } })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "Could not load reports.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [range, load]);

  function applyRange(next: RangePreset) {
    setPreset(next);
    setRangeError(null);
    if (next === "custom") return;
    setLoading(true);
    setRange(resolveDateRange(next, "", ""));
  }

  function applyCustom() {
    const resolved = resolveDateRange("custom", customStart, customEnd);
    if (!resolved) {
      setRangeError("Choose a valid start and end date (start must not be after end).");
      return;
    }
    setRangeError(null);
    setLoading(true);
    setRange(resolved);
  }

  function exportCsv() {
    if (!data) return;
    const rows: Array<Array<string | number | null>> = [
      ["Inquiry Desk report"],
      ["Date range", data.range.label],
      ["Generated", data.generatedAt.toISOString()],
      [],
      ["Section", "Metric", "Value"],
      ["Business performance", "Total inquiries", data.inquiries.total],
      ["Business performance", "New inquiries", data.inquiries.newCount],
      ["Business performance", "Converted inquiries", data.inquiries.converted],
      ["Business performance", "Lost inquiries", data.inquiries.lost],
      ["Business performance", "Cohort conversion rate (%)", data.inquiries.cohortConversionRate],
      ["Business performance", "Archived inquiries excluded", data.inquiries.archivedExcluded],
      ...data.inquiries.statusDistribution.map((item) => ["Status distribution", item.name, item.value]),
      ...data.inquiries.transitions.map((item) => ["Status transitions", `${item.from} to ${item.to}`, item.count]),
      ...data.acquisition.rateBySource.map((item) => ["Acquisition", item.name, `${item.converted}/${item.total} (${item.rate ?? "N/A"}%)`]),
      ["Follow-ups", "Created", data.followUps.created],
      ["Follow-ups", "Completed", data.followUps.completed],
      ["Follow-ups", "Pending", data.followUps.pending],
      ["Follow-ups", "Overdue", data.followUps.overdue],
      ["Follow-ups", "Cancelled", data.followUps.cancelled],
      ["Follow-ups", "Completion rate (%)", data.followUps.completionRate],
      ["Communications", "Total interactions", data.communications.total],
      ...data.communications.byChannel.map((item) => ["Communications by channel", item.name, item.value]),
      ...data.communications.byDirection.map((item) => ["Communications by direction", item.name, item.value]),
      ...data.activities.byType.map((item) => ["Activity by type", item.name, item.value]),
    ];
    downloadCsv(`inquiry-desk-report-${data.range.key}.csv`, buildReportCsv(rows));
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader title="Reports" description="Business performance from your workspace records.">
        <div className="flex items-center gap-2">
          <button type="button" onClick={refresh} disabled={loading} className={buttonClasses("secondary", "md", "h-9")}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" /> Refresh
          </button>
          <button type="button" onClick={exportCsv} disabled={!data} className={buttonClasses("secondary", "md", "h-9")}>
            <Download className="size-4" aria-hidden="true" /> Export CSV
          </button>
        </div>
      </PageHeader>

      <Card className="bg-canvas/80 p-4 shadow-card sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select aria-label="Report date range" value={preset} onChange={(e) => applyRange(e.target.value as RangePreset)}>
            {PRESETS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          {preset === "custom" ? (
            <>
              <div>
                <label htmlFor="report-start" className="text-[11px] font-medium text-subtle">Start date</label>
                <Input id="report-start" type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <label htmlFor="report-end" className="text-[11px] font-medium text-subtle">End date</label>
                <Input id="report-end" type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="mt-1.5" />
              </div>
              <button type="button" onClick={applyCustom} className={buttonClasses("primary", "md", "h-10 sm:self-end")}>Apply range</button>
            </>
          ) : null}
        </div>
        {rangeError ? <p className="mt-2 text-[12px] font-medium text-danger" role="alert">{rangeError}</p> : null}
        {range ? (
          <p className="mt-3 text-[12px] text-muted">
            {formatShort(range.start)} – {formatShort(new Date(range.end.getTime() - 1))} (local time)
          </p>
        ) : null}
      </Card>

      {error ? <Notice tone="danger" message={error} onDismiss={() => setError(null)} /> : null}

      {loading || !range ? (
        <ReportsSkeleton />
      ) : error && !data ? (
        <DashboardError title="We couldn't load reports" message={error} onRetry={() => range && void load(range)} />
      ) : !data ? null : (
        <>
          {data.truncated ? (
            <Notice tone="danger" message="Some collections exceeded the bounded read limit; figures reflect the most recent 500 records per collection." />
          ) : null}

          <section aria-label="Business performance" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Total inquiries" value={data.inquiries.total} hint="active inquiries created in range" />
            <Metric label="New inquiries" value={data.inquiries.newCount} hint="current status: new" />
            <Metric label="Converted inquiries" value={data.inquiries.converted} hint="current status: converted" />
            <Metric label="Lost inquiries" value={data.inquiries.lost} hint="current status: lost" />
            <Metric
              label="Cohort conversion rate"
              value={data.inquiries.cohortConversionRate === null ? null : `${data.inquiries.cohortConversionRate}%`}
              hint="converted ÷ all inquiries created in range"
            />
            <Metric label="Archived excluded" value={data.inquiries.archivedExcluded} hint="not counted as active" />
            <Metric label="Inquiries created" value={data.inquiries.total} hint="see trend below" />
            <Metric label="Status types" value={data.inquiries.statusDistribution.length} hint="current status distribution" />
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="Inquiry creation trend" description="Inquiries created per local day in the selected range.">
              <TrendBars points={data.inquiries.trend} />
            </Section>
            <Section title="Current status distribution" description="Current status of inquiries created in the range — not a historical funnel.">
              <BarList values={data.inquiries.statusDistribution} />
            </Section>
            <Section title="Converted vs lost" description="Current status only. Historical conversion dates are not stored in a structured form.">
              <BarList values={data.inquiries.convertedVsLost} />
              <p className="mt-4 text-[11px] leading-relaxed text-subtle">
                Status transitions below come from activity descriptions. The model does not store structured conversion dates, so no historical conversion trend is shown.
              </p>
            </Section>
            <Section title="Status transitions" description="Recorded status changes in the selected range, based on activity events.">
              {data.inquiries.transitions.length === 0 ? (
                <p className="text-[12px] text-subtle">No status changes recorded in this range.</p>
              ) : (
                <BarList values={data.inquiries.transitions.map((item) => ({ name: item.from + " to " + item.to, value: item.count }))} />
              )}
            </Section>
          </div>

          <Section title="Customer acquisition" description="Based on the inquiry source field. Unknown or missing sources are grouped separately without altering records.">
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="text-[12px] font-semibold text-ink">Inquiries by source</h3>
                <div className="mt-3"><BarList values={data.acquisition.bySource} /></div>
              </div>
              <div>
                <h3 className="text-[12px] font-semibold text-ink">Conversion rate by source</h3>
                <div className="mt-3 space-y-2">
                  {data.acquisition.rateBySource.length === 0 ? (
                    <p className="text-[12px] text-subtle">No source data in this range.</p>
                  ) : (
                    data.acquisition.rateBySource.map((item) => (
                      <div key={item.name} className="flex items-center justify-between gap-3 text-[12px]">
                        <span className="truncate text-muted">{item.name.replaceAll("_", " ")}</span>
                        <span className="shrink-0 font-semibold tabular-nums text-ink">
                          {item.rate === null ? "N/A" : `${item.rate}%`} <span className="font-normal text-subtle">({item.converted}/{item.total})</span>
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <p className="mt-4 text-[12px] text-muted">
              Best-performing source: <span className="font-semibold text-ink">{data.acquisition.bestSource ?? "N/A"}</span>
              {data.acquisition.unknownCount > 0 ? ` · ${data.acquisition.unknownCount} unknown source(s)` : ""}
            </p>
          </Section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="Follow-up effectiveness" description="Completion rate = follow-ups created in range and completed in range ÷ follow-ups created in range.">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Metric label="Created" value={data.followUps.created} hint="in range" />
                <Metric label="Completed" value={data.followUps.completed} hint="in range" />
                <Metric label="Completion rate" value={data.followUps.completionRate === null ? null : `${data.followUps.completionRate}%`} hint="defined above" />
                <Metric label="Pending" value={data.followUps.pending} hint="current status" />
                <Metric label="Overdue" value={data.followUps.overdue} hint="pending past due" />
                <Metric label="Cancelled" value={data.followUps.cancelled} hint="in range" />
              </div>
            </Section>
            <Section title="Follow-up trend" description="Follow-ups created per local day.">
              <TrendBars points={data.followUps.trend} />
            </Section>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="Communication analytics" description="Manually recorded interactions only — no automatic message or call detection.">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Metric label="Interactions" value={data.communications.total} hint="recorded in range" />
                <Metric label="Incoming" value={data.communications.byDirection.find((item) => item.name === "incoming")?.value ?? 0} hint="recorded" />
                <Metric label="Outgoing" value={data.communications.byDirection.find((item) => item.name === "outgoing")?.value ?? 0} hint="recorded" />
              </div>
              <div className="mt-5"><BarList values={data.communications.byChannel} /></div>
            </Section>
            <Section title="Communication trend" description="Recorded interactions by local day.">
              <TrendBars points={data.communications.trend} />
            </Section>
          </div>

          <Section title="Outcomes by channel" description="Outcomes are the values explicitly recorded by workspace members.">
            {data.communications.outcomesByChannel.length === 0 ? (
              <p className="text-[12px] text-subtle">No recorded interactions in this range.</p>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {data.communications.outcomesByChannel.map((item) => (
                  <div key={item.channel}>
                    <h3 className="text-[12px] font-semibold text-ink">{item.channel.replaceAll("_", " ")}</h3>
                    <div className="mt-2"><BarList values={item.outcomes} /></div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="Activity trends" description="System activity events, kept separate from recorded customer communications.">
              <BarList values={data.activities.byType} />
            </Section>
            <Section title="Activity volume" description="Activity events per local day.">
              <TrendBars points={data.activities.trend} />
            </Section>
          </div>
        </>
      )}
    </div>
  );
}
