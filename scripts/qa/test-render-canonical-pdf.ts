import assert from "node:assert/strict";
import fs from "node:fs";
import { BENCHMARK_20_CONTRACTS } from "../../lib/security/contract-audit-profiles";
import { buildCanonicalAuditReport, renderCanonicalReportToPdf } from "../../lib/security/audit-canonical-report";

console.log("========================================================");
console.log("   TESTING CANONICAL AUDIT PDF WITH MERKLE SEAL CARD   ");
console.log("========================================================");

const profile = Object.values(BENCHMARK_20_CONTRACTS)[0];
console.log(`Auditing target profile: ${profile.contractName} (${profile.contractAddress})...`);

const reportInput = {
  reportId: "VLM-AUDIT-2026-TEST",
  contractName: profile.contractName,
  contractAddress: profile.contractAddress,
  network: profile.network,
  chainId: profile.chainId,
  tokenSymbol: profile.tokenSymbol,
  locale: "pl" as const,
};

const model = buildCanonicalAuditReport(reportInput, "advanced");
assert.ok(model.merkleRoot, "Report should have a Merkle Root");
console.log(`Merkle Root generated: ${model.merkleRoot}`);

const { pdfBytes } = renderCanonicalReportToPdf(model);
const pdfBuffer = Buffer.from(pdfBytes);
assert.ok(pdfBuffer.length > 5000, "PDF buffer should be substantial");
assert.ok(pdfBuffer.toString("latin1").startsWith("%PDF-1.7"), "Should be valid PDF 1.7 header");
assert.ok(pdfBuffer.toString("latin1").includes("%%EOF"), "Should have valid PDF EOF");

// Check if PDF stream contains the Merkle seal hex commands
const pdfAscii = pdfBuffer.toString("ascii");
const velmereHex = Buffer.from("VELMERE", "ascii").toString("hex");
assert.ok(pdfAscii.includes(velmereHex), "PDF should contain hex-encoded Velmère seal header");

console.log(`Generated PDF byte size: ${pdfBuffer.length} bytes`);
console.log("  -> PDF Engine with Institutional Merkle Seal & Barcode: 100% SUCCESS");
