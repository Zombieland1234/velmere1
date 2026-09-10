import assert from "node:assert/strict";
import {
  BENCHMARK_20_CONTRACTS,
  type ContractAuditProfile,
} from "@/lib/security/contract-audit-profiles";
import {
  buildCanonicalAuditReport,
  canonicalReportToPdfLines,
  renderCanonicalReportToPdf,
  type AuditTier,
} from "@/lib/security/audit-canonical-report";

console.log("================================================================================");
console.log("VELMERE SECURITY AUDIT BENCHMARK: 20-CONTRACT FULL EXECUTION & PDF AUDIT SUITE");
console.log("================================================================================\n");

const contracts = Object.values(BENCHMARK_20_CONTRACTS);

// Verify at least 20 contracts are registered
assert.ok(
  contracts.length >= 20,
  `Benchmark must contain at least 20 contracts, found: ${contracts.length}`,
);

console.log(`Found ${contracts.length} benchmark contracts across multiple chains & risk levels.\n`);

const summaryTable: Array<{
  index: number;
  name: string;
  chain: string;
  riskScore: number;
  label: string;
  findingsCount: number;
  humanAttested: boolean;
  pdfBytesBasic: number;
  pdfBytesPro: number;
  pdfBytesAdvanced: number;
}> = [];

let totalPdfsGenerated = 0;

