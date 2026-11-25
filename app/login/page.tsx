import type { Metadata } from "next";
import { Suspense } from "react";
import { BrandMark } from "@/components/brand";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Inquiry Desk to manage customer inquiries.",
};

function LoginScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-10 sm:px-6 sm:py-16">
      <div className="w-full max-w-[440px]">
        <div className="flex flex-col items-center text-center">
          <BrandMark className="size-10 rounded-[10px]" />
          <h1 className="mt-5 font-display text-2xl font-semibold tracking-[-0.02em] text-ink">
            Sign in to Inquiry Desk
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Never lose track of a potential customer.
          </p>
        </div>
        <div className="mt-8">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <LoginScreen />;
}
