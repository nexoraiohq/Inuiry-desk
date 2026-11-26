"use client";

import { useState, type FormEvent } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { buttonClasses } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import {
  INQUIRY_PRIORITIES,
  INQUIRY_SOURCES,
  type InquiryPriority,
  type InquiryRecord,
  type InquirySource,
} from "@/lib/dashboard/types";
import { humanize } from "@/lib/dashboard/format";
import { isValidOptionalEmail, isValidPhone, normalizePhone } from "@/lib/inquiries/phone";
import { createInquiry, updateInquiry } from "@/lib/inquiries/service";

type FormErrors = Partial<Record<"fullName" | "phone" | "email" | "service" | "notes", string>>;

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
  uid: string;
  inquiry?: InquiryRecord | null;
};

/** Create/edit form. Parent keys this component per inquiry to reset state. */
export function InquiryFormDialog({ open, onClose, onSaved, uid, inquiry }: Props) {
  const editing = Boolean(inquiry);
  const [fullName, setFullName] = useState(inquiry?.fullName ?? "");
  const [phone, setPhone] = useState(inquiry?.phone ?? "");
  const [email, setEmail] = useState(inquiry?.email ?? "");
  const [service, setService] = useState(inquiry?.service ?? "");
  const [source, setSource] = useState<InquirySource>(inquiry?.source ?? "website");
  const [priority, setPriority] = useState<InquiryPriority>(inquiry?.priority ?? "normal");
  const [notes, setNotes] = useState(inquiry?.notes ?? "");
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function validate(): FormErrors {
    const next: FormErrors = {};
    if (fullName.trim().length < 2 || fullName.trim().length > 100) {
      next.fullName = "Enter a name between 2 and 100 characters.";
    }
    if (!isValidPhone(phone)) {
      next.phone = "Enter a valid phone number with country code.";
    }
    if (!isValidOptionalEmail(email)) {
      next.email = "Enter a valid email address or leave it blank.";
    }
    if (!service.trim() || service.trim().length > 150) {
      next.service = "Enter a service (up to 150 characters).";
    }
    if (notes.length > 2000) next.notes = "Notes must be 2000 characters or fewer.";
    return next;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const nextErrors = validate();
    setErrors(nextErrors);
    setSubmitError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setBusy(true);
    try {
      const values = {
        fullName: fullName.trim(),
        phone: normalizePhone(phone),
        email: email.trim(),
        service: service.trim(),
        source,
        priority,
      };
      if (editing && inquiry) {
        await updateInquiry(uid, inquiry.id, values);
        onSaved("Inquiry updated successfully.");
      } else {
        await createInquiry(uid, { ...values, notes: notes.trim() });
        onSaved("Inquiry created successfully.");
      }
      onClose();
    } catch (caught) {
      setSubmitError(
        caught instanceof Error ? caught.message : "Could not save the inquiry. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={busy ? () => undefined : onClose}
      title={editing ? "Edit inquiry" : "Add inquiry"}
      description={
        editing
          ? "Update the customer details below. Status and follow-ups stay unchanged."
          : "Capture a new potential customer in your workspace."
      }
    >
      {submitError ? <Notice tone="danger" message={submitError} onDismiss={() => setSubmitError(null)} /> : null}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Field label="Full name" error={errors.fullName}>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" disabled={busy} required />
        </Field>
        <Field
          label="Phone"
          error={errors.phone}
          hint="Include the country code, e.g. +1 555 123 4567."
        >
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" autoComplete="tel" disabled={busy} required />
        </Field>
        <Field label="Email (optional)" error={errors.email}>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" disabled={busy} />
        </Field>
        <Field label="Service" error={errors.service}>
          <Input value={service} onChange={(e) => setService(e.target.value)} disabled={busy} required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Source">
            <Select value={source} onChange={(e) => setSource(e.target.value as InquirySource)} disabled={busy}>
              {INQUIRY_SOURCES.map((option) => (
                <option key={option} value={option}>{humanize(option)}</option>
              ))}
            </Select>
          </Field>
          <Field label="Priority">
            <Select value={priority} onChange={(e) => setPriority(e.target.value as InquiryPriority)} disabled={busy}>
              {INQUIRY_PRIORITIES.map((option) => (
                <option key={option} value={option}>{humanize(option)}</option>
              ))}
            </Select>
          </Field>
        </div>
        {!editing ? (
          <Field label="Initial notes (optional)" error={errors.notes}>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} disabled={busy} placeholder="Anything worth remembering about this inquiry" />
          </Field>
        ) : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className={buttonClasses("secondary", "md", "h-10")}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className={buttonClasses("primary", "md", "h-10")}
          >
            {busy ? "Saving…" : editing ? "Save changes" : "Create inquiry"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
