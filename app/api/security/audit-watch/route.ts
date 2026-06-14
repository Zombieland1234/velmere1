import { NextResponse } from "next/server";
import {
  buildAuditWatchAssessment,
  buildAuditWatchPage,
  type AuditWatchSubmission,
} from "@/lib/security/pass1494-audit-watch";
import {
  buildAuditReviewFlow,
  buildAuditVerificationPreview,
  normalizeAuditReviewSubmission,
  PASS1534_AUDIT_REVIEW_FLOW_ID,
  type AuditReviewSubmission,
} from "@/lib/security/pass1534-audit-review-flow";
import {
  buildAuditSampleReport,
  PASS1574_AUDIT_SAMPLE_REPORT_ID,
} from "@/lib/security/pass1574-audit-sample-report";
import {
  buildAuditReportQueueRecord,
  buildAuditReportQueue,
  PASS1614_AUDIT_REPORT_QUEUE_ID,
} from "@/lib/security/pass1614-audit-report-queue";
import {
  buildAuditReportExportPayload,
  PASS1654_AUDIT_PDF_SHIELD_EXPORT_ID,
} from "@/lib/security/pass1654-audit-pdf-shield-export";
import {
  buildAuditBusinessFlow,
  buildAuditLeadCapturePacket,
  PASS1694_AUDIT_BUSINESS_FLOW_ID,
} from "@/lib/security/pass1694-audit-business-flow";
import {
  buildAuditRegistryApiPayload,
  buildAuditRegistryDashboard,
  PASS1894_AUDIT_PUBLIC_REGISTRY_ID,
} from "@/lib/security/pass1894-audit-public-registry";
import {
  buildVlmAuditAccountMessage,
  buildVlmAuditProductPage,
  PASS2023_VLM_AUDIT_PRODUCT_ID,
} from "@/lib/security/pass2023-vlm-audit-product";
import { getVlmPaidProduct, normalizePaidContext } from "@/lib/commerce/pass2024-vlm-paid-access";
import { verifyVlmPaidAccessEntitlement } from "@/lib/commerce/pass2025-vlm-entitlement-ledger";

export const dynamic = "force-dynamic";

export async function GET() {
  const sample: AuditReviewSubmission = {
    projectName: "Velmère sample token",
    contractAddress: "0x0000000000000000000000000000000000000000",
    chain: "ethereum",
    auditUrl: "https://example.com/public-audit.pdf",
    website: "https://example.com",
    docsUrl: "https://docs.example.com",
    reviewLevel: "basic_review",
  };

  return NextResponse.json({
    ok: true,
    surface: "velmere-security-audit-watch",
    page: buildAuditWatchPage("en"),
    flow: buildAuditReviewFlow("en"),
    samplePreview: buildAuditVerificationPreview(sample),
    sampleReport: buildAuditSampleReport("en"),
    sampleReportRoute: "/en/security/audits/sample",
    sampleStatusRoute: "/en/security/audits/report/sample",
    sampleExportRoute: "/en/security/audits/export/sample",
    sampleExportPayload: buildAuditReportExportPayload("sample", "en"),
    businessFlow: buildAuditBusinessFlow("en"),
    pricingRoute: "/en/security/audits/pricing",
    registryRoute: "/en/security/audits/registry",
    registry: buildAuditRegistryDashboard("en"),
    registryPayload: buildAuditRegistryApiPayload("en"),
    reportQueue: buildAuditReportQueue("en"),
    vlmAuditProduct: buildVlmAuditProductPage("en"),
    boundary: [
      "passive public review",
      "no custody",
      "no seed phrases",
      "no investment advice",
      "no unauthorized active testing",
      "no exploit instructions",
    ],
  }, {
    headers: {
      "x-velmere-audit-review-flow": PASS1534_AUDIT_REVIEW_FLOW_ID,
      "x-velmere-audit-sample-report": PASS1574_AUDIT_SAMPLE_REPORT_ID,
      "x-velmere-audit-report-queue": PASS1614_AUDIT_REPORT_QUEUE_ID,
      "x-velmere-audit-pdf-shield-export": PASS1654_AUDIT_PDF_SHIELD_EXPORT_ID,
      "x-velmere-audit-business-flow": PASS1694_AUDIT_BUSINESS_FLOW_ID,
      "x-velmere-audit-public-registry": PASS1894_AUDIT_PUBLIC_REGISTRY_ID,
      "x-velmere-vlm-audit-product": PASS2023_VLM_AUDIT_PRODUCT_ID,
    },
  });
}

