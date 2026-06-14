"use client";

import { useTranslations } from "next-intl";
import { getStoreCheckoutReadiness } from "@/lib/checkout/readiness";

export default function CheckoutReadinessBanner() {
  const t = useTranslations("CheckoutReadiness");
  const readiness = getStoreCheckoutReadiness();

  if (readiness.enabled) return null;

  return (
    <p className="rounded-2xl border border-cyan-200/[0.12] bg-[#080b0f] px-4 py-3 text-xs leading-6 text-white/[0.56]" data-pass2005-checkout-readiness-banner="solid-cyan-no-glass">
      {t("customerPending")}
    </p>
  );
}
