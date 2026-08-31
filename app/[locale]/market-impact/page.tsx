import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { buildVelmereMetadata, SUPPORTED_LOCALES } from "@/lib/seo/metadata";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return buildVelmereMetadata({
    locale,
    path: "/market-impact",
    title: "Velmère Market Impact — Stress Test & Liquidity Analysis",
    description:
      locale === "pl"
        ? "Analiza wpływu rynkowego: testy stress, płynność, symulacje slippage, impact large orders."
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
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-white mb-4">Market Impact Analysis</h1>
      <p className="text-sm text-zinc-400 mb-6">
        Stress tests, liquidity analysis, slippage simulations, and large order impact estimation.
      </p>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <p className="text-zinc-300 text-sm">
          Enter a token symbol or address to analyze market impact. This product provides stress testing,
          liquidity depth analysis, slippage estimation, and large order impact modeling.
        </p>
      </div>
    </main>
  );
}
