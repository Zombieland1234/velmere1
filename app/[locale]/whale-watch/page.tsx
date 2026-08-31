import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { buildVelmereMetadata, SUPPORTED_LOCALES } from "@/lib/seo/metadata";
import WhaleWatchClient from "@/components/market-integrity/WhaleWatchClient";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return buildVelmereMetadata({
    locale,
    path: "/whale-watch",
    title:
      locale === "pl"
        ? "Velmère Whale Watch — Śledzenie Holderów i Koncentracja"
        : locale === "de"
          ? "Velmère Whale Watch — Holder-Tracking & Konzentration"
          : "Velmère Whale Watch — Holder Tracking & Concentration",
    description:
      locale === "pl"
        ? "Śledzenie wielorybów: koncentracja holdingów, odblokowania, presja sell-side, clustering."
        : locale === "de"
          ? "Wale-Tracking: Holdings-Konzentration, Entsperrungen, Verkaufsdruck, Clustering."
          : "Whale tracking: holding concentration, unlocks, sell-side pressure, clustering.",
  });
}

export default async function WhaleWatchPage({ params }: PageProps) {
  const { locale } = await params;
  if (!SUPPORTED_LOCALES.includes(locale as (typeof SUPPORTED_LOCALES)[number])) {
    notFound();
  }
  setRequestLocale(locale);
  return <WhaleWatchClient locale={locale} />;
}