export async function POST(request: Request) {
  let payload: AuditReviewSubmission & { locale?: string } = {};
  try {
    payload = (await request.json()) as AuditReviewSubmission & { locale?: string };
  } catch {
    payload = {};
  }

  const locale = payload.locale === "pl" || payload.locale === "de" || payload.locale === "en" ? payload.locale : "en";
  const normalized = normalizeAuditReviewSubmission(payload);
  if (normalized.reviewLevel === "advanced_review") {
    const paidContext = normalizePaidContext({
      surface: "audit",
      locale,
      assetId: normalized.contractAddress || normalized.auditUrl || normalized.projectName || "audit-request",
      symbol: normalized.projectName,
      depth: "advanced",
      returnPath: `/${locale}/security/audits`,
    }, locale);
    const paidAccess = await verifyVlmPaidAccessEntitlement({
      token: request.headers.get("x-velmere-paid-access"),
      productId: "vlm_advanced_audit_human_review",
      context: paidContext,
    });
    if (!paidAccess.ok) {
      return NextResponse.json({
        ok: false,
        error: "payment_required",
        product: getVlmPaidProduct("vlm_advanced_audit_human_review", locale),
        context: paidContext,
        reason: paidAccess.error,
        ledgerMode: paidAccess.ledgerMode,
      }, { status: 402, headers: { "x-velmere-paid-access-required": "vlm_advanced_audit_human_review" } });
    }
  }
  const legacySubmission: AuditWatchSubmission = {
    contractAddress: normalized.contractAddress,
    auditUrl: normalized.auditUrl,
    website: normalized.website,
    chain: normalized.chain,
  };
  const assessment = buildAuditWatchAssessment(legacySubmission);
  const preview = buildAuditVerificationPreview(normalized);
  const sampleReport = buildAuditSampleReport(locale, normalized.reviewLevel);
  const queueRecord = buildAuditReportQueueRecord(normalized, locale);
  const exportPayload = buildAuditReportExportPayload(queueRecord.slug, locale);
  const leadPacket = buildAuditLeadCapturePacket(queueRecord.slug, locale);
  const businessFlow = buildAuditBusinessFlow(locale, queueRecord.slug);
  const registry = buildAuditRegistryDashboard(locale);
  const accountMessage = buildVlmAuditAccountMessage({ locale, submission: normalized, preview });
  const vlmAuditProduct = buildVlmAuditProductPage(locale);

  return NextResponse.json({
    ok: true,
    surface: "velmere-security-audit-watch-intake-preview",
    normalized,
    assessment,
    preview,
    sampleReport,
    queueRecord,
    publicReportRoute: queueRecord.publicRoute,
    adminInboxRoute: queueRecord.adminRoute,
    exportRoute: exportPayload.exportRoute,
    exportPayload,
    leadPacket,
    accountMessage,
    businessFlow,
    vlmAuditProduct,
    registryRoute: `/${locale}/security/audits/registry`,
    registry,
  }, {
    headers: {
      "x-velmere-audit-review-flow": PASS1534_AUDIT_REVIEW_FLOW_ID,
      "x-velmere-audit-sample-report": PASS1574_AUDIT_SAMPLE_REPORT_ID,
      "x-velmere-audit-report-queue": PASS1614_AUDIT_REPORT_QUEUE_ID,
      "x-velmere-audit-pdf-shield-export": PASS1654_AUDIT_PDF_SHIELD_EXPORT_ID,
      "x-velmere-audit-business-flow": PASS1694_AUDIT_BUSINESS_FLOW_ID,
      "x-velmere-audit-public-registry": PASS1894_AUDIT_PUBLIC_REGISTRY_ID,
      "x-velmere-vlm-audit-product": PASS2023_VLM_AUDIT_PRODUCT_ID,
      "x-velmere-audit-boundary": "basic-free-vlm-technology-advanced-human-reviewed-no-exploit-instructions",
    },
  });
}
