import assert from "node:assert/strict";
import {
  buildCanonicalAuditReport,
  canonicalReportToPdfLines,
  renderCanonicalReportToPdf,
} from "@/lib/security/audit-canonical-report";
import { GET as getReportApi } from "@/app/api/audit/report/route";
import { GET as getPdfApi } from "@/app/api/audit/report-pdf/route";
import { NextRequest } from "next/server";

console.log("Starting Canonical Audit Parity & Entitlement Test Suite...");

const sampleInput = {
  reportId: "rep_test_canonical_001",
  contractName: "CanonicalVault",
  contractAddress: "0x1111222233334444555566667777888899990000",
  network: "BNB Smart Chain (BSC)",
  chainId: "56",
  tokenSymbol: "CVLT",
  websiteUrl: "https://canonicalvault.example",
  docsUrl: "https://docs.canonicalvault.example",
  githubRepo: "https://github.com/canonicalvault/core",
};

// 1. BASIC ENTITLEMENT & ACCESS CONTROL
const basicReport = buildCanonicalAuditReport(sampleInput, "basic");
assert.equal(basicReport.clientEntitlementTier, "basic");
assert.equal(basicReport.sections.length, 9, "Must contain all 9 canonical sections");

const overview = basicReport.sections.find((s) => s.id === "overview");
assert.equal(overview?.isLocked, false);
assert.ok(overview?.data?.keyValuePairs && overview.data.keyValuePairs.length > 0);

const basicFindings = basicReport.sections.find((s) => s.id === "basic_findings");
assert.equal(basicFindings?.isLocked, false);
assert.ok(basicFindings?.data?.findings && basicFindings.data.findings.length > 0);

const proPermission = basicReport.sections.find((s) => s.id === "pro_permission_parser");
assert.equal(proPermission?.isLocked, true, "Pro section must be locked for basic tier");
assert.equal(proPermission?.data, null, "SECURITY RULE: Protected pro data must be null, never leaked!");

const advBytecode = basicReport.sections.find((s) => s.id === "advanced_bytecode_diff");
assert.equal(advBytecode?.isLocked, true, "Advanced section must be locked for basic tier");
assert.equal(advBytecode?.data, null, "SECURITY RULE: Protected advanced data must be null, never leaked!");

console.log("✓ Basic entitlement access control verified.");

// 2. PRO ENTITLEMENT
const proReport = buildCanonicalAuditReport(sampleInput, "pro");
assert.equal(proReport.clientEntitlementTier, "pro");

const proPermissionInPro = proReport.sections.find((s) => s.id === "pro_permission_parser");
assert.equal(proPermissionInPro?.isLocked, false);
assert.ok(proPermissionInPro?.data?.findings && proPermissionInPro.data.findings.length > 0);

const advBytecodeInPro = proReport.sections.find((s) => s.id === "advanced_bytecode_diff");
assert.equal(advBytecodeInPro?.isLocked, true, "Advanced section must remain locked in Pro");
assert.equal(advBytecodeInPro?.data, null, "SECURITY RULE: Advanced data must not leak to Pro client!");

console.log("✓ Pro entitlement verified.");

// 3. ADVANCED ENTITLEMENT & HUMAN REVIEW RULE
const advReportWithoutHuman = buildCanonicalAuditReport(sampleInput, "advanced");
assert.equal(advReportWithoutHuman.clientEntitlementTier, "advanced");

const humanReviewSection = advReportWithoutHuman.sections.find((s) => s.id === "advanced_human_review");
assert.equal(humanReviewSection?.isLocked, false);
assert.equal(humanReviewSection?.data?.reviewerState?.status, "pending_submission");
assert.equal(humanReviewSection?.data?.reviewerState?.reviewedBy, undefined, "No misleading human claim");

const advReportWithHuman = buildCanonicalAuditReport(
  {
    ...sampleInput,
    humanReviewer: {
      reviewerName: "Velmère Lead Auditor #4",
      reviewDate: "2026-08-31",
      signedAttestationHash: "sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
    },
  },
  "advanced",
);
const humanSectionWithEvidence = advReportWithHuman.sections.find((s) => s.id === "advanced_human_review");
assert.equal(humanSectionWithEvidence?.data?.reviewerState?.status, "verified_evidence");
assert.equal(humanSectionWithEvidence?.data?.reviewerState?.reviewedBy, "Velmère Lead Auditor #4");

console.log("✓ Advanced entitlement & human review rules verified.");

// 4. BROWSER PREVIEW & PDF PARITY
const basicPdf = renderCanonicalReportToPdf(basicReport);
assert.ok(basicPdf.pdfByteLength > 1000, "PDF must render valid bytes");

const pdfLines = canonicalReportToPdfLines(basicReport);
assert.ok(pdfLines.some((l) => l.includes("[LOCKED SECTION - REQUIRES PRO ENTITLEMENT]")));
assert.equal(pdfLines.some((l) => l.includes("Admin / Owner Interface")), false, "Basic PDF must not leak Pro metrics");

const proPdfLines = canonicalReportToPdfLines(proReport);
assert.ok(proPdfLines.some((l) => l.includes("Admin / Owner Interface")), "Pro PDF includes Pro metrics");

console.log("✓ Browser preview / PDF canonical parity verified.");

// 5. SERVER API ENDPOINT ENTITLEMENT ENFORCEMENT
async function testApiEnforcement() {
  const req = new NextRequest("http://localhost/api/audit/report?address=0x1111222233334444555566667777888899990000&tier=advanced");
  const res = await getReportApi(req);
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.clientTier, "basic", "Unauthorized caller forced to basic");
  const proSectionInApi = data.report.sections.find((s: any) => s.id === "pro_permission_parser");
  assert.equal(proSectionInApi.isLocked, true);
  assert.equal(proSectionInApi.data, null, "API does not leak pro data to unauthorized caller");

  const pdfReq = new NextRequest("http://localhost/api/audit/report-pdf?address=0x1111222233334444555566667777888899990000&tier=advanced");
  const pdfRes = await getPdfApi(pdfReq);
  assert.equal(pdfRes.status, 200);
  assert.equal(pdfRes.headers.get("x-velmere-audit-pdf-tier"), "basic", "PDF download enforces basic");

  console.log("✓ Server API endpoints enforce entitlement.");
}

testApiEnforcement().then(() => {
  console.log("\nALL CANONICAL AUDIT PARITY & ENTITLEMENT TESTS PASSED SUCCESSFULLY! PASS");
}).catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
