import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { buildVelmereMetadata, SUPPORTED_LOCALES } from "@/lib/seo/metadata";
import RiskIndicatorClient from "@/components/market-integrity/RiskIndicatorClient";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return buildVelmereMetadata({
    locale,
    path: "/risk-indicator",
    title:
      locale === "pl"
        ? "Velmère Wskaźnik Ryzyka — Scoring i Alerty"
        : locale === "de"
          ? "Velmère Risiko-Indikator — Scoring & Alerts"
          : "Velmère Risk Indicator — Scoring & Alerts",
    description:
      locale === "pl"
        ? "Zaawansowane wskaźniki ryzyka: scoring, klasyfikacja, alerty, analiza trendów."
        : locale === "de"
          ? "Fortgeschrittene Risikoindikatoren: Scoring, Klassifizierung, Alerts, Trendanalyse."
          : "Advanced risk indicators: scoring, classification, alerts, trend analysis.",
  });
}

export default async function RiskIndicatorPage({ params }: PageProps) {
  const { locale } = await params;
  if (!SUPPORTED_LOCALES.includes(locale as (typeof SUPPORTED_LOCALES)[number])) {
    notFound();
  }
  setRequestLocale(locale);
  return <RiskIndicatorClient locale={locale} />;
}
