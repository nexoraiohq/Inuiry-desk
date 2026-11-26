"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { InquiryFormDialog } from "@/components/inquiries/inquiry-form-dialog";
import { buttonClasses } from "@/components/ui/button";

/** Header action that opens the real inquiry creation dialog from any page. */
export function HeaderAddInquiry() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!user}
        title="Add Inquiry"
        aria-label="Add Inquiry"
        className={`${buttonClasses("primary", "md")} h-9 px-2.5 sm:px-3`}
      >
        <Plus className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Add Inquiry</span>
      </button>

      {user ? (
        <InquiryFormDialog
          uid={user.uid}
          open={open}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            router.push("/inquiries");
          }}
        />
      ) : null}
    </>
  );
}
