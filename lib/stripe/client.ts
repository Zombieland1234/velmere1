import { loadStripe } from "@stripe/stripe-js";

type StripeClient = Awaited<ReturnType<typeof loadStripe>>;
let stripePromise: Promise<StripeClient> | null = null;

export function getStripeClient() {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) return null;
  stripePromise ??= loadStripe(publishableKey);
  return stripePromise;
}
