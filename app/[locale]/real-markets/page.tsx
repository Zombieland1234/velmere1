import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import CrossAssetCollapseRadarPanel from "@/components/market-integrity/CrossAssetCollapseRadarPanel";
import { buildVelmereMetadata, SUPPORTED_LOCALES } from "@/lib/seo/metadata";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return buildVelmereMetadata({
    locale,
    path: "/real-markets",
    title: "Velmère Real Markets",
    description:
      locale === "pl"
        ? "Czysta tabela Real Markets dla akcji, FX, ETF, surowców, nieruchomości, giełd i rytmu źródeł."
        : locale === "de"
          ? "Clean Real Markets Tabelle für Aktien, FX, ETFs, Rohstoffe, Immobilien, Börsen und Quellenrhythmus."
          : "Clean Real Markets table for stocks, FX, ETFs, commodities, real estate, exchanges and source rhythm.",
  });
}

export default async function RealMarketsPage({ params }: PageProps) {
  const { locale } = await params;
  if (!SUPPORTED_LOCALES.includes(locale as (typeof SUPPORTED_LOCALES)[number])) {
    notFound();
  }
  setRequestLocale(locale);

  return (
    <main
      className="shield-typography-root bg-velmere-black px-5 py-24 text-velmere-ivory md:px-10 md:py-32"
      data-pass874-short-route="real-markets"
      data-pass874-route-alias="/real-markets"
    >
      <section className="mx-auto max-w-[108rem]">
        <CrossAssetCollapseRadarPanel locale={locale} />
      </section>
    </main>
  );
}
