import type { Metadata } from "next";
import SecurityTrustPage from "@/components/security/SecurityTrustPage";

export const metadata: Metadata = {
  title: "Velmère Security",
  description: "Security-first architecture, API Abuse Shield, rate limits, admin gate, event ledger and protected export boundaries for Velmère.",
};

export default async function SecurityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <SecurityTrustPage locale={locale} />;
}
