import type { ReactNode } from "react";

/**
 * Editorial page header used by the primary workspace sections.
 * A hairline rule separates the title block from the page body.
 */
export function PageIntro({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow text-subtle">{eyebrow}</p> : null}
        <h1 className="mt-2 font-display text-[32px] leading-[1.08] font-semibold tracking-[-0.035em] text-ink sm:text-[36px]">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-6 text-muted sm:text-[15px]">
          {description}
        </p>
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </header>
  );
}
