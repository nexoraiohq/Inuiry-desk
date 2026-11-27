import { NextResponse, type NextRequest } from "next/server";
import { listBillingHistory } from "@/lib/subscription/billing";
import { SubscriptionError, verifyRequestToken } from "@/lib/subscription/server";

/** Billing history for the authenticated workspace only. */
export async function GET(request: NextRequest) {
  try {
    const identity = await verifyRequestToken(request);
    const transactions = await listBillingHistory(identity.uid);
    return NextResponse.json({ ok: true, transactions });
  } catch (error) {
    if (error instanceof SubscriptionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("bail out of prerendering")) console.error("[billing] history read failed", message);
    return NextResponse.json({ error: "Billing history is temporarily unavailable." }, { status: 500 });
  }
}
