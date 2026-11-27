import { NextResponse, type NextRequest } from "next/server";
import { processCheckout } from "@/lib/subscription/billing";
import { SubscriptionError, verifyRequestToken } from "@/lib/subscription/server";

/** Processes the stored simulated outcome. Client success claims are ignored. */
export async function POST(request: NextRequest) {
  try {
    const identity = await verifyRequestToken(request);
    const body = (await request.json().catch(() => null)) as { sessionId?: unknown } | null;
    const result = await processCheckout(identity.uid, body?.sessionId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SubscriptionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[billing] checkout completion failed", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Checkout completion is temporarily unavailable." }, { status: 500 });
  }
}
