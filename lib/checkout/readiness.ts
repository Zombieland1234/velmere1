import { hasCompleteAutomaticFulfilment } from "@/lib/products/catalog";
import type { Product } from "@/lib/products/types";

export type CheckoutReadinessReason = {
  code: string;
  message: string;
};

export type CheckoutReadiness = {
  enabled: boolean;
  reasons: CheckoutReadinessReason[];
};

function hasEnv(name: string) {
  return Boolean(process.env[name]);
}

function flagEnabled(name: string) {
  return process.env[name] === "true";
}

export function getStoreCheckoutReadiness(product?: Product): CheckoutReadiness {
  const reasons: CheckoutReadinessReason[] = [];

  if (process.env.CHECKOUT_MODE !== "stripe") {
    reasons.push({ code: "checkout_mode", message: "CHECKOUT_MODE must be stripe." });
  }
  if (!hasEnv("STRIPE_SECRET_KEY")) {
    reasons.push({ code: "stripe_secret", message: "STRIPE_SECRET_KEY is missing." });
  }
  if (!hasEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY")) {
    reasons.push({ code: "stripe_publishable", message: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing." });
  }
  if (!hasEnv("STRIPE_WEBHOOK_SECRET")) {
    reasons.push({ code: "stripe_webhook", message: "STRIPE_WEBHOOK_SECRET is missing." });
  }
  if (!hasEnv("NEXT_PUBLIC_SITE_URL")) {
    reasons.push({ code: "site_url", message: "NEXT_PUBLIC_SITE_URL is required for redirects." });
  }
  if (!flagEnabled("STORE_COMMERCIAL_READY")) {
    reasons.push({ code: "commercial_ready", message: "STORE_COMMERCIAL_READY must be true." });
  }
  if (!flagEnabled("STORE_SELLER_ADDRESS_READY")) {
    reasons.push({ code: "seller_address", message: "Full seller address must be finalized." });
  }
  if (!flagEnabled("STORE_SHIPPING_RATES_READY")) {
    reasons.push({ code: "shipping_rates", message: "Shipping rates must be configured." });
  }
  if (!flagEnabled("STORE_RETURNS_POLICY_FINAL")) {
    reasons.push({ code: "returns_policy", message: "Returns policy must be final." });
  }
  if (!flagEnabled("STORE_PRIVACY_POLICY_FINAL")) {
    reasons.push({ code: "privacy_policy", message: "Privacy policy must be final." });
  }
  if (!flagEnabled("STORE_TAX_READY")) {
    reasons.push({ code: "tax_ready", message: "Tax/VAT handling must be finalized." });
  }
  if (!flagEnabled("STORE_FULFILMENT_READY")) {
    reasons.push({ code: "fulfilment_ready", message: "Fulfilment workflow must be production-ready." });
  }

  if (product) {
    if (product.status !== "active") {
      reasons.push({ code: "product_status", message: "Product must be active." });
    }
    if (product.price.amount <= 0) {
      reasons.push({ code: "product_price", message: "Product price must be real." });
    }
    if (product.variants.length === 0) {
      reasons.push({ code: "product_variants", message: "Product variants are required." });
    }
    if (product.images.length === 0) {
      reasons.push({ code: "product_images", message: "Product images are required." });
    }
    if (!hasCompleteAutomaticFulfilment(product)) {
      reasons.push({ code: "provider_mapping", message: "Automatic fulfilment requires provider variant mapping." });
    }
  }

  return {
    enabled: reasons.length === 0,
    reasons,
  };
}
