import { NextResponse, type NextRequest } from "next/server";
import {
  SubscriptionError,
  ensureSubscription,
  getSubscriptionState,
  verifyRequestToken,
} from "@/lib/subscription/server";

export async function GET(request: NextRequest) {
  try {
    const identity = await verifyRequestToken(request);
    // Idempotent: creates the trial for a genuinely new workspace, returns the
    // existing record for everyone else, and never downgrades legacy workspaces.
    await ensureSubscription(identity);
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