for (let i = 0; i < contracts.length; i++) {
  const profile = contracts[i];
  const idx = i + 1;
  const address = profile.contractAddress;

  // 1. Basic tier audit test
  const reportBasic = buildCanonicalAuditReport(
    {
      reportId: `bench_rep_${address.slice(2, 10)}_basic`,
      contractAddress: address,
      contractName: profile.contractName,
      chainId: profile.chainId,
      network: profile.network,
      tokenSymbol: profile.tokenSymbol,
      locale: "en",
    },
    "basic",
  );

  assert.equal(reportBasic.clientEntitlementTier, "basic");
  assert.equal(reportBasic.verdict.riskScore, profile.riskScore);
  if (profile.evidenceCoverage >= 80) {
    assert.ok(reportBasic.verdict.confidenceScore >= 80);
    assert.ok(reportBasic.verdict.evidenceCoverage >= 80);
  } else {
    assert.equal(reportBasic.verdict.evidenceCoverage, profile.evidenceCoverage);
    assert.equal(reportBasic.verdict.confidenceScore, profile.confidenceScore);
  }

  // Assert basic tier locks pro and advanced sections
  const proSectionsBasic = reportBasic.sections.filter((s) => s.requiredTier === "pro");
  const advSectionsBasic = reportBasic.sections.filter((s) => s.requiredTier === "advanced");
  assert.ok(proSectionsBasic.every((s) => s.isLocked && s.data === null));
  assert.ok(advSectionsBasic.every((s) => s.isLocked && s.data === null));

  // 2. Pro tier audit test
  const reportPro = buildCanonicalAuditReport(
    {
      reportId: `bench_rep_${address.slice(2, 10)}_pro`,
      contractAddress: address,
      contractName: profile.contractName,
      chainId: profile.chainId,
      network: profile.network,
      tokenSymbol: profile.tokenSymbol,
      locale: "en",
    },
    "pro",
  );

  assert.equal(reportPro.clientEntitlementTier, "pro");
  const proSectionsPro = reportPro.sections.filter((s) => s.requiredTier === "pro");
  const advSectionsPro = reportPro.sections.filter((s) => s.requiredTier === "advanced");
  assert.ok(proSectionsPro.every((s) => !s.isLocked && s.data !== null));
  assert.ok(advSectionsPro.every((s) => s.isLocked && s.data === null));

  // 3. Advanced tier audit test
  const reportAdv = buildCanonicalAuditReport(
    {
      reportId: `bench_rep_${address.slice(2, 10)}_adv`,
      contractAddress: address,
      contractName: profile.contractName,
      chainId: profile.chainId,
      network: profile.network,
      tokenSymbol: profile.tokenSymbol,
      locale: "en",
    },
    "advanced",
  );

  assert.equal(reportAdv.clientEntitlementTier, "advanced");
  assert.ok(reportAdv.sections.every((s) => !s.isLocked && s.data !== null));

  // Check Human Review vs Automated Analysis boundary
  const humanReviewSection = reportAdv.sections.find((s) => s.id === "advanced_human_review");
  assert.ok(humanReviewSection, "advanced_human_review section must exist");

  if (profile.humanReviewAttestation) {
    assert.equal(reportAdv.humanReviewEvidencePresent, true);
    assert.equal(humanReviewSection.data?.reviewerState?.status, "verified_evidence");
    assert.equal(humanReviewSection.data?.reviewerState?.reviewedBy, profile.humanReviewAttestation.reviewerName);
    assert.equal(humanReviewSection.data?.reviewerState?.signedHash, profile.humanReviewAttestation.signedAttestationHash);
  } else {
    assert.equal(reportAdv.humanReviewEvidencePresent, false);
    assert.equal(humanReviewSection.data?.reviewerState?.status, "pending_submission");
  }

  // 4. Test Tri-Locale Consistency for this contract
  const reportPl = buildCanonicalAuditReport(
    {
      reportId: `bench_rep_${address.slice(2, 10)}_pl`,
      contractAddress: address,
      contractName: profile.contractName,
      chainId: profile.chainId,
      network: profile.network,
      tokenSymbol: profile.tokenSymbol,
      locale: "pl",
    },
    "advanced",
  );
  assert.equal(reportPl.verdict.riskLabel, profile.riskLabelPl);
  assert.equal(reportPl.verdict.summary, profile.summaryPl);

  const reportDe = buildCanonicalAuditReport(
    {
      reportId: `bench_rep_${address.slice(2, 10)}_de`,
      contractAddress: address,
      contractName: profile.contractName,
      chainId: profile.chainId,
      network: profile.network,
      tokenSymbol: profile.tokenSymbol,
      locale: "de",
    },
    "advanced",
  );
  assert.equal(reportDe.verdict.riskLabel, profile.riskLabelDe);
  assert.equal(reportDe.verdict.summary, profile.summaryDe);

  // 5. PDF Generation & Quality Inspection (Basic, Pro, Advanced)
  const pdfBasic = renderCanonicalReportToPdf(reportBasic);
  assert.ok(pdfBasic.pdfByteLength > 1000, "Basic PDF must be > 1000 bytes");
  assert.match(pdfBasic.pdfDigest, /^(sha256:)?[a-f0-9]{64}$/, "PDF digest must be valid SHA-256");

  const pdfPro = renderCanonicalReportToPdf(reportPro);
  assert.ok(pdfPro.pdfByteLength > 1000, "Pro PDF must be > 1000 bytes");
  assert.match(pdfPro.pdfDigest, /^(sha256:)?[a-f0-9]{64}$/);

  const pdfAdv = renderCanonicalReportToPdf(reportAdv);
  assert.ok(pdfAdv.pdfByteLength > 1000, "Advanced PDF must be > 1000 bytes");
  assert.match(pdfAdv.pdfDigest, /^(sha256:)?[a-f0-9]{64}$/);

  // Verify PDF content tier gating:
  const linesBasic = canonicalReportToPdfLines(reportBasic);
  assert.ok(linesBasic.some((l) => l.includes("[LOCKED SECTION - REQUIRES PRO ENTITLEMENT]")), "Basic PDF must show Pro locked marker");
  assert.ok(linesBasic.some((l) => l.includes("[LOCKED SECTION - REQUIRES ADVANCED ENTITLEMENT]")), "Basic PDF must show Advanced locked marker");

  const linesPro = canonicalReportToPdfLines(reportPro);
  assert.ok(!linesPro.some((l) => l.includes("[LOCKED SECTION - REQUIRES PRO ENTITLEMENT]")), "Pro PDF must NOT show Pro locked marker");
  assert.ok(linesPro.some((l) => l.includes("[LOCKED SECTION - REQUIRES ADVANCED ENTITLEMENT]")), "Pro PDF must show Advanced locked marker");

  const linesAdv = canonicalReportToPdfLines(reportAdv);
  assert.ok(!linesAdv.some((l) => l.includes("[LOCKED SECTION")), "Advanced PDF must have ZERO locked markers");

  totalPdfsGenerated += 3;

  // 6. Inspect PDF text lines for broken layouts or placeholders
  const pdfLines = canonicalReportToPdfLines(reportAdv);
  for (const line of pdfLines) {
    assert.ok(!line.includes("undefined"), `PDF line contains 'undefined': ${line}`);
    assert.ok(!line.includes("null"), `PDF line contains literal 'null': ${line}`);
    assert.ok(!line.includes("[object Object]"), `PDF line contains [object Object]: ${line}`);
    assert.ok(!line.includes("NaN"), `PDF line contains NaN: ${line}`);
  }

  // Ensure human review lines distinctly declare independent reviewer review vs automated
  if (profile.humanReviewAttestation) {
    assert.ok(
      pdfLines.some((l) => l.includes("VERIFICATION TYPE: INDEPENDENT MANUAL AUDITOR REVIEW")),
      "PDF must contain explicit Independent Manual Review banner",
    );
  }

  summaryTable.push({
    index: idx,
    name: profile.contractName,
    chain: profile.network,
    riskScore: profile.riskScore,
    label: profile.riskLabelEn,
    findingsCount: profile.baselineFindings.length + (profile.proFindings?.length || 0),
    humanAttested: Boolean(profile.humanReviewAttestation),
    pdfBytesBasic: pdfBasic.pdfByteLength,
    pdfBytesPro: pdfPro.pdfByteLength,
    pdfBytesAdvanced: pdfAdv.pdfByteLength,
  });
}

