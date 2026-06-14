import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/navigation";
import LuxurySection from "@/components/layout/LuxurySection";
import VlmServiceCheckoutSuccessClient from "@/components/checkout/VlmServiceCheckoutSuccessClient";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

type Props = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ session_id?: string; vlm_service?: string; return?: string }>;
};

export default async function CheckoutSuccessPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const t = await getTranslations({ locale, namespace: "Checkout" });
  const sessionId = resolvedSearchParams.session_id;
  const vlmService = resolvedSearchParams.vlm_service;
  const returnPath = resolvedSearchParams.return;
  const reference = sessionId ? `…${sessionId.slice(-10)}` : "unavailable";
  const labels = locale === "pl"
    ? { receipt: "Potwierdzenie zamówienia", status: "Oczekuje na weryfikację", reference: "Referencja", fulfilment: "Realizacja", fulfilmentValue: "Rozpocznie się po potwierdzeniu płatności", orderStatus: "Status", statusValue: "Weryfikacja płatności" }
    : locale === "de"
      ? { receipt: "Bestellbestätigung", status: "Prüfung ausstehend", reference: "Referenz", fulfilment: "Fulfilment", fulfilmentValue: "Beginnt nach Zahlungsbestätigung", orderStatus: "Status", statusValue: "Zahlungsprüfung" }
      : { receipt: "Order receipt", status: "Verification pending", reference: "Reference", fulfilment: "Fulfilment", fulfilmentValue: "Starts after payment confirmation", orderStatus: "Status", statusValue: "Payment verification" };

  return (
    <main className="min-h-[100dvh] bg-velmere-black text-white" data-pass2009-checkout-success="pending-verification-not-false-confirmed">
      <LuxurySection className="py-28 md:py-36">
        <section className="mx-auto max-w-3xl rounded-none border border-white/[0.10] bg-white/[0.025] p-0 text-center shadow-[0_40px_140px_rgba(0,0,0,0.55)]">
          <div className="border-b border-white/[0.10] px-6 py-4 font-mono text-[10px] uppercase tracking-[0.24em] text-white/[0.38] sm:flex sm:items-center sm:justify-between">
            <span>{labels.receipt}</span>
            <span className="tabular-nums">{labels.status}</span>
          </div>
          <div className="p-7 md:p-10">
            <CheckCircle2 className="mx-auto h-12 w-12 text-cyan-100/[0.78]" aria-hidden="true" />
            <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-100/[0.72]">{t("successKicker")}</p>
            <h1 className="mt-4 font-serif text-4xl tracking-[0.08em] text-white md:text-5xl">{t("successTitle")}</h1>
            <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-white/[0.56]">{t("successBody")}</p>

            <dl className="mx-auto mt-8 grid max-w-xl divide-y divide-white/[0.05] border-y border-white/[0.05] text-left font-mono text-[10px] uppercase tracking-[0.18em] text-white/[0.45]">
              <div className="grid gap-2 py-3 sm:grid-cols-[0.4fr_1fr]">
                <dt>{labels.reference}</dt>
                <dd className="break-all text-white/[0.72] tabular-nums">{reference}</dd>
              </div>
              <div className="grid gap-2 py-3 sm:grid-cols-[0.4fr_1fr]">
                <dt>{labels.fulfilment}</dt>
                <dd className="text-white/[0.72]">{labels.fulfilmentValue}</dd>
              </div>
              <div className="grid gap-2 py-3 sm:grid-cols-[0.4fr_1fr]">
                <dt>{labels.orderStatus}</dt>
                <dd className="text-cyan-100/[0.72]">{labels.statusValue}</dd>
              </div>
            </dl>

            <VlmServiceCheckoutSuccessClient
              locale={locale}
              sessionId={sessionId}
              productId={vlmService}
              returnPath={returnPath}
            />

            <Link
              href="/shop"
              data-magnetic
              className="velmere-button-primary mt-8 inline-flex"
            >
              {t("backToShop")}
            </Link>
          </div>
        </section>
      </LuxurySection>
    </main>
  );
}
