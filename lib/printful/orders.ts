import type Stripe from "stripe";
import type { OrderRecord } from "@/lib/orders/order-store";
import { printfulRequest } from "./client";

function getRecipient(session: Stripe.Checkout.Session) {
  const details = session.customer_details;
  const address = details?.address;
  if (!details?.name || !address?.line1 || !address?.country) return null;

  return {
    name: details.name,
    email: details.email ?? undefined,
    address1: address.line1,
    address2: address.line2 ?? undefined,
    city: address.city ?? undefined,
    state_code: address.state ?? undefined,
    country_code: address.country,
    zip: address.postal_code ?? undefined,
  };
}

export async function createPrintfulOrderDraft(order: OrderRecord, session: Stripe.Checkout.Session) {
  const recipient = getRecipient(session);
  if (!recipient) {
    return {
      created: false,
      warning: "Stripe session does not include a complete shipping recipient for Printful.",
    };
  }

  const items = order.lineItems
    .filter((item) => item.provider === "printful" && item.fulfilmentMode === "automatic" && item.providerVariantId)
    .map((item) => ({
      sync_variant_id: Number(item.providerVariantId),
      quantity: item.quantity,
      retail_price: (item.amount / 100).toFixed(2),
    }));

  if (items.length === 0) {
    return {
      created: false,
      warning: "No Printful automatic fulfilment line items were found.",
    };
  }

  const confirm = process.env.PRINTFUL_CONFIRM_ORDERS === "true";
  const result = await printfulRequest<{ result: { id: number; status?: string } }>(`/orders?confirm=${confirm ? "true" : "false"}`, {
    method: "POST",
    body: {
      external_id: order.id,
      recipient,
      items,
      packing_slip: {
        email: recipient.email,
        message: "Velmère order received.",
      },
    },
  });

  return {
    created: true,
    confirm,
    printfulOrderId: result.result.id,
    status: result.result.status,
  };
}
