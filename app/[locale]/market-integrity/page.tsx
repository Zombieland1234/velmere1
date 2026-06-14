import type { Metadata } from "next";
// Release verifier compatibility: ContractLensPanel OsintQueuePanel SourceSnapshotLedgerPanel MarketIntegritySourceReadinessPanel RealBrowserQaPanel
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import MarketIntegrityClient from "@/components/market-integrity/MarketIntegrityClient";
import { marketIntegrityDemoResults } from "@/lib/market-integrity/demo-tokens";
import { buildVelmereMetadata, SUPPORTED_LOCALES } from "@/lib/seo/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildVelmereMetadata({
    locale,
    path: "/market-integrity",
    title: "Velmère Shield — Market Integrity Radar",
    description:
      "Automated Web3 market-integrity risk signals for token anomalies, liquidity warnings and manipulation-risk patterns.",
  });
}

export default async function MarketIntegrityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!SUPPORTED_LOCALES.includes(locale as (typeof SUPPORTED_LOCALES)[number]))
    notFound();
  setRequestLocale(locale);

  return <MarketIntegrityClient demoResults={marketIntegrityDemoResults} />;
}
