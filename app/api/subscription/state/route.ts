import { NextResponse, type NextRequest } from "next/server";
import {
  SubscriptionError,
  ensureTrialForNewWorkspace,
  getSubscriptionState,
  verifyRequestToken,
} from "@/lib/subscription/server";

export async function GET(request: NextRequest) {
  try {
    const identity = await verifyRequestToken(request);
    // Idempotent: creates the trial for a genuinely new workspace. Legacy
    // workspaces keep a missing record and are grandfathered by server policy.
    await ensureTrialForNewWorkspace(identity);
    const state = await getSubscriptionState(identity);
    return NextResponse.json({ ok: true, ...state });
  } catch (error) {
    if (error instanceof SubscriptionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("bail out of prerendering")) {
      console.error("[subscription] state read failed", message);
    }
    return NextResponse.json({ error: "Subscription state is temporarily unavailable." }, { status: 500 });
  }
}
