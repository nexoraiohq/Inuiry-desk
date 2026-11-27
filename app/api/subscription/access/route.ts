import { NextResponse, type NextRequest } from "next/server";
import { FEATURE_KEYS, type FeatureKey } from "@/lib/subscription/catalog";
import { SubscriptionError, requireEntitlement, verifyRequestToken } from "@/lib/subscription/server";

/**
 * Authoritative server-side entitlement gate. A privileged caller must use
 * this result rather than trusting hidden UI controls or client state.
 */
export async function POST(request: NextRequest) {
  try {
    const identity = await verifyRequestToken(request);
    const body = (await request.json().catch(() => null)) as { feature?: unknown } | null;
    const feature = body?.feature;
    if (typeof feature !== "string" || !FEATURE_KEYS.includes(feature as FeatureKey)) {
      throw new SubscriptionError("Unknown feature.", 400);
    }
    const result = await requireEntitlement(identity, feature as FeatureKey);
    return NextResponse.json({
      ok: true,
      allowed: true,
      feature,
      status: result.entitlement.status,
      canAccessProduct: result.entitlement.canAccessProduct,
      features: result.entitlement.features,
    });
  } catch (error) {
    if (error instanceof SubscriptionError) {
      return NextResponse.json({ error: error.message, allowed: false }, { status: error.status });
    }
    console.error("[subscription] access check failed", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Access check is temporarily unavailable.", allowed: false }, { status: 500 });
  }
}
