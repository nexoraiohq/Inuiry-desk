"use client";

import { useState, type FormEvent } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { buttonClasses } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { INQUIRY_PRIORITIES, type InquiryPriority, type InquiryRecord } from "@/lib/dashboard/types";
import { humanize } from "@/lib/dashboard/format";
import { combineLocalDateTime, defaultDueDateTime } from "@/lib/follow-ups/date";
import { createFollowUp, updateFollowUp } from "@/lib/follow-ups/service";
import type { FollowUpRecord } from "@/lib/dashboard/types";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
  uid: string;
  inquiries: InquiryRecord[];
  followUp?: FollowUpRecord | null;
  fixedInquiryId?: string;
};

export function FollowUpFormDialog({
  open,
  onClose,
  onSaved,
  uid,
  inquiries,
  followUp,
  fixedInquiryId,
}: Props) {
  const defaults = defaultDueDateTime();
  const [inquiryId, setInquiryId] = useState(followUp?.inquiryId ?? fixedInquiryId ?? "");
  const [title, setTitle] = useState(followUp?.title ?? "");
  const [description, setDescription] = useState(followUp?.description ?? "");
  const [dueDate, setDueDate] = useState(
    followUp ? toDate(followUp.dueAt) : defaults.date
  );
  const [dueTime, setDueTime] = useState(followUp ? toTime(followUp.dueAt) : defaults.time);
  const [priority, setPriority] = useState<InquiryPriority>(followUp?.priority ?? "normal");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const editing = Boolean(followUp);
  const selected = inquiries.find((item) => item.id === inquiryId);
  const customerName = followUp?.customerName ?? selected?.fullName ?? "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    if (!inquiryId || !customerName) {
      setError("Choose an existing inquiry.");
      return;
    }
    if (!title.trim() || title.trim().length > 150) {
      setError("Enter a title (up to 150 characters).");
      return;
    }
    if (!combineLocalDateTime(dueDate, dueTime)) {
      setError("Enter a valid due date and time.");
      return;
    }
    setBusy(true);
    try {
      if (editing && followUp) {
        await updateFollowUp(uid, followUp.id, { title, description, dueDate, dueTime, priority });
        onSaved("Follow-up updated.");
      } else {
        await createFollowUp(uid, { inquiryId, customerName, title, description, dueDate, dueTime, priority });
        onSaved("Follow-up scheduled.");
      }
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the follow-up.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={busy ? () => undefined : onClose}
      title={editing ? "Edit follow-up" : "Schedule follow-up"}
      description={editing ? "Update the details or reschedule." : "Set the next step for this customer."}
    >
      {error ? <Notice tone="danger" message={error} onDismiss={() => setError(null)} /> : null}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Field label="Customer inquiry" hint={fixedInquiryId ? "This follow-up is tied to this inquiry." : undefined}>
          <Select
            value={inquiryId}
            disabled={busy || Boolean(fixedInquiryId)}
            onChange={(event) => setInquiryId(event.target.value)}
            required
          >
            <option value="">Select an inquiry</option>
            {inquiries.map((item) => (
              <option key={item.id} value={item.id}>{item.fullName} · {item.service}</option>
            ))}
          </Select>
        </Field>
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy} placeholder="Call to discuss proposal" required />
        </Field>
        <Field label="Description (optional)">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={busy} placeholder="Anything to remember for this follow-up" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Due date">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={busy} required />
          </Field>
          <Field label="Due time">
            <Input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} disabled={busy} required />
          </Field>
          <Field label="Priority">
            <Select value={priority} onChange={(e) => setPriority(e.target.value as InquiryPriority)} disabled={busy}>
              {INQUIRY_PRIORITIES.map((option) => <option key={option} value={option}>{humanize(option)}</option>)}
            </Select>
          </Field>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={busy} className={buttonClasses("secondary", "md", "h-10")}>Cancel</button>
          <button type="submit" disabled={busy} className={buttonClasses("primary", "md", "h-10")}>
            {busy ? "Saving…" : editing ? "Save changes" : "Schedule follow-up"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function toDate(value: Date): string {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toTime(value: Date): string {
  const hh = String(value.getHours()).padStart(2, "0");
  const mm = String(value.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
