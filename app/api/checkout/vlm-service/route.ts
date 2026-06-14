import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getStripeServerClient } from "@/lib/stripe/server";
import {
  buildVlmPaidReturnPath,
  getVlmPaidProduct,
  normalizePaidContext,
  normalizeVlmPaidProductId,
  PASS2024_VLM_PAID_ACCESS_ID,
  type VlmPaidAccessContext,
} from "@/lib/commerce/pass2024-vlm-paid-access";
import { hashVlmPaidAccessContext } from "@/lib/commerce/pass2024-vlm-paid-access-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type VlmServiceCheckoutBody = {
  productId?: unknown;
  locale?: unknown;
  context?: Partial<VlmPaidAccessContext>;
};

function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ ok: false, error: message, details }, { status });
}

function compact(value: unknown, max = 460) {
  const raw = JSON.stringify(value ?? {});
  if (raw.length <= max) return raw;
  return JSON.stringify({ truncated: true, sha256: createHash("sha256").update(raw).digest("hex") });
}

function serviceCheckoutReady() {
  const reasons: string[] = [];
  if (process.env.CHECKOUT_MODE !== "stripe") reasons.push("CHECKOUT_MODE must be stripe.");
  if (!process.env.STRIPE_SECRET_KEY) reasons.push("STRIPE_SECRET_KEY is required.");
  if (!process.env.NEXT_PUBLIC_SITE_URL) reasons.push("NEXT_PUBLIC_SITE_URL is required.");
  if (process.env.VELMERE_SERVICES_COMMERCIAL_READY !== "true") reasons.push("VELMERE_SERVICES_COMMERCIAL_READY must be true before paid digital services go live.");
  return { enabled: reasons.length === 0, reasons };
}

export async function POST(request: Request) {
  let body: VlmServiceCheckoutBody = {};
  try {
    body = (await request.json()) as VlmServiceCheckoutBody;
  } catch {
    return jsonError("invalid_json", 400);
  }

  const productId = normalizeVlmPaidProductId(body.productId);
  if (!productId) return jsonError("invalid_product_id", 400);

  const locale = body.locale === "pl" || body.locale === "de" || body.locale === "en" ? body.locale : "en";
  const context = normalizePaidContext({ ...body.context, locale }, locale);
  const product = getVlmPaidProduct(productId, locale);
  const contextHash = hashVlmPaidAccessContext(context);
  const readiness = serviceCheckoutReady();
  if (!readiness.enabled) return jsonError("service_checkout_disabled", 503, { product, reasons: readiness.reasons });

  const stripe = getStripeServerClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? new URL(request.url).origin;
  const returnPath = buildVlmPaidReturnPath(context, `/${locale}`);
  const successContextParams = new URLSearchParams({
    vlm_service: product.id,
    return: returnPath,
  });
  if (context.assetId) successContextParams.set("assetId", context.assetId);
  if (context.symbol) successContextParams.set("symbol", context.symbol);
  if (context.depth) successContextParams.set("depth", context.depth);
  if (context.requestId) successContextParams.set("requestId", context.requestId);
  const successUrl = `${siteUrl}/${locale}/checkout/success?session_id={CHECKOUT_SESSION_ID}&${successContextParams.toString()}`;
  const cancelUrl = `${siteUrl}${returnPath}`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: successUrl,
    cancel_url: cancelUrl,
    billing_address_collection: "auto",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: product.currency,
          unit_amount: product.amount,
          product_data: {
            name: product.label,
            description: product.description.slice(0, 320),
            metadata: {
              productId: product.id,
              accessScope: product.accessScope,
              passId: PASS2024_VLM_PAID_ACCESS_ID,
            },
          },
        },
      },
    ],
    metadata: {
      kind: "vlm_paid_access",
      productId: product.id,
      locale,
      surface: context.surface,
      assetId: context.assetId || "",
      symbol: context.symbol || "",
      depth: context.depth || "",
      requestId: context.requestId || "",
      returnPath,
      contextHash,
      context: compact(context),
      passId: PASS2024_VLM_PAID_ACCESS_ID,
    },
  });

  if (!session.url) return jsonError("stripe_session_missing_url", 502);
  return NextResponse.json({ ok: true, url: session.url, sessionId: session.id, product, context, contextHash });
}
