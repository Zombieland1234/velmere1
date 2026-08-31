import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { buildVelmereMetadata, SUPPORTED_LOCALES } from "@/lib/seo/metadata";
import MarketImpactClient from "@/components/market-integrity/MarketImpactClient";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return buildVelmereMetadata({
    locale,
    path: "/market-impact",
    title:
      locale === "pl"
        ? "Velmère Analiza Wpływu Rynkowego — Stress Test i Płynność"
        : locale === "de"
          ? "Velmère Markt-Impact — Stress-Test & Liquiditätsanalyse"
          : "Velmère Market Impact — Stress Test & Liquidity Analysis",
    description:
      locale === "pl"
        ? "Analiza wpływu rynkowego: testy stress, płynność, symulacje slippage, wpływ large orders."
        : locale === "de"
          ? "Markt-Impact-Analyse: Stress-Tests, Liquidität, Slippage-Simulationen."
          : "Market impact analysis: stress tests, liquidity, slippage simulations, large order impact.",
  });
}

export default async function MarketImpactPage({ params }: PageProps) {
  const { locale } = await params;
  if (!SUPPORTED_LOCALES.includes(locale as (typeof SUPPORTED_LOCALES)[number])) {
    notFound();
  }
  setRequestLocale(locale);
  return <MarketImpactClient locale={locale} />;
}
