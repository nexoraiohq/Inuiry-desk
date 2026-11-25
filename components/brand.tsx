import { Inbox } from "lucide-react";
import { cn } from "@/lib/cn";

/** Inquiry Desk brand mark — an indigo tile with the inbox glyph. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-lg bg-brand text-white shadow-sm",
        className
      )}
    >
      <Inbox className="size-[18px]" strokeWidth={2.25} />
    </span>
  );
}

export function BrandName({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "truncate font-display text-[15px] font-bold tracking-[-0.02em] text-ink",
        className
      )}
    >
      Inquiry Desk
    </span>
  );
}
