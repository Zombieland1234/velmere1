import { NextResponse } from "next/server";
import {
  buildAuditReportById,
  buildAuditReportPdfManifest,
  buildAuditReportPublicPage,
  buildAuditReportQueue,
  PASS1614_AUDIT_REPORT_QUEUE_ID,
} from "@/lib/security/pass1614-audit-report-queue";
import {
  buildAuditReportExportPayload,
  PASS1654_AUDIT_PDF_SHIELD_EXPORT_ID,
} from "@/lib/security/pass1654-audit-pdf-shield-export";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id") ?? "sample";
  const locale = url.searchParams.get("locale") ?? "en";
  const format = url.searchParams.get("format") ?? "status";

  const record = buildAuditReportById(id, locale);
  const manifest = buildAuditReportPdfManifest(id, locale);
  const exportPayload = buildAuditReportExportPayload(id, locale);

  return NextResponse.json({
    ok: true,
    surface: "velmere-audit-report-status",
    format,
    record,
    page: buildAuditReportPublicPage(locale, id),
    manifest,
    exportPayload,
    lensPdfPayload: exportPayload.pdf,
    shieldMapPayload: exportPayload.shieldMap,
    queue: format === "queue" ? buildAuditReportQueue(locale) : undefined,
  }, {
    headers: {
      "x-velmere-audit-report-queue": PASS1614_AUDIT_REPORT_QUEUE_ID,
      "x-velmere-audit-report-id": record.reportId,
      "x-velmere-audit-pdf-shield-export": PASS1654_AUDIT_PDF_SHIELD_EXPORT_ID,
      "x-velmere-audit-no-certified-safe": "true",
      "x-velmere-audit-no-exploit-instructions": "true",
    },
  });
}
