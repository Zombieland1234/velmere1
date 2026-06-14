"use client";

import {
  buildVlmPaidAccessStorageKey,
  normalizePaidContext,
  type VlmPaidAccessContext,
  type VlmPaidProductId,
} from "@/lib/commerce/pass2024-vlm-paid-access";

export function readVlmPaidAccessToken(productId: VlmPaidProductId, context: Partial<VlmPaidAccessContext>) {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(buildVlmPaidAccessStorageKey(productId, context)) || "";
  } catch {
    return "";
  }
}

export function writeVlmPaidAccessToken(productId: VlmPaidProductId, context: Partial<VlmPaidAccessContext>, token: string) {
  if (typeof window === "undefined" || !token) return false;
  try {
    window.localStorage.setItem(buildVlmPaidAccessStorageKey(productId, context), token);
    window.dispatchEvent(new CustomEvent("velmere:paid-access", { detail: { productId, context } }));
    return true;
  } catch {
    return false;
  }
}

export async function startVlmServiceCheckout(args: {
  productId: VlmPaidProductId;
  locale: string;
  context: Partial<VlmPaidAccessContext>;
}) {
  const context = normalizePaidContext(args.context, args.locale);
  const response = await fetch("/api/checkout/vlm-service", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ productId: args.productId, locale: args.locale, context }),
  });
  const payload = (await response.json()) as { ok?: boolean; url?: string; error?: string; details?: unknown };
  if (!response.ok || !payload.ok || !payload.url) {
    throw new Error(payload.error || "checkout_unavailable");
  }
  window.location.assign(payload.url);
}
