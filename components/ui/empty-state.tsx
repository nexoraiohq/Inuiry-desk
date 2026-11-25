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

/** Compact, left-aligned empty state — restrained and product-like. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  headingLevel: Heading = "h2",
  children,
}: EmptyStateProps) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-surface text-subtle">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <Heading className="text-sm font-semibold tracking-[-0.01em] text-ink">
          {title}
        </Heading>
        <p className="mt-1 max-w-md text-[13px] leading-relaxed text-muted">
          {description}
        </p>
        {children ? <div className="mt-4">{children}</div> : null}
      </div>
    </div>
  );
}
