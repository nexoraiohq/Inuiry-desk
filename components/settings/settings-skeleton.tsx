import { Card } from "@/components/ui/card";

function Block({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-skeleton ${className}`} />;
}

export function SettingsSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6" role="status" aria-label="Loading settings">
      <Card className="bg-surface p-4 shadow-card sm:p-5">
        <Block className="h-9 w-full max-w-xl" />
      </Card>
      <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
        <Card className="bg-surface p-3 shadow-card">
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((key) => <Block key={key} className="h-9 w-full" />)}
          </div>
        </Card>
        <Card className="bg-surface p-5 shadow-card">
          <Block className="h-4 w-40" />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3].map((key) => <Block key={key} className="h-10 w-full" />)}
          </div>
        </Card>
      </div>
    </div>
  );
}
