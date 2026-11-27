import type { ReactNode } from "react";
import { BrandMark, BrandName } from "@/components/brand";

/**
 * Premium editorial auth shell. The dark panel and elevated porcelain card
 * share one visual language with the workspace shell — no feature logic here.
 */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-sidebar px-4 py-8 sm:px-6 sm:py-12">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-[-10%] size-[42rem] rounded-full bg-brand/20 blur-[120px]" />
        <div className="absolute -right-40 -bottom-52 size-[38rem] rounded-full bg-brand-strong/20 blur-[130px]" />
      </div>

      <div className="relative grid w-full max-w-[1160px] gap-6 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16">
        <div className="hidden flex-col justify-center px-6 text-white lg:flex">
          <div className="flex items-center gap-3">
            <BrandMark className="size-11 rounded-2xl shadow-lg shadow-black/30" />
            <BrandName inverted className="text-[18px] font-semibold tracking-tight" />
          </div>

          <div className="mt-16 max-w-lg">
            <p className="eyebrow text-white/40">Inquiry Desk</p>
            <h2 className="mt-5 font-display text-[46px] leading-[1.05] font-semibold tracking-[-0.04em] xl:text-[54px]">
              Every customer.
              <br />
              One clear place.
            </h2>
            <p className="mt-6 max-w-md text-[16px] leading-7 text-white/55">
              Capture inquiries, follow up on time, and see exactly what your business is doing — without the noise.
            </p>
          </div>

          <div className="mt-16 flex items-center gap-6 border-t border-white/10 pt-6 text-[12px] text-white/35">
            <span>Private workspace</span>
            <span className="size-1 rounded-full bg-white/20" />
            <span>Built for follow-through</span>
          </div>
        </div>

        <div className="relative rounded-[32px] border border-white/10 bg-surface p-7 shadow-raised sm:p-12">
          <div className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-brand/50 to-transparent" aria-hidden="true" />
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <BrandMark className="size-11 rounded-2xl lg:hidden" />
            <h1 className="mt-6 font-display text-[30px] leading-[1.1] font-semibold tracking-[-0.035em] text-ink lg:mt-0">
              {title}
            </h1>
            <p className="mt-2.5 text-[14px] leading-6 text-muted">{subtitle}</p>
          </div>
          <div className="mt-9">{children}</div>
        </div>
      </div>
    </div>
  );
}
