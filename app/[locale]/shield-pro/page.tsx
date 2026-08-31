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
    path: "/shield-pro",
    title: "Velmère Shield Pro — Enhanced Risk Analysis",
    description:
      locale === "pl"
        ? "Zaawansowana analiza risk w Shield Pro: głębsze wskaźniki, drugie źródło, full evidence."
        : locale === "de"
          ? "Erweiterte Risikoanalyse in Shield Pro: tiefere Indikatoren, zweite Quelle."
          : "Enhanced risk analysis in Shield Pro: deeper indicators, second source, full evidence.",
  });
}

export default async function ShieldProPage({ params }: PageProps) {
  const { locale } = await params;
  if (!SUPPORTED_LOCALES.includes(locale as (typeof SUPPORTED_LOCALES)[number])) {
    notFound();
  }
  setRequestLocale(locale);
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-white mb-4">Shield Pro</h1>
      <p className="text-sm text-zinc-400 mb-6">
        Enhanced risk analysis with deeper indicators, second-source verification, and full evidence fields.
      </p>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <p className="text-zinc-300 text-sm">
          Shield Pro provides enhanced risk analysis with deeper VLM Brain integration, second-source
          verification, and expanded evidence fields. Available in Basic, Pro, and Advanced tiers.
        </p>
      </div>
    </main>
  );
}
