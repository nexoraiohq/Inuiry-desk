import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";

/** Flat, divided KPI band — Apple restraint with Stripe data density. */
export function DashboardSummary({
  totalInquiries,
  newInquiries,
  convertedInquiries,
  followUpsDue,
}: {
  totalInquiries: number;
  newInquiries: number;
  convertedInquiries: number;
  followUpsDue: number;
}) {
  const share = (part: number) => totalInquiries > 0 ? `${Math.round((part / totalInquiries) * 100)}% of inquiries` : "no inquiries yet";
  const cells = [
    { label: "Total inquiries", value: totalInquiries, hint: "active inquiries on record", href: "/inquiries" },
    { label: "Awaiting reply", value: newInquiries, hint: share(newInquiries), href: "/inquiries" },
    { label: "Converted", value: convertedInquiries, hint: share(convertedInquiries), href: "/inquiries" },
    { label: "Follow-ups due", value: followUpsDue, hint: "today or overdue", href: "/follow-ups" },
  ];

  return (
    <Card className="overflow-hidden">
      <section aria-label="Workspace summary" className="grid sm:grid-cols-2 xl:grid-cols-4 xl:divide-x xl:divide-line">
        {cells.map(({ label, value, hint, href }) => (
          <Link key={label} href={href} className="group border-b border-line px-5 py-5 last:border-b-0 sm:px-6 xl:border-b-0">
            <p className="text-[12px] font-medium text-muted">{label}</p>
            <p className="mt-2 font-display text-[28px] leading-none font-semibold tracking-[-0.02em] text-ink tabular-nums">
              {value.toLocaleString()}
            </p>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <span className="text-[11px] text-subtle">{hint}</span>
              <ArrowUpRight className="size-3.5 text-brand opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
            </div>
          </Link>
        ))}
      </section>
    </Card>
  );
}
