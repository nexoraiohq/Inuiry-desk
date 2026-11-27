import { NextResponse, type NextRequest } from "next/server";
import { createCheckoutSession } from "@/lib/subscription/billing";
import { SubscriptionError, verifyRequestToken } from "@/lib/subscription/server";

/** Creates a deterministic simulated checkout session. No state change yet. */
export async function POST(request: NextRequest) {
  try {
    const identity = await verifyRequestToken(request);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw new SubscriptionError("Invalid checkout request.", 400);
    const session = await createCheckoutSession(identity.uid, {
      intent: body.intent,
      outcome: body.outcome,
      idempotencyKey: body.idempotencyKey,
    });
    return NextResponse.json({ ok: true, session });
  } catch (error) {
    if (error instanceof SubscriptionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[billing] checkout creation failed", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Checkout is temporarily unavailable." }, { status: 500 });
  }
}
