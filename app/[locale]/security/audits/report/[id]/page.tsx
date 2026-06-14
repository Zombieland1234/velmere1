import type { Metadata } from "next";
import SecurityAuditReportPage from "@/components/security/SecurityAuditReportPage";
import { buildAuditReportById } from "@/lib/security/pass1614-audit-report-queue";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }): Promise<Metadata> {
  const { locale, id } = await params;
  const record = buildAuditReportById(id, locale);
  return {
    title: `${record.projectName} · Velmère Audit Report Status`,
    description: "Velmère Audit Watch public status page with request ID, confidence cap, Lens PDF hook, Shield Map graph and publication boundaries.",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function SecurityAuditReportStatusPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  return <SecurityAuditReportPage locale={locale} id={id} />;
}
