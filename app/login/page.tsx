import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Inquiry Desk to manage customer inquiries.",
};

function LoginScreen() {
  return (
    <AuthShell
      title="Sign in to Inquiry Desk"
      subtitle="Pick up where you left off."
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}

export default function LoginPage() {
  return <LoginScreen />;
}
