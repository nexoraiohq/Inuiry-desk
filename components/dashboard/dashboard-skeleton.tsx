import { Card } from "@/components/ui/card";

function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-skeleton ${className}`} />;
}

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-line px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Bar className="h-4 w-32" />
          <Bar className="h-3 w-56 max-w-full" />
        </div>
        <Bar className="h-3 w-12" />
      </div>
      <ul className="divide-y divide-line">
        {Array.from({ length: rows }, (_, index) => (
          <li key={index} className="flex items-center gap-3 px-5 py-3.5">
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

/** Mirrors the new dashboard layout while Firestore data is loading. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-label="Loading overview">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5" aria-hidden="true">
        <div className="space-y-3">
          <Bar className="h-3 w-32" />
          <Bar className="h-7 w-40" />
        </div>
        <Bar className="h-10 w-36" />
      </div>

      <Card className="overflow-hidden" aria-hidden="true">
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 xl:divide-x xl:divide-line">
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className="border-b border-line px-5 py-5 last:border-b-0 xl:border-b-0">
              <Bar className="h-3 w-24" />
              <Bar className="mt-3 h-7 w-14" />
              <Bar className="mt-2 h-2.5 w-20" />
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]" aria-hidden="true">
        <ListSkeleton rows={5} />
        <ListSkeleton rows={5} />
      </div>

      <ListSkeleton rows={4} />
    </div>
  );
}
