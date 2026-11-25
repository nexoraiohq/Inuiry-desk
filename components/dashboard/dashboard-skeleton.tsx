import { Card } from "@/components/ui/card";

function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-skeleton ${className}`} />;
}

function MetricSkeleton() {
  return (
    <Card className="bg-canvas/80 p-4 shadow-card sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <Bar className="h-3 w-24" />
        <div className="size-8 shrink-0 animate-pulse rounded-xl bg-skeleton sm:size-9" />
      </div>
      <Bar className="mt-4 h-[26px] w-16 sm:h-[30px]" />
      <Bar className="mt-2 h-2.5 w-20" />
    </Card>
  );
}

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <Card className="overflow-hidden bg-canvas/80 shadow-card">
      <div className="flex flex-col gap-2 border-b border-line px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:px-5 sm:py-4">
        <div className="space-y-2">
          <Bar className="h-4 w-32" />
          <Bar className="h-3 w-56 max-w-full" />
        </div>
        <Bar className="h-2.5 w-14" />
      </div>
      <ul className="divide-y divide-line/70">
        {Array.from({ length: rows }, (_, index) => (
          <li key={index} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
            <div className="size-7 shrink-0 animate-pulse rounded-lg bg-skeleton" />
            <div className="min-w-0 flex-1 space-y-2">
              <Bar className="h-3 w-32 max-w-full" />
              <Bar className="h-2.5 w-48 max-w-full" />
            </div>
            <Bar className="hidden h-2.5 w-12 sm:block" />
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Mirrors the exact dashboard layout while Firestore data is loading. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6" role="status" aria-label="Loading overview">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Bar className="h-7 w-32" />
          <Bar className="h-3 w-72 max-w-full" />
          <Bar className="h-2.5 w-44" />
        </div>
        <Bar className="h-9 w-28" />
      </div>

      <section aria-hidden="true" className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <MetricSkeleton key={key} />
        ))}
      </section>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ListSkeleton rows={5} />
        </div>
        <ListSkeleton rows={5} />
      </div>

      <ListSkeleton rows={4} />
    </div>
  );
}
