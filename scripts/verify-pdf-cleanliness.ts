import assert from "node:assert/strict";
import { buildCanonicalAuditReport, canonicalReportToPdfLines, renderCanonicalReportToPdf } from "../lib/security/audit-canonical-report";
import fs from "node:fs";

console.log("Starting PDF Cleanliness & Zero-Upsell Audit Test...");

const sample = {
  reportId: "rep_safemoon_001",
  contractName: "SafeMoon",
  contractAddress: "0x8076c74c5e3f5852037f31ff0093eeb8c8add8d3",
  network: "BNB Smart Chain (BSC)",
  chainId: "56",
  tokenSymbol: "SAFEMOON",
  websiteUrl: "https://safemoon.net",
  docsUrl: "https://safemoon.net/whitepaper.pdf",
};

// 1. Basic Report PDF check
const basicRep = buildCanonicalAuditReport({ ...sample, locale: "pl" }, "basic");
const basicLines = canonicalReportToPdfLines(basicRep);
const hasProMentionInBasic = basicLines.some((l) =>
  /wymaga pakietu|odblokuj w pakiecie|pakietu pro|pakietu advanced|sekcja zablokowana/i.test(l)
);
console.log("Basic PDF lines count:", basicLines.length);
console.log("Basic PDF has Pro/Advanced upsells:", hasProMentionInBasic);
assert.equal(hasProMentionInBasic, false, "Basic PDF must NOT contain any mentions of Pro/Advanced upsells or locked sections!");

const basicPdf = renderCanonicalReportToPdf(basicRep);
assert.ok(basicPdf.pdfByteLength > 1000);
fs.writeFileSync("artifacts/clean_audit_basic_sample.pdf", basicPdf.pdfBytes);
console.log("✓ Basic PDF generated and saved to artifacts/clean_audit_basic_sample.pdf");

// 2. Pro Report PDF check
const proRep = buildCanonicalAuditReport({ ...sample, locale: "pl" }, "pro");
const proLines = canonicalReportToPdfLines(proRep);
const hasAdvMentionInPro = proLines.some((l) =>
  /wymaga pakietu advanced|odblokuj w pakiecie advanced|pakietu advanced/i.test(l)
);
console.log("Pro PDF lines count:", proLines.length);
console.log("Pro PDF has Advanced upsells:", hasAdvMentionInPro);
assert.equal(hasAdvMentionInPro, false, "Pro PDF must NOT contain any mentions of Advanced upsells or locked sections!");

const proPdf = renderCanonicalReportToPdf(proRep);
assert.ok(proPdf.pdfByteLength > 1000);
fs.writeFileSync("artifacts/clean_audit_pro_sample.pdf", proPdf.pdfBytes);
console.log("✓ Pro PDF generated and saved to artifacts/clean_audit_pro_sample.pdf");

// 3. Advanced Report PDF check
const advRep = buildCanonicalAuditReport({ ...sample, locale: "pl" }, "advanced");
const advLines = canonicalReportToPdfLines(advRep);
console.log("Advanced PDF lines count:", advLines.length);

const advPdf = renderCanonicalReportToPdf(advRep);
assert.ok(advPdf.pdfByteLength > 1000);
fs.writeFileSync("artifacts/clean_audit_advanced_sample.pdf", advPdf.pdfBytes);
console.log("✓ Advanced PDF generated and saved to artifacts/clean_audit_advanced_sample.pdf");

console.log("\n🎉 ALL PDF CLEANLINESS AND ZERO-UPSELL AUDIT CHECKS PASSED 100%!");
