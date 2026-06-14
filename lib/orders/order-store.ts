import type { Product } from "@/lib/products/types";

export type OrderStatus =
  | "draft"
  | "checkout_started"
  | "paid"
  | "fulfilment_pending"
  | "manual_fulfilment_required"
  | "fulfilment_created"
  | "fulfilled"
  | "cancelled"
  | "failed"
  | "refunded";

export type OrderLineItem = {
  productId: string;
  variantId: string;
  quantity: number;
  title: string;
  amount: number;
  currency: Product["price"]["currency"];
  provider: Product["provider"];
  fulfilmentMode: Product["fulfilmentMode"];
  providerVariantId?: string;
  selectedSize?: string;
};

export type OrderRecord = {
  id: string;
  status: OrderStatus;
  locale: string;
  cartHash: string;
  stripeSessionId?: string;
  lineItems: OrderLineItem[];
  createdAt: string;
  updatedAt: string;
  logs: string[];
  walletAddress?: string;
};

const orders = new Map<string, OrderRecord>();
const sessions = new Map<string, string>();

function now() {
  return new Date().toISOString();
}

function write(order: OrderRecord, status: OrderStatus, log: string) {
  const updated: OrderRecord = {
    ...order,
    status,
    updatedAt: now(),
    logs: [...order.logs, `${now()} ${log}`],
  };
  orders.set(updated.id, updated);
  if (updated.stripeSessionId) sessions.set(updated.stripeSessionId, updated.id);
  return updated;
}

export function createOrderDraft(input: {
  locale: string;
  cartHash: string;
  lineItems: OrderLineItem[];
  walletAddress?: string;
}) {
  const id = `ord_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const order: OrderRecord = {
    id,
    status: "draft",
    locale: input.locale,
    cartHash: input.cartHash,
    lineItems: input.lineItems,
    createdAt: now(),
    updatedAt: now(),
    logs: [`${now()} order draft created`],
    walletAddress: input.walletAddress,
  };
  orders.set(id, order);
  return order;
}

export function markCheckoutStarted(orderDraftId: string, stripeSessionId: string) {
  const order = orders.get(orderDraftId);
  if (!order) return null;
  return write({ ...order, stripeSessionId }, "checkout_started", `checkout session ${stripeSessionId} started`);
}

export function markPaid(orderDraftId: string, stripeSessionId?: string) {
  const order = orders.get(orderDraftId) ?? (stripeSessionId ? orders.get(sessions.get(stripeSessionId) ?? "") : undefined);
  if (!order) return null;
  return write({ ...order, stripeSessionId: stripeSessionId ?? order.stripeSessionId }, "paid", "payment confirmed");
}

export function markFulfilmentPending(orderDraftId: string) {
  const order = orders.get(orderDraftId);
  if (!order) return null;
  return write(order, "fulfilment_pending", "fulfilment pending");
}

export function markFulfilled(orderDraftId: string) {
  const order = orders.get(orderDraftId);
  if (!order) return null;
  return write(order, "fulfilled", "order fulfilled");
}

export function markFailed(orderDraftId: string, reason = "order failed") {
  const order = orders.get(orderDraftId);
  if (!order) return null;
  return write(order, "failed", reason);
}

export function getOrder(orderDraftId: string) {
  return orders.get(orderDraftId) ?? null;
}
