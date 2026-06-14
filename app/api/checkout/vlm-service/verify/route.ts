import { NextResponse } from "next/server";
import {
  getVlmPaidProduct,
  normalizePaidContext,
  normalizeVlmPaidProductId,
  type VlmPaidAccessContext,
} from "@/lib/commerce/pass2024-vlm-paid-access";
import { createVlmPaidAccessToken, hashVlmPaidAccessContext } from "@/lib/commerce/pass2024-vlm-paid-access-server";
import { upsertVlmPaidEntitlementFromStripeSession } from "@/lib/commerce/pass2025-vlm-entitlement-ledger";
import { getStripeServerClient } from "@/lib/stripe/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type VerifyBody = {
  sessionId?: unknown;
  productId?: unknown;
  context?: Partial<VlmPaidAccessContext>;
  locale?: unknown;
};

function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ ok: false, error: message, details }, { status });
}

export async function POST(request: Request) {
  let body: VerifyBody = {};
  try {
    body = (await request.json()) as VerifyBody;
  } catch {
    return jsonError("invalid_json", 400);
  }

  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
  if (!sessionId.startsWith("cs_")) return jsonError("invalid_session_id", 400);

  const stripe = getStripeServerClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const metadataProduct = normalizeVlmPaidProductId(session.metadata?.productId);
  const requestedProduct = normalizeVlmPaidProductId(body.productId);
  const productId = requestedProduct ?? metadataProduct;
  if (!productId || productId !== metadataProduct) return jsonError("product_mismatch", 409);
  if (session.payment_status !== "paid") return jsonError("payment_not_confirmed", 402, { paymentStatus: session.payment_status });

  const locale = body.locale === "pl" || body.locale === "de" || body.locale === "en" ? body.locale : session.metadata?.locale || "en";
  const context = normalizePaidContext(
    {
      surface: (body.context?.surface || session.metadata?.surface) as VlmPaidAccessContext["surface"],
      locale: locale as VlmPaidAccessContext["locale"],
      assetId: body.context?.assetId || session.metadata?.assetId || undefined,
      symbol: body.context?.symbol || session.metadata?.symbol || undefined,
      depth: (body.context?.depth || session.metadata?.depth) as VlmPaidAccessContext["depth"],
      requestId: body.context?.requestId || session.metadata?.requestId || undefined,
      returnPath: body.context?.returnPath || session.metadata?.returnPath || undefined,
    },
    String(locale),
  );
  const entitlement = await upsertVlmPaidEntitlementFromStripeSession(session, "checkout_verify");
  if (!entitlement.ok) return jsonError(entitlement.error, 503);
  if (entitlement.record.contextHash !== hashVlmPaidAccessContext(context)) {
    return jsonError("context_mismatch", 409);
  }

  const expiresMs = Date.parse(entitlement.record.expiresAt) - Date.now();
  const token = createVlmPaidAccessToken({ productId, context, sessionId: session.id, ttlMs: Math.max(60_000, expiresMs) });
  if (!token.ok) return jsonError(token.error, 503);

  return NextResponse.json({
    ok: true,
    product: getVlmPaidProduct(productId, String(locale)),
    context,
    accessToken: token.token,
    expiresAt: token.payload.expiresAt,
    entitlement: {
      id: entitlement.record.id,
      status: entitlement.record.status,
      ledgerMode: entitlement.mode,
      auditQueueId: entitlement.record.auditQueueId,
    },
  });
}
