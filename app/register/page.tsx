import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your Inquiry Desk account and private business workspace.",
};

function RegisterScreen() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="A private workspace for your customer inquiries."
    >
      <Suspense fallback={null}>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return <RegisterScreen />;
}
