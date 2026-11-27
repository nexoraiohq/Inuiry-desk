"use client";

import { usePathname } from "next/navigation";

function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-skeleton ${className}`} />;
}

function DarkBar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-sidebar-skeleton ${className}`} />;
}

function SidebarSkeleton() {
  return (
    <div className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col border-r border-white/5 bg-sidebar lg:flex">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/5 px-5">
        <DarkBar className="size-9 shrink-0 rounded-lg" />
        <DarkBar className="h-3 w-28" />
      </div>

      <div className="min-h-0 flex-1 px-3 py-6">
        <DarkBar className="mb-3 ml-3 h-2 w-20" />
        <div className="space-y-4">
          {[0, 1, 2].map((key) => (
            <div key={key} className="flex h-10 items-center gap-3 px-3">
              <DarkBar className="size-[18px] shrink-0 rounded" />
              <DarkBar className="h-2.5 w-24" />
            </div>
          ))}
        </div>

        <DarkBar className="mb-3 ml-3 mt-8 h-2 w-14" />
        <div className="flex h-10 items-center gap-3 px-3">
          <DarkBar className="size-[18px] shrink-0 rounded" />
          <DarkBar className="h-2.5 w-16" />
        </div>

        <DarkBar className="mb-3 ml-3 mt-8 h-2 w-14" />
        <div className="flex h-10 items-center gap-3 px-3">
          <DarkBar className="size-[18px] shrink-0 rounded" />
          <DarkBar className="h-2.5 w-16" />
        </div>
      </div>

      <div className="shrink-0 border-t border-white/5 p-4">
        <div className="rounded-xl border border-white/5 bg-white/5 p-3">
          <DarkBar className="h-3 w-24" />
          <DarkBar className="mt-2 h-2.5 w-32" />
        </div>
      </div>
    </div>
  );
}

function TopbarSkeleton() {
  return (
    <div className="flex h-16 shrink-0 items-center gap-2 border-b border-line bg-canvas px-3 sm:gap-3 sm:px-4 lg:px-8">
      <div className="size-9 shrink-0 animate-pulse rounded-lg bg-skeleton lg:hidden" />
      <div className="hidden size-9 shrink-0 animate-pulse rounded-lg bg-skeleton lg:grid" />
      <Bar className="h-2.5 w-20" />

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <div className="size-9 animate-pulse rounded-lg bg-skeleton" />
        <div className="hidden h-9 w-56 animate-pulse rounded-lg bg-skeleton md:block xl:w-64" />
        <div className="size-9 animate-pulse rounded-lg bg-skeleton" />
        <div className="h-9 w-24 animate-pulse rounded-lg bg-skeleton sm:w-28" />
        <div className="size-9 animate-pulse rounded-full bg-skeleton" />
      </div>
    </div>
  );
}

function PanelSkeleton({
  wide = false,
  titleWidth,
  descriptionWidth,
  metaWidth,
}: {
  wide?: boolean;
  titleWidth: string;
  descriptionWidth: string;
  metaWidth: string;
}) {
  return (
    <div
      className={`h-64 overflow-hidden rounded-2xl border border-line bg-canvas ${
        wide ? "lg:col-span-2" : ""
      }`}
    >
      <div className="flex flex-col gap-2 border-b border-line px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-5 sm:py-4">
        <div className="min-w-0 flex-1 space-y-2">
          <Bar className={`h-4 ${titleWidth}`} />
          <Bar className={`h-3 ${descriptionWidth} max-w-full`} />
        </div>
        <Bar className={`h-2.5 shrink-0 ${metaWidth}`} />
      </div>
      <div className="flex items-start gap-2.5 px-4 py-5 sm:gap-3 sm:px-5 sm:py-6">
        <div className="size-8 shrink-0 animate-pulse rounded-lg bg-skeleton" />
        <div className="min-w-0 flex-1 space-y-2">
          <Bar className="h-3.5 w-32" />
          <Bar className="h-3 w-72 max-w-full" />
          <Bar className="h-3 w-56 max-w-full" />
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="space-y-2">
        <Bar className="h-7 w-32 max-w-full" />
        <Bar className="h-3 w-80 max-w-full" />
      </div>

      <section aria-hidden="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <div key={key} className="rounded-2xl border border-line bg-canvas p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <Bar className="h-3 w-24" />
              <div className="size-9 shrink-0 animate-pulse rounded-xl bg-skeleton" />
            </div>
            <Bar className="mt-4 h-[30px] w-20" />
            <Bar className="mt-2 h-2.5 w-16" />
          </div>
        ))}
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <PanelSkeleton
          wide
          titleWidth="w-32"
          descriptionWidth="w-72"
          metaWidth="w-14"
        />
        <PanelSkeleton titleWidth="w-24" descriptionWidth="w-48" metaWidth="w-14" />
      </div>
    </>
  );
}

function PageSkeleton({ titleWidth }: { titleWidth: string }) {
  return (
    <>
      <div className="space-y-2">
        <Bar className={`h-7 ${titleWidth} max-w-full`} />
        <Bar className="h-3 w-80 max-w-full" />
      </div>
      <div className="rounded-2xl border border-line bg-canvas p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <div className="size-8 shrink-0 animate-pulse rounded-lg bg-skeleton" />
          <div className="min-w-0 flex-1 space-y-2">
            <Bar className="h-3.5 w-40" />
            <Bar className="h-3 w-72 max-w-full" />
            <Bar className="h-3 w-56 max-w-full" />
          </div>
        </div>
      </div>
    </>
  );
}

/** Content-only skeleton for route transitions, inside the real app shell. */
export function ContentSkeleton() {
  const pathname = usePathname();

  if (pathname === "/dashboard") return <DashboardSkeleton />;

  const titleWidth =
    pathname === "/inquiries"
      ? "w-24"
      : pathname === "/follow-ups"
        ? "w-28"
        : pathname === "/reports"
          ? "w-20"
          : pathname === "/settings"
            ? "w-20"
            : "w-32";

  return <PageSkeleton titleWidth={titleWidth} />;
}

/** Layout-matched loading state: every header, button, card and text block is mirrored. */
export function AppSkeleton() {
  return (
    <div className="min-h-screen bg-surface" role="status" aria-label="Loading workspace">
      <SidebarSkeleton />
      <div className="flex min-h-screen flex-col lg:pl-[264px]">
        <TopbarSkeleton />
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10">
          <div className="mx-auto w-full max-w-[1440px] space-y-4 sm:space-y-6">
            <ContentSkeleton />
          </div>
        </main>
      </div>
    </div>
  );
}
