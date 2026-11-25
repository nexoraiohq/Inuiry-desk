"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { FIREBASE_UNCONFIGURED_MESSAGE } from "@/lib/firebase";

function FullScreenNotice({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="grid min-h-screen place-items-center bg-white px-6">
      <div className="flex max-w-md flex-col items-center text-center">
        <span className="grid size-11 place-items-center rounded-xl bg-danger-soft text-danger">
          <ShieldAlert className="size-5" aria-hidden="true" />
        </span>
        <h1 className="mt-4 font-display text-lg font-semibold tracking-[-0.01em] text-ink">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div
      className="grid min-h-screen place-items-center bg-white"
      role="status"
      aria-label="Checking your session"
    >
      <span className="size-8 animate-spin rounded-full border-2 border-line border-t-brand" />
    </div>
  );
}

/**
 * Gates every workspace route. While Firebase resolves the persisted session
 * it shows a spinner (no flash of protected content), unauthenticated users
 * are sent to /login, and a missing configuration is reported instead of
 * silently treating the visitor as logged out.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "ready" && !user) {
      const next = pathname && pathname !== "/" ? `?next=${pathname}` : "";
      router.replace(`/login${next}`);
    }
  }, [status, user, pathname, router]);

  if (status === "unconfigured") {
    return (
      <FullScreenNotice
        title="Authentication is not configured"
        description={FIREBASE_UNCONFIGURED_MESSAGE}
      />
    );
  }

  if (status === "loading" || !user) {
    // `!user` only happens while the redirect above is in flight.
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
