import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { buildVelmereMetadata, SUPPORTED_LOCALES } from "@/lib/seo/metadata";
import ShieldProClient from "@/components/market-integrity/ShieldProClient";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return buildVelmereMetadata({
    locale,
    path: "/shield-pro",
    title:
      locale === "pl"
        ? "Velmère Shield Pro — Zaawansowana Analiza Ryzyka"
        : locale === "de"
          ? "Velmère Shield Pro — Erweiterte Risikoanalyse"
          : "Velmère Shield Pro — Enhanced Risk Analysis",
    description:
      locale === "pl"
        ? "Zaawansowana analiza ryzyka w Shield Pro: głębsze wskaźniki, drugie źródło, pełna dowody."
        : locale === "de"
          ? "Erweiterte Risikoanalyse in Shield Pro: tiefere Indikatoren, zweite Quelle, vollständige Belege."
          : "Enhanced risk analysis in Shield Pro: deeper indicators, second-source verification, and full evidence fields.",
  });
}

export default async function ShieldProPage({ params }: PageProps) {
  const { locale } = await params;
  if (!SUPPORTED_LOCALES.includes(locale as (typeof SUPPORTED_LOCALES)[number])) {
    notFound();
  }
  setRequestLocale(locale);
  return <ShieldProClient locale={locale} />;
}
