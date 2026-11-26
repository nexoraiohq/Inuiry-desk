import { Card } from "@/components/ui/card";

function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-skeleton ${className}`} />;
}

export function FollowUpsSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6" role="status" aria-label="Loading follow-ups">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <Card key={key} className="bg-canvas/80 p-4 shadow-card sm:p-5">
            <Bar className="h-3 w-24" />
            <Bar className="mt-4 h-[30px] w-16" />
            <Bar className="mt-2 h-2.5 w-20" />
          </Card>
        ))}
      </div>
      <Card className="bg-canvas/80 p-4 shadow-card sm:p-5">
        <Bar className="h-10 w-full" />
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((key) => <Bar key={key} className="h-10 w-full" />)}
        </div>
      </Card>
      <Card className="overflow-hidden bg-canvas/80 shadow-card">
        <div className="space-y-3 p-4 sm:p-5">
          {[0, 1, 2, 3, 4].map((key) => (
            <div key={key} className="flex items-center gap-3">
              <Bar className="size-8 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-2">
                <Bar className="h-3 w-40 max-w-full" />
                <Bar className="h-2.5 w-56 max-w-full" />
              </div>
              <Bar className="hidden h-3 w-20 sm:block" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
