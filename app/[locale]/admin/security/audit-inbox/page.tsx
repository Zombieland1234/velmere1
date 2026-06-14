import type { Metadata } from "next";
import SecurityAuditAdminInbox from "@/components/security/SecurityAuditAdminInbox";
import SecurityConsoleLockedPanel from "@/components/admin/SecurityConsoleLockedPanel";
import { buildSecurityAdminGateReadiness } from "@/lib/security/security-admin-auth";

export const metadata: Metadata = {
  title: "Velmère Audit Review Inbox",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminSecurityAuditInboxPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const gate = buildSecurityAdminGateReadiness();

  if (!gate.consoleVisible) {
    return <SecurityConsoleLockedPanel locale={locale} />;
  }

  return <SecurityAuditAdminInbox locale={locale} />;
}
