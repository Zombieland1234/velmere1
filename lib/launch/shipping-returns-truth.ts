export type ShippingReturnsTruthStatus = "ready" | "partial" | "blocked" | "manual_review";

export type ShippingReturnsTruthItem = {
  id: string;
  label: string;
  route: string;
  status: ShippingReturnsTruthStatus;
  progress: number;
  sourceMode: "policy_draft" | "provider_manual" | "provider_api" | "missing" | "mixed";
  requiredBeforeCheckout: boolean;
  customerPromise: string;
  safetyBoundary: string;
  blockers: string[];
  nextStep: string;
};

export const shippingReturnsTruthMatrix: ShippingReturnsTruthItem[] = [
  {
    id: "shipping-regions",
    label: "Shipping regions",
    route: "/[locale]/legal/shipping",
    status: "manual_review",
    progress: 44,
    sourceMode: "provider_manual",
    requiredBeforeCheckout: true,
    customerPromise: "Customer must see where Velmère can ship before payment.",
    safetyBoundary: "No worldwide shipping promise until provider rates and blocked regions are verified.",
    blockers: ["provider rates", "blocked countries", "remote area handling", "delivery estimate source"],
    nextStep: "Connect provider rate snapshots and show region limits before checkout activation.",
  },
  {
    id: "shipping-costs",
    label: "Shipping costs",
    route: "/[locale]/checkout",
    status: "blocked",
    progress: 28,
    sourceMode: "missing",
    requiredBeforeCheckout: true,
    customerPromise: "Shipping cost must be known before the customer is asked to pay.",
    safetyBoundary: "No hidden delivery cost, no final total without shipping and tax calculation.",
    blockers: ["shipping rate engine", "tax handling", "currency rounding", "checkout total"],
    nextStep: "Block payment until shipping and tax totals are calculated from production sources.",
  },
  {
    id: "return-rights",
    label: "Return rights",
    route: "/[locale]/legal/returns",
    status: "partial",
    progress: 52,
    sourceMode: "policy_draft",
    requiredBeforeCheckout: true,
    customerPromise: "Customer must see return rights and exceptions before purchase.",
    safetyBoundary: "Return copy must not override consumer rights or hide exceptions.",
    blockers: ["final legal review", "provider exceptions", "custom product exception labels", "refund timing"],
    nextStep: "Finalize return policy with merchant/legal review and provider exception appendix.",
  },
  {
    id: "refund-flow",
    label: "Refund flow",
    route: "/[locale]/checkout",
    status: "blocked",
    progress: 24,
    sourceMode: "missing",
    requiredBeforeCheckout: true,
    customerPromise: "Refund timing and support path must be clear before payment.",
    safetyBoundary: "No payment launch until refund route, support contact and order status exist.",
    blockers: ["order state", "refund provider", "support mailbox", "customer notification"],
    nextStep: "Keep checkout blocked until order/refund state and customer notification exist.",
  },
  {
    id: "provider-exceptions",
    label: "Provider exceptions",
    route: "Printful / Contrado / Tapstitch",
    status: "manual_review",
    progress: 33,
    sourceMode: "mixed",
    requiredBeforeCheckout: true,
    customerPromise: "Customer must know when provider-specific returns, production or shipping limits apply.",
    safetyBoundary: "Provider exceptions must be surfaced as uncertainty until source-confirmed.",
    blockers: ["Printful exception source", "Tapstitch exception source", "Contrado exception source", "per-SKU labels"],
    nextStep: "Attach provider exception snapshots to SKU truth cards.",
  },
];

export function getShippingReturnsTruthSummary() {
  const total = shippingReturnsTruthMatrix.length;
  const averageProgress = Math.round(shippingReturnsTruthMatrix.reduce((sum, item) => sum + item.progress, 0) / total);
  const blocked = shippingReturnsTruthMatrix.filter((item) => item.status === "blocked");
  const review = shippingReturnsTruthMatrix.filter((item) => item.status === "manual_review");
  return {
    total,
    averageProgress,
    blockedCount: blocked.length,
    reviewCount: review.length,
    nextCriticalStep: blocked[0]?.nextStep ?? review[0]?.nextStep ?? shippingReturnsTruthMatrix[0]?.nextStep,
  };
}

export function getCheckoutBlockingShippingReturnsItems() {
  return shippingReturnsTruthMatrix.filter((item) => item.requiredBeforeCheckout && item.status !== "ready");
}
