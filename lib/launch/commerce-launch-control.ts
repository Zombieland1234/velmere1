export type CommerceLaunchControlItem = {
  id: string;
  label: string;
  route: string;
  progress: number;
  status: "ready" | "partial" | "blocked" | "launch_control";
  customerPromise: string;
  safetyBoundary: string;
  launchBlockers: string[];
  nextBuildStep: string;
};

export const commerceLaunchControl: CommerceLaunchControlItem[] = [
  {
    id: "catalogue",
    label: "Shop catalogue",
    route: "/[locale]/shop",
    progress: 67,
    status: "partial",
    customerPromise: "Products are browseable with honest states: preview, available, sold out or provider pending.",
    safetyBoundary: "No fake stock, fake discount, fake scarcity or hidden delivery cost.",
    launchBlockers: ["provider availability", "final product media", "stock state", "shipping policy links"],
    nextBuildStep: "Show clear launch state on every product card and connect final provider truth before checkout.",
  },
  {
    id: "product-detail",
    label: "Product detail pages",
    route: "/[locale]/shop/[id]",
    progress: 67,
    status: "partial",
    customerPromise: "Customer sees material, size, delivery limits, return rights and provider truth before purchase.",
    safetyBoundary: "No checkout CTA should imply fulfilment is ready until SKU, tax, shipping and order state are wired.",
    launchBlockers: ["provider SKU mapping", "size proof", "delivery estimates", "return policy link", "checkout state"],
    nextBuildStep: "Add provider truth badges and keep checkout disabled if any required product truth is missing.",
  },
  {
    id: "cart",
    label: "Cart",
    route: "/[locale]/cart",
    progress: 36,
    status: "launch_control",
    customerPromise: "Cart can collect items but clearly tells the customer when checkout is not production enabled.",
    safetyBoundary: "Cart must not hide shipping, taxes, delivery or return rights behind a final payment button.",
    launchBlockers: ["tax calculation", "shipping calculation", "payment provider", "order confirmation"],
    nextBuildStep: "Keep checkout unavailable notice visible until provider checkout, tax and shipping are verified.",
  },
  {
    id: "checkout",
    label: "Checkout",
    route: "/[locale]/checkout",
    progress: 34,
    status: "blocked",
    customerPromise: "Checkout must only open when totals, tax, shipping, payment, order confirmation and refunds are real.",
    safetyBoundary: "No payment flow, card entry or unverified order confirmation may appear before production wiring.",
    launchBlockers: ["payment provider", "tax rules", "shipping rates", "order state", "refund/return flow", "merchant review"],
    nextBuildStep: "Shipping/returns truth matrix now exists. Payment/order state matrix now exists; next connect provider checkout, tax engine, order database, signed webhooks and refund provider.",
  },
  {
    id: "fulfillment",
    label: "Fulfillment provider truth",
    route: "Printful / Contrado / Tapstitch",
    progress: 39,
    status: "blocked",
    customerPromise: "Every product must map to a real provider SKU, production time, region and delivery limit.",
    safetyBoundary: "Do not promise availability, delivery date or material until a provider source proves it.",
    launchBlockers: ["SKU mapping", "provider source snapshot", "production time", "shipping regions", "return exceptions"],
    nextBuildStep: "Provider truth ledger now exists; next wire product-level SKU snapshots and source labels into product cards.",
  },
  {
    id: "admin-import",
    label: "Admin import products",
    route: "/[locale]/admin/import-products",
    progress: 41,
    status: "blocked",
    customerPromise: "Import tools stay private and never become public customer surfaces.",
    safetyBoundary: "Admin route must be gated, disabled or environment-protected before public launch.",
    launchBlockers: ["admin auth", "environment gate", "import audit log", "publish permission"],
    nextBuildStep: "Add admin route launch notice and guard so product import cannot be mistaken for a public feature.",
  },
];

export function getCommerceLaunchControlSummary() {
  const total = commerceLaunchControl.length;
  const averageProgress = Math.round(commerceLaunchControl.reduce((sum, item) => sum + item.progress, 0) / total);
  const blocked = commerceLaunchControl.filter((item) => item.status === "blocked");
  const launchControl = commerceLaunchControl.filter((item) => item.status === "launch_control");
  return {
    total,
    averageProgress,
    blockedCount: blocked.length,
    launchControlCount: launchControl.length,
    nextCriticalStep: blocked[0]?.nextBuildStep ?? launchControl[0]?.nextBuildStep ?? commerceLaunchControl[0]?.nextBuildStep,
  };
}
