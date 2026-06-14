import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getCheckoutReadiness } from "@/lib/checkout/config";
import { createOrderDraft, markCheckoutStarted, type OrderLineItem } from "@/lib/orders/order-store";
import { formatMoney, getLocalizedString, getProductBySlugOrId, isProductCustomerPurchasable } from "@/lib/products/catalog";
import { getStripeServerClient } from "@/lib/stripe/server";
import { validateCheckoutRequestBoundary } from "@/lib/security/payment-webhook-guard";

export const runtime = "nodejs";

const MAX_CART_LINES = 25;
const MAX_QUANTITY_PER_LINE = 10;
const ALLOWED_SHIPPING_COUNTRIES: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] = [
  "DE", "PL", "FR", "NL", "BE", "AT", "IT", "ES", "PT", "IE", "DK", "SE", "FI", "NO", "CH", "GB", "US",
];

type CheckoutCartItem = {
  productId: string;
  variantId?: string;
  size?: string;
  selectedSize?: string;
  quantity?: number;
};

type CheckoutRequestBody = {
  items?: CheckoutCartItem[];
  locale?: string;
  walletAddress?: string | null;
};

function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

function normalizeWalletAddress(value: unknown) {
  if (typeof value !== "string") return "";
  const candidate = value.trim();
  if (!candidate) return "";
  return /^0x[a-fA-F0-9]{40}$/.test(candidate) ? candidate : "";
}

function compactMetadataValue(value: unknown, max = 500) {
  const raw = JSON.stringify(value);
  if (raw.length <= max) return raw;
  return JSON.stringify({ truncated: true, sha256: createHash("sha256").update(raw).digest("hex") });
}

export async function POST(req: Request) {
  const paymentGuard = validateCheckoutRequestBoundary(req);
  if (!paymentGuard.ok) return paymentGuard.response;

  const readiness = getCheckoutReadiness();
  if (readiness.mode !== "stripe" || !readiness.enabled) {
    return jsonError("Checkout is disabled until Stripe and store readiness are configured.", 503, readiness.reasons);
  }

  if (process.env.STORE_COMMERCIAL_READY !== "true") {
    return jsonError(
      "Checkout is disabled until legal, shipping, returns, tax, contact, and fulfilment data are finalized.",
      503,
    );
  }

  const body = (await req.json().catch(() => null)) as CheckoutRequestBody | null;
  const items = body?.items ?? [];
  const locale = body?.locale === "en" || body?.locale === "de" || body?.locale === "pl" ? body.locale : "pl";
  const walletAddress = normalizeWalletAddress(body?.walletAddress);

  if (!Array.isArray(items) || items.length === 0) return jsonError("Cart is empty.");
  if (items.length > MAX_CART_LINES) return jsonError("Cart contains too many line items.", 413);

  const orderItems: OrderLineItem[] = [];

  for (const item of items) {
    if (!item || typeof item.productId !== "string") return jsonError("Invalid cart item payload.");

    const product = getProductBySlugOrId(item.productId);
    if (!product) return jsonError("A product in the cart is no longer available.", 404);
    if (!isProductCustomerPurchasable(product)) {
      return jsonError(`${getLocalizedString(product.title, locale)} is not available for checkout yet.`, 409);
    }

    const selectedSize = item.selectedSize ?? item.size;
    const variant =
      product.variants.find((entry) => entry.id === item.variantId) ??
      product.variants.find((entry) => entry.size === selectedSize);
    if (!variant) return jsonError(`${getLocalizedString(product.title, locale)} requires a valid variant.`, 409);

    const quantity = Math.max(1, Math.min(MAX_QUANTITY_PER_LINE, Math.floor(Number(item.quantity ?? 1))));
    const variantPrice = variant.price ?? product.price;
    const providerVariantId = variant.providerVariantId ?? product.providerVariantIds?.[variant.id];
    orderItems.push({
      productId: product.id,
      variantId: variant.id,
      quantity,
      title: `${getLocalizedString(product.title, locale)} / ${variant.title}`,
      amount: variantPrice.amount,
      currency: variantPrice.currency,
      provider: product.provider,
      fulfilmentMode: product.fulfilmentMode,
      providerVariantId,
      selectedSize: selectedSize ?? variant.size,
    });
  }

  const metadataOrderItems = orderItems.map((item) => ({
    id: item.productId,
    q: item.quantity,
    size: item.selectedSize ?? item.variantId,
  }));
  const cartHash = createHash("sha256").update(JSON.stringify(orderItems)).digest("hex");
  const order = createOrderDraft({ locale, cartHash, lineItems: orderItems, walletAddress: walletAddress || undefined });
  const stripe = getStripeServerClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? new URL(req.url).origin;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: `${siteUrl}/${locale}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/${locale}/checkout/cancel?order=${order.id}`,
    billing_address_collection: "auto",
    shipping_address_collection: {
      allowed_countries: ALLOWED_SHIPPING_COUNTRIES,
    },
    line_items: orderItems.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: item.currency.toLowerCase(),
        unit_amount: item.amount,
        product_data: {
          name: item.title,
          metadata: {
            productId: item.productId,
            variantId: item.variantId,
            selectedSize: item.selectedSize ?? "",
          },
        },
      },
    })),
    metadata: {
      orderDraftId: order.id,
      locale,
      walletAddress,
      orderItems: compactMetadataValue(metadataOrderItems),
      providerIds: orderItems.map((item) => `${item.provider}:${item.providerVariantId ?? "manual"}`).join(",").slice(0, 450),
      cartHash,
    },
  });

  if (!session.id) return jsonError("Stripe did not return a checkout session ID.", 502);

  markCheckoutStarted(order.id, session.id);

  return NextResponse.json({
    sessionId: session.id,
    url: session.url,
    orderDraftId: order.id,
    subtotal: formatMoney(
      {
        amount: orderItems.reduce((sum, item) => sum + item.amount * item.quantity, 0),
        currency: orderItems[0].currency,
      },
      locale,
    ),
  });
}