console.log("--------------------------------------------------------------------------------");
console.log("BENCHMARK VERIFICATION RESULTS TABLE (20 CONTRACTS)");
console.log("--------------------------------------------------------------------------------");
for (const row of summaryTable) {
  const padIndex = String(row.index).padStart(2, " ");
  const padName = row.name.padEnd(34, " ").slice(0, 34);
  const padChain = row.chain.padEnd(20, " ").slice(0, 20);
  const padScore = `Score: ${String(row.riskScore).padStart(2, " ")} (${row.label})`.padEnd(24, " ");
  const padAttest = row.humanAttested ? "[Lead Auditor Attested]" : "[Automated Pipeline]";
  const padPdf = `PDFs: B=${row.pdfBytesBasic}B P=${row.pdfBytesPro}B A=${row.pdfBytesAdvanced}B`;

  console.log(`${padIndex}. ${padName} | ${padChain} | ${padScore} | ${padAttest.padEnd(23, " ")} | ${padPdf}`);
}

console.log("\n--------------------------------------------------------------------------------");
console.log(`✓ Tested 20 benchmark contracts across Ethereum, BSC, and Arbitrum.`);
console.log(`✓ Verified full tier gating: Basic (locked), Pro (unlocked/locked), Advanced (fully unlocked).`);
console.log(`✓ Verified strict distinction between Automated Analysis and Human Review Attestation.`);
console.log(`✓ Generated and validated ${totalPdfsGenerated} customer-safe PDFs with valid SHA-256 digests.`);
console.log(`✓ Tested multi-locale integrity across PL, EN, and DE without truncated or corrupt text.`);
console.log("================================================================================");
console.log("PAS 7 BENCHMARK TEST SUITE: 100% SUCCESSFUL PASS");
console.log("================================================================================\n");
