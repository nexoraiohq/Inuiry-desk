import {
  AtSign,
  CircleHelp,
  Globe2,
  MessageCircle,
  Phone,
  Share2,
  UserRound,
  Users,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { InquirySource, InquiryStatus } from "@/lib/dashboard/types";

const statusTones: Record<InquiryStatus, string> = {
  new: "bg-brand-soft text-brand",
  contacted: "bg-surface text-muted",
  qualified: "bg-brand-soft text-brand-strong",
  converted: "bg-success-soft text-success",
  lost: "bg-danger-soft text-danger",
};

const statusLabels: Record<InquiryStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  converted: "Won",
  lost: "Lost",
};

const sourceLabels: Record<InquirySource, string> = {
  whatsapp: "WhatsApp",
  website: "Website",
  phone: "Phone",
  instagram: "Instagram",
  facebook: "Facebook",
  walk_in: "Walk-in",
  referral: "Referral",
  other: "Other",
};

const sourceIcons = {
  whatsapp: MessageCircle,
  website: Globe2,
  phone: Phone,
  instagram: AtSign,
  facebook: Share2,
  walk_in: UserRound,
  referral: Users,
  other: CircleHelp,
} as const;

export function StatusBadge({ status }: { status: InquiryStatus }) {
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-medium",
        statusTones[status]
      )}
    >
      {statusLabels[status]}
    </span>
  );
}

export function SourceBadge({ source }: { source: InquirySource }) {
  const Icon = sourceIcons[source];
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-muted">
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {sourceLabels[source]}
    </span>
  );
}
