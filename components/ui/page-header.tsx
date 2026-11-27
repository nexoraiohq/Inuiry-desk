import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

/** Full page heading used by the workspace pages beneath the compact topbar. */
export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-[28px] leading-[1.1] font-semibold tracking-[-0.02em] text-ink sm:text-[30px]">
          {title}
        </h1>
        <p className="mt-1.5 text-[14px] leading-5 text-muted sm:text-[15px]">{description}</p>
      </div>
      {children}
    </div>
  );
}
