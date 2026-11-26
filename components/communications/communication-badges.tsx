import {
  ArrowDownLeft,
  ArrowUpRight,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  Users,
  CircleHelp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { humanize } from "@/lib/dashboard/format";
import type {
  CommunicationChannel,
  CommunicationDirection,
  CommunicationOutcome,
} from "@/lib/dashboard/types";

const channelIcons: Record<CommunicationChannel, LucideIcon> = {
  phone: Phone,
  whatsapp: MessageCircle,
  email: Mail,
  sms: MessageSquare,
  in_person: Users,
  other: CircleHelp,
};

const positiveOutcomes: CommunicationOutcome[] = [
  "connected",
  "message_sent",
  "customer_replied",
  "email_sent",
  "meeting_completed",
  "completed",
];
const negativeOutcomes: CommunicationOutcome[] = [
  "no_answer",
  "no_response",
  "meeting_missed",
];

function Pill({ label, tone }: { label: string; tone: string }) {
  return (
    <span className={cn("inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold", tone)}>
      {label}
    </span>
  );
}

export function CommunicationChannelBadge({ channel }: { channel: CommunicationChannel }) {
  const Icon = channelIcons[channel];
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-muted">
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {humanize(channel)}
    </span>
  );
}

export function CommunicationDirectionBadge({ direction }: { direction: CommunicationDirection }) {
  const Icon = direction === "incoming" ? ArrowDownLeft : ArrowUpRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        direction === "incoming" ? "bg-brand-soft text-brand" : "bg-surface text-muted"
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {humanize(direction)}
    </span>
  );
}

export function CommunicationOutcomeBadge({ outcome }: { outcome: CommunicationOutcome }) {
  const tone = positiveOutcomes.includes(outcome)
    ? "bg-success-soft text-success"
    : negativeOutcomes.includes(outcome)
      ? "bg-danger-soft text-danger"
      : "bg-surface text-muted";
  return <Pill label={humanize(outcome)} tone={tone} />;
}
