import { NextResponse } from "next/server";
import { createVlmPaidAccessToken } from "@/lib/commerce/pass2024-vlm-paid-access-server";
import {
  normalizePaidContext,
  type VlmPaidAccessContext,
  type VlmPaidProductId,
} from "@/lib/commerce/pass2024-vlm-paid-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TEST_SESSION_ID = "test_session_" + Date.now().toString(36);

type TestTokenBody = {
  productId?: string;
  locale?: string;
  surface?: string;
  depth?: string;
  assetId?: string;
  symbol?: string;
};

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "test_endpoint_disabled" }, { status: 404 });
  }

  let body: TestTokenBody = {};
  try {
    body = (await request.json()) as TestTokenBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const productId = body.productId as VlmPaidProductId | undefined;
  if (!productId) {
    return NextResponse.json({ ok: false, error: "missing_productId" }, { status: 400 });
  }

  const locale = (body.locale === "pl" || body.locale === "de" || body.locale === "en") ? body.locale : "en";
  const context = normalizePaidContext({
    surface: (body.surface as VlmPaidAccessContext["surface"]) || "shield",
    locale: locale as "pl" | "en" | "de",
    assetId: body.assetId || undefined,
    symbol: body.symbol || undefined,
    depth: body.depth as VlmPaidAccessContext["depth"] | undefined,
  }, locale as "pl" | "en" | "de");

  const result = createVlmPaidAccessToken({
    productId,
    context,
    sessionId: TEST_SESSION_ID,
    ttlMs: 1000 * 60 * 60 * 24,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    token: result.token,
    productId,
    context,
  });
}
