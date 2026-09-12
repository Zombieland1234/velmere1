import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type ServiceType = "analysis" | "audit" | "browser" | "real_markets";

const LEGACY_CHECKOUT_WITHHELD = {
  ok: false,
  mode: "withheld",
  error: "legacy_checkout_disabled",
  reason:
    "This legacy endpoint did not bind checkout verification to the authenticated account, canonical product, target, and stop-sell policy. It cannot be used as payment or entitlement authority.",
  canonicalCheckout: "/api/checkout/vlm-service",
  entitlementGranted: false,
  releaseCredit: false,
} as const;

function withheldResponse() {
  return NextResponse.json(LEGACY_CHECKOUT_WITHHELD, {
    status: 503,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "x-velmere-checkout-state": "withheld",
    },
  });
}

export async function POST() {
  return withheldResponse();
}

export async function GET() {
  return withheldResponse();
}
