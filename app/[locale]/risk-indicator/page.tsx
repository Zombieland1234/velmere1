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
    path: "/risk-indicator",
    title: "Velmère Risk Indicator — Scoring & Alerts",
    description:
      locale === "pl"
        ? "Zaawansowane wskaźniki ryzyka: scoring, klasyfikacja, alerty, trend analysis."
        : locale === "de"
          ? "Fortgeschrittene Risikoindikatoren: Scoring, Klassifizierung, Alerts."
          : "Advanced risk indicators: scoring, classification, alerts, trend analysis.",
  });
}

export default async function RiskIndicatorPage({ params }: PageProps) {
  const { locale } = await params;
  if (!SUPPORTED_LOCALES.includes(locale as (typeof SUPPORTED_LOCALES)[number])) {
    notFound();
  }
  setRequestLocale(locale);
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-white mb-4">Risk Indicator</h1>
      <p className="text-sm text-zinc-400 mb-6">
        Advanced risk scoring, classification, alerts, and trend analysis.
      </p>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <p className="text-zinc-300 text-sm">
          Enter a token symbol or address to view risk indicators. This product provides composite
          risk scoring, multi-factor classification, alert generation, and trend analysis.
        </p>
      </div>
    </main>
  );
}
