import type { Metadata } from "next";
import SecurityAuditWatchPage from "@/components/security/SecurityAuditWatchPage";

export const metadata: Metadata = {
  title: "Velmère Audit",
  description:
    "Velmère Basic Audit and Advanced human-reviewed audit flow with VLM Brain, clean intake, client account messages and signed security review boundaries.",
};

export default async function SecurityAuditsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <SecurityAuditWatchPage locale={locale} />;
}
