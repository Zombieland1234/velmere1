import { hasCompleteAutomaticFulfilment } from "@/lib/products/catalog";
import type { Product } from "@/lib/products/types";

export type ProductReadinessReason = {
  code: string;
  message: string;
};

export type ProductReadiness = {
  ready: boolean;
  reasons: ProductReadinessReason[];
};

function hasLocalizedText(value: { pl: string; en: string; de: string } | undefined) {
  return Boolean(value?.pl?.trim() && value?.en?.trim() && value?.de?.trim());
}

export function getProductLaunchReadiness(product: Product): ProductReadiness {
  const reasons: ProductReadinessReason[] = [];

  if (!hasLocalizedText(product.title)) {
    reasons.push({ code: "title", message: "Product title is required in PL/EN/DE." });
  }
  if (product.images.length === 0) {
    reasons.push({ code: "images", message: "At least one product image is required." });
  }
  if (product.variants.length === 0) {
    reasons.push({ code: "variants", message: "At least one size/variant is required." });
  }
  if (product.price.amount <= 0 || product.price.currency !== "EUR") {
    reasons.push({ code: "price", message: "EUR price must be set before publish." });
  }
  if (!hasLocalizedText(product.shortDescription)) {
    reasons.push({ code: "description", message: "Short description is required in PL/EN/DE." });
  }
  if (product.provider === "manual" && product.fulfilmentMode === "disabled") {
    reasons.push({ code: "provider", message: "Printful or Tapstitch provider mapping is required." });
  }
  if (product.fulfilmentMode === "automatic" && !hasCompleteAutomaticFulfilment(product)) {
    reasons.push({ code: "fulfilment", message: "Automatic fulfilment requires complete provider variant mapping." });
  }

  return { ready: reasons.length === 0, reasons };
}

export function canPublishProduct(product: Product) {
  return getProductLaunchReadiness(product).ready;
}
