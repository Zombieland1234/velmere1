import { NextResponse } from "next/server";

export type PaymentGuardDecision =
  | { ok: true }
  | { ok: false; response: NextResponse };

function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

function contentLength(request: Request) {
  const value = request.headers.get("content-length");
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function validateCheckoutRequestBoundary(request: Request): PaymentGuardDecision {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  const length = contentLength(request);

  if (length > 64_000) {
    return { ok: false, response: jsonError("Checkout payload is too large.", 413) };
  }

  if (contentType && !contentType.includes("application/json")) {
    return { ok: false, response: jsonError("Checkout expects application/json.", 415) };
  }

  return { ok: true };
}

export function validateStripeWebhookBoundary(request: Request): PaymentGuardDecision {
  const length = contentLength(request);
  const signature = request.headers.get("stripe-signature");

  if (length > 1_000_000) {
    return { ok: false, response: jsonError("Webhook payload is too large.", 413) };
  }

  if (!signature) {
    return { ok: false, response: jsonError("Missing Stripe signature.", 400) };
  }

  if (signature.length > 2_500) {
    return { ok: false, response: jsonError("Stripe signature header is too large.", 413) };
  }

  return { ok: true };
}

export const paymentWebhookGuardReadiness = {
  schemaVersion: "velmere-payment-webhook-guard-v1",
  checkoutMaxBytes: 64_000,
  webhookMaxBytes: 1_000_000,
  signatureHeaderMaxBytes: 2_500,
  boundary:
    "Payment guards reject oversized checkout/webhook payloads and require JSON checkout input plus Stripe signature headers. They do not replace Stripe signature verification.",
} as const;
