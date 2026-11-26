"use client";

import { useState, type FormEvent } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { buttonClasses } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import {
  COMMUNICATION_CHANNELS,
  COMMUNICATION_DIRECTIONS,
  COMMUNICATION_OUTCOMES,
  type CommunicationChannel,
  type CommunicationDirection,
  type CommunicationOutcome,
  type CommunicationRecord,
  type FollowUpRecord,
} from "@/lib/dashboard/types";
import { humanize } from "@/lib/dashboard/format";
import { combineLocalDateTime, defaultDueDateTime, toDateInput, toTimeInput } from "@/lib/follow-ups/date";
import { createCommunication, updateCommunication } from "@/lib/communications/service";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
  uid: string;
  inquiryId: string;
  inquiryLabel: string;
  followUps: FollowUpRecord[];
  communication?: CommunicationRecord | null;
};

export function CommunicationFormDialog({
  open,
  onClose,
  onSaved,
  uid,
  inquiryId,
  inquiryLabel,
  followUps,
  communication,
}: Props) {
  const defaults = defaultDueDateTime();
  const [channel, setChannel] = useState<CommunicationChannel>(communication?.channel ?? "phone");
  const [direction, setDirection] = useState<CommunicationDirection>(communication?.direction ?? "outgoing");
  const [outcome, setOutcome] = useState<CommunicationOutcome>(
    communication?.outcome ?? (COMMUNICATION_OUTCOMES.phone[0] as CommunicationOutcome)
  );
  const [occurredDate, setOccurredDate] = useState(
    communication ? toDateInput(communication.occurredAt) : defaults.date
  );
  const [occurredTime, setOccurredTime] = useState(
    communication ? toTimeInput(communication.occurredAt) : defaults.time
  );
  const [summary, setSummary] = useState(communication?.summary ?? "");
  const [followUpId, setFollowUpId] = useState(communication?.followUpId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const editing = Boolean(communication);
  const outcomes = COMMUNICATION_OUTCOMES[channel] as readonly CommunicationOutcome[];

  function changeChannel(next: CommunicationChannel) {
    setChannel(next);
    const allowed = COMMUNICATION_OUTCOMES[next] as readonly CommunicationOutcome[];
    if (!allowed.includes(outcome)) setOutcome(allowed[0]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    if (!summary.trim() || summary.trim().length > 2000) {
      setError("Enter a summary (up to 2000 characters).");
      return;
    }
    if (!combineLocalDateTime(occurredDate, occurredTime)) {
      setError("Enter a valid interaction date and time.");
      return;
    }
    setBusy(true);
    try {
      const input = {
        inquiryId,
        channel,
        direction,
        outcome,
        occurredDate,
        occurredTime,
        summary,
        followUpId: followUpId || null,
      };
      if (editing && communication) {
        await updateCommunication(uid, communication.id, input);
        onSaved("Interaction updated.");
      } else {
        await createCommunication(uid, input);
        onSaved("Interaction logged.");
      }
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the interaction.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={busy ? () => undefined : onClose}
      title={editing ? "Edit interaction" : "Log interaction"}
      description={`Record a completed interaction with ${inquiryLabel}. Nothing is sent by Inquiry Desk.`}
    >
      {error ? <Notice tone="danger" message={error} onDismiss={() => setError(null)} /> : null}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Channel">
            <Select value={channel} disabled={busy} onChange={(e) => changeChannel(e.target.value as CommunicationChannel)}>
              {COMMUNICATION_CHANNELS.map((option) => <option key={option} value={option}>{humanize(option)}</option>)}
            </Select>
          </Field>
          <Field label="Direction">
            <Select value={direction} disabled={busy} onChange={(e) => setDirection(e.target.value as CommunicationDirection)}>
              {COMMUNICATION_DIRECTIONS.map((option) => <option key={option} value={option}>{humanize(option)}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Outcome" hint="Only outcomes supported by the selected channel are shown.">
          <Select value={outcome} disabled={busy} onChange={(e) => setOutcome(e.target.value as CommunicationOutcome)}>
            {outcomes.map((option) => <option key={option} value={option}>{humanize(option)}</option>)}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Interaction date">
            <Input type="date" value={occurredDate} disabled={busy} onChange={(e) => setOccurredDate(e.target.value)} required />
          </Field>
          <Field label="Interaction time">
            <Input type="time" value={occurredTime} disabled={busy} onChange={(e) => setOccurredTime(e.target.value)} required />
          </Field>
        </div>
        <Field label="Summary">
          <Textarea value={summary} disabled={busy} onChange={(e) => setSummary(e.target.value)} placeholder="What was discussed or observed" required />
        </Field>
        <Field label="Linked follow-up (optional)" hint="Keeps the follow-up record independent — this only links the interaction.">
          <Select value={followUpId} disabled={busy} onChange={(e) => setFollowUpId(e.target.value)}>
            <option value="">None</option>
            {followUps.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </Select>
        </Field>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={busy} className={buttonClasses("secondary", "md", "h-10")}>Cancel</button>
          <button type="submit" disabled={busy} className={buttonClasses("primary", "md", "h-10")}>
            {busy ? "Saving…" : editing ? "Save changes" : "Log interaction"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
