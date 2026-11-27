import { NextResponse, type NextRequest } from "next/server";
import { SubscriptionError, requestCancellation, verifyRequestToken } from "@/lib/subscription/server";

/** Schedules cancellation at period end. Access is preserved until that date. */
export async function POST(request: NextRequest) {
  try {
    const identity = await verifyRequestToken(request);
    const changed = await requestCancellation(identity);
    return NextResponse.json({ ok: true, changed });
  } catch (error) {
    if (error instanceof SubscriptionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[subscription] cancellation failed", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Cancellation is temporarily unavailable." }, { status: 500 });
  }
}
