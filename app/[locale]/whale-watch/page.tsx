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
    path: "/whale-watch",
    title: "Velmère Whale Watch — Holder Tracking & Concentration",
    description:
      locale === "pl"
        ? "Śledzenie wielorybów: koncentracja holdingów, odblokowania, presja sell-side, clustering."
        : locale === "de"
          ? "Wale-Tracking: Holdings-Konzentration, Entsperrungen, Verkaufsdruck."
          : "Whale tracking: holding concentration, unlocks, sell-side pressure, clustering.",
  });
}

export default async function WhaleWatchPage({ params }: PageProps) {
  const { locale } = await params;
  if (!SUPPORTED_LOCALES.includes(locale as (typeof SUPPORTED_LOCALES)[number])) {
    notFound();
  }
  setRequestLocale(locale);
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-white mb-4">Whale Watch</h1>
      <p className="text-sm text-zinc-400 mb-6">
        Holder tracking, concentration analysis, unlock schedules, and sell-side pressure estimation.
      </p>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <p className="text-zinc-300 text-sm">
          Enter a token symbol or address to analyze whale activity. This product provides holder
          concentration analysis, unlock schedules, sell pressure estimation, and wallet clustering.
        </p>
      </div>
    </main>
  );
}
