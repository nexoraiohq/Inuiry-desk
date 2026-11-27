import { NextResponse, type NextRequest } from "next/server";
import {
  SubscriptionError,
  ensureTrialForNewWorkspace,
  getSubscriptionState,
  verifyRequestToken,
} from "@/lib/subscription/server";

export async function POST(request: NextRequest) {
  try {
    const identity = await verifyRequestToken(request);
    await ensureTrialForNewWorkspace(identity);
    const state = await getSubscriptionState(identity);
    return NextResponse.json({ ok: true, ...state });
  } catch (error) {
    if (error instanceof SubscriptionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[subscription] trial setup failed", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Trial setup is temporarily unavailable." }, { status: 500 });
  }
}
