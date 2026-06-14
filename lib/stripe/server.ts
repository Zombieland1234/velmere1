import Stripe from "stripe";

let cachedStripe: Stripe | null = null;

export function getStripeServerClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY on server.");
  }

  cachedStripe ??= new Stripe(secretKey);
  return cachedStripe;
}
