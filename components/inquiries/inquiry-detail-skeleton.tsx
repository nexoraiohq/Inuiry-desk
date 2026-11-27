import { Card } from "@/components/ui/card";

function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-skeleton ${className}`} />;
}

export function InquiryDetailSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6" role="status" aria-label="Loading inquiry">
      <div className="space-y-2">
        <Bar className="h-7 w-48 max-w-full" />
        <Bar className="h-3 w-64 max-w-full" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="bg-surface p-5 shadow-card lg:col-span-2">
          <Bar className="h-4 w-32" />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3, 4, 5].map((key) => (
              <div key={key} className="space-y-2">
                <Bar className="h-2.5 w-20" />
                <Bar className="h-3 w-36 max-w-full" />
              </div>
            ))}
          </div>
        </Card>
        <Card className="bg-surface p-5 shadow-card">
          <Bar className="h-4 w-28" />
          <Bar className="mt-5 h-10 w-full" />
        </Card>
      </div>
      <Card className="bg-surface p-5 shadow-card">
        <Bar className="h-4 w-28" />
        <div className="mt-5 space-y-4">
          {[0, 1, 2].map((key) => (
            <div key={key} className="flex items-start gap-3">
              <Bar className="size-8 shrink-0 rounded-lg" />
              <Bar className="h-3 w-64 max-w-full" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
