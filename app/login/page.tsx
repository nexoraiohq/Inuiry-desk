import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, KeyRound } from "lucide-react";
import { BrandMark } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to Inquiry Desk. Account authentication arrives in a later phase.",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-16">
      <div className="w-full max-w-[440px]">
        <div className="flex flex-col items-center text-center">
          <BrandMark className="size-10 rounded-[10px]" />
          <h1 className="mt-5 font-display text-2xl font-bold tracking-[-0.02em] text-ink">
            Sign in to Inquiry Desk
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Never lose track of a potential customer.
          </p>
        </div>

        <div className="mt-8">
          <EmptyState
            icon={KeyRound}
            title="Sign-in is not enabled yet"
            description="Account authentication arrives in a later phase. Until then, you are viewing Inquiry Desk as a guest."
          >
            <div className="flex flex-col items-start gap-3">
              <button
                type="button"
                disabled
                title="Sign-in arrives in a later phase"
                className={buttonClasses("secondary", "md")}
              >
                Sign in
                <Badge variant="neutral">Soon</Badge>
              </button>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-strong"
              >
                Continue to the dashboard
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </EmptyState>
        </div>
      </div>
    </div>
  );
}
