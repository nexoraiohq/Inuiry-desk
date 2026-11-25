import type { Metadata } from "next";
import { Suspense } from "react";
import { BrandMark } from "@/components/brand";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your Inquiry Desk account and private business workspace.",
};

function RegisterScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-10 sm:px-6 sm:py-16">
      <div className="w-full max-w-[520px]">
        <div className="flex flex-col items-center text-center">
          <BrandMark className="size-10 rounded-[10px]" />
          <h1 className="mt-5 font-display text-2xl font-semibold tracking-[-0.02em] text-ink">
            Create your account
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Set up your private workspace to start tracking inquiries.
          </p>
        </div>
        <div className="mt-8">
          <Suspense fallback={null}>
            <RegisterForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return <RegisterScreen />;
}
