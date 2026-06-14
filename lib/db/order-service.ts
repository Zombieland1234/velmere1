import type Stripe from "stripe";
import { getSupabaseServerClient, hasSupabaseConfig } from "@/lib/db/supabase";
import type { OrderLineItem } from "@/lib/orders/order-store";

export type PersistOrderItemInput = {
  productId: string;
  variantId?: string;
  selectedSize?: string;
  quantity: number;
  title?: string;
  unitAmount?: number | null;
  currency?: string | null;
  provider?: string | null;
  providerVariantId?: string | null;
};

export type PersistStripeOrderInput = {
  session: Stripe.Checkout.Session;
  locale?: string;
  walletAddress?: string | null;
  orderItems: PersistOrderItemInput[];
  fallbackOrder?: {
    id?: string;
    lineItems?: OrderLineItem[];
  } | null;
};


const memoryProcessedStripeEvents = new Set<string>();

export async function hasProcessedStripeWebhookEvent(eventId: string) {
  if (!eventId) return false;
  if (!hasSupabaseConfig()) return memoryProcessedStripeEvents.has(eventId);

  const supabase = getSupabaseServerClient();
  if (!supabase) return memoryProcessedStripeEvents.has(eventId);

  const { data, error } = await supabase
    .from("velmere_stripe_webhook_events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    console.warn("Stripe webhook idempotency lookup failed", error.message);
    return memoryProcessedStripeEvents.has(eventId);
  }

  return Boolean(data);
}

export async function markStripeWebhookEventProcessed(eventId: string, eventType: string) {
  if (!eventId) return;
  memoryProcessedStripeEvents.add(eventId);

  if (!hasSupabaseConfig()) return;
  const supabase = getSupabaseServerClient();
  if (!supabase) return;

  const { error } = await supabase
    .from("velmere_stripe_webhook_events")
    .upsert(
      {
        id: eventId,
        type: eventType,
        processed_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

  if (error) {
    console.warn("Stripe webhook idempotency write failed", error.message);
  }
}

function redactEmail(email?: string | null) {
  if (!email) return null;
  const [name, domain] = email.split("@");
  if (!domain) return "[redacted]";
  return `${name.slice(0, 2)}***@${domain}`;
}

function buildProductionLog(input: PersistStripeOrderInput, reason: string) {
  return {
    level: "warn",
    system: "velmere.checkout.webhook",
    event: "checkout.session.completed",
    persisted: false,
    reason,
    stripeSessionId: input.session.id,
    paymentStatus: input.session.payment_status,
    amountTotal: input.session.amount_total,
    currency: input.session.currency,
    walletAddress: input.walletAddress ? `${input.walletAddress.slice(0, 6)}…${input.walletAddress.slice(-4)}` : null,
    customer: {
      email: redactEmail(input.session.customer_details?.email),
      present: Boolean(input.session.customer_details),
    },
    itemCount: input.orderItems.length,
    productIds: input.orderItems.map((item) => item.productId),
    createdAt: new Date().toISOString(),
  };
}

export async function persistStripeCheckoutOrder(input: PersistStripeOrderInput) {
  if (!hasSupabaseConfig()) {
    const log = buildProductionLog(input, "Missing Supabase URL/service key. Order persistence skipped safely.");
    console.info(JSON.stringify(log, null, 2));
    return { persisted: false, log } as const;
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    const log = buildProductionLog(input, "Supabase client unavailable after config check.");
    console.info(JSON.stringify(log, null, 2));
    return { persisted: false, log } as const;
  }

  const session = input.session;
  const shippingDetails = (session as unknown as { shipping_details?: unknown; collected_information?: { shipping_details?: unknown } }).shipping_details
    ?? (session as unknown as { collected_information?: { shipping_details?: unknown } }).collected_information?.shipping_details
    ?? null;

  const { data: order, error: orderError } = await supabase
    .from("velmere_orders")
    .upsert(
      {
        stripe_session_id: session.id,
        status: session.payment_status === "paid" ? "paid" : "checkout_completed",
        locale: input.locale ?? session.metadata?.locale ?? "en",
        wallet_address: input.walletAddress ?? null,
        currency: session.currency?.toUpperCase() ?? null,
        amount_total: session.amount_total ?? 0,
        amount_subtotal: session.amount_subtotal ?? null,
        amount_tax: session.total_details?.amount_tax ?? null,
        customer_email: session.customer_details?.email ?? null,
        customer_name: session.customer_details?.name ?? null,
        customer_phone: session.customer_details?.phone ?? null,
        customer_details: session.customer_details ?? null,
        shipping_details: shippingDetails,
        billing_details: session.customer_details ?? null,
        metadata: session.metadata ?? {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stripe_session_id" },
    )
    .select("id")
    .single();

  if (orderError) throw orderError;

  const rows = input.orderItems.map((item, index) => ({
    order_id: order.id,
    line_index: index,
    product_id: item.productId,
    variant_id: item.variantId ?? null,
    selected_size: item.selectedSize ?? null,
    quantity: item.quantity,
    title: item.title ?? null,
    unit_amount: item.unitAmount ?? null,
    currency: item.currency?.toUpperCase() ?? session.currency?.toUpperCase() ?? null,
    provider: item.provider ?? null,
    provider_variant_id: item.providerVariantId ?? null,
    metadata: item,
  }));

  if (rows.length > 0) {
    await supabase.from("velmere_order_items").delete().eq("order_id", order.id);
    const { error: itemsError } = await supabase.from("velmere_order_items").insert(rows);
    if (itemsError) throw itemsError;
  }

  return { persisted: true, orderId: order.id } as const;
}
