import { Card } from "@/components/ui/card";

function Block({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-skeleton ${className}`} />;
}

export function ReportsSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6" role="status" aria-label="Loading reports">
      <Card className="bg-surface p-4 shadow-card sm:p-5">
        <Block className="h-10 w-full max-w-xl" />
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <Card key={key} className="bg-surface p-4 shadow-card sm:p-5">
            <Block className="h-3 w-24" />
            <Block className="mt-4 h-7 w-16" />
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1, 2, 3].map((key) => (
          <Card key={key} className="bg-surface p-5 shadow-card">
            <Block className="h-4 w-36" />
            <Block className="mt-5 h-32 w-full" />
          </Card>
        ))}
      </div>
    </div>
  );
}
