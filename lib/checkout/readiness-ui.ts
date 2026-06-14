import { getStoreCheckoutReadiness } from "@/lib/checkout/readiness";

export function getCheckoutReadinessLabels() {
  const readiness = getStoreCheckoutReadiness();
  return {
    enabled: readiness.enabled,
    codes: readiness.reasons.map((reason) => reason.code),
  };
}
