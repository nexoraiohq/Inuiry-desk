import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Heading level so the document outline stays correct in every context. */
  headingLevel?: "h2" | "h3";
  children?: ReactNode;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  headingLevel: Heading = "h2",
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-line bg-surface px-6 py-12 text-center">
      <span className="grid size-11 place-items-center rounded-full border border-line bg-brand-soft text-brand">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <Heading className="mt-4 text-[15px] font-semibold tracking-tight text-ink">
        {title}
      </Heading>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">
        {description}
      </p>
      {children ? <div className="mt-6 w-full">{children}</div> : null}
    </div>
  );
}
