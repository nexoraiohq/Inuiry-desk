"use client";

import Link from "next/link";
import {
  ArchiveRestore,
  ChevronDown,
  ChevronUp,
  Pencil,
  Pin,
  PinOff,
  Trash2,
} from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import type { InquiryRecord } from "@/lib/dashboard/types";

type Props = {
  item: InquiryRecord;
  manualMode: boolean;
  busy: boolean;
  onPin: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onMove: (direction: -1 | 1) => void;
};

const iconButton = "h-8 px-2 text-muted hover:text-ink";

/** Row/card actions for an inquiry. */
export function InquiryActions({
  item,
  manualMode,
  busy,
  onPin,
  onEdit,
  onArchive,
  onRestore,
  onMove,
}: Props) {
  return (
    <div className="flex items-center justify-end gap-0.5 whitespace-nowrap">
      <Link href={`/inquiries/${item.id}`} className={buttonClasses("ghost", "sm", iconButton)}>
        View
      </Link>
      <button type="button" onClick={onEdit} disabled={busy} aria-label={`Edit ${item.fullName}`} title="Edit" className={buttonClasses("ghost", "sm", iconButton)}>
        <Pencil className="size-3.5" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onPin}
        disabled={busy}
        aria-label={item.pinned ? `Unpin ${item.fullName}` : `Pin ${item.fullName}`}
        title={item.pinned ? "Unpin" : "Pin to top"}
        className={buttonClasses("ghost", "sm", iconButton)}
      >
        {item.pinned ? <PinOff className="size-3.5 text-brand" aria-hidden="true" /> : <Pin className="size-3.5" aria-hidden="true" />}
      </button>
      {manualMode ? (
        <>
          <button type="button" onClick={() => onMove(-1)} disabled={busy} aria-label={`Move ${item.fullName} up`} title="Move up" className={buttonClasses("ghost", "sm", iconButton)}>
            <ChevronUp className="size-3.5" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={busy} aria-label={`Move ${item.fullName} down`} title="Move down" className={buttonClasses("ghost", "sm", iconButton)}>
            <ChevronDown className="size-3.5" aria-hidden="true" />
          </button>
        </>
      ) : null}
      {item.archived ? (
        <button type="button" onClick={onRestore} disabled={busy} aria-label={`Restore ${item.fullName}`} title="Restore" className={buttonClasses("ghost", "sm", iconButton)}>
          <ArchiveRestore className="size-3.5 text-success" aria-hidden="true" />
        </button>
      ) : (
        <button type="button" onClick={onArchive} disabled={busy} aria-label={`Archive ${item.fullName}`} title="Archive" className={buttonClasses("ghost", "sm", iconButton)}>
          <Trash2 className="size-3.5 text-danger" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
