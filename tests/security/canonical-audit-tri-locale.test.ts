import assert from "node:assert/strict";
import {
  buildCanonicalAuditReport,
  canonicalReportToPdfLines,
  renderCanonicalReportToPdf,
} from "@/lib/security/audit-canonical-report";

console.log("Starting Canonical Audit Tri-Locale (PL / EN / DE) Test Suite...");

const sample = {
  reportId: "rep_tri_locale_001",
  contractName: "TriLocaleToken",
  contractAddress: "0x1234567890123456789012345678901234567890",
  network: "BNB Smart Chain (BSC)",
  chainId: "56",
  tokenSymbol: "TLT",
  websiteUrl: "https://trilocale.io",
  docsUrl: "https://docs.trilocale.io",
  githubRepo: "https://github.com/trilocale/core",
};

// --- POLISH (PL) ---
const reportPl = buildCanonicalAuditReport({ ...sample, locale: "pl" }, "basic");
assert.equal(reportPl.locale, "pl");
assert.equal(reportPl.verdict.riskLabel, "PODWYŻSZONE RYZYKO (BRAK DOWODÓW)");
assert.ok(reportPl.verdict.summary.includes("Kontrakt nie posiada zweryfikowanego kodu"));
const overviewPl = reportPl.sections.find((s) => s.id === "overview");
assert.equal(overviewPl?.title, "Przegląd audytu i kontekst kontraktu");
const proLockPl = reportPl.sections.find((s) => s.id === "pro_permission_parser");
assert.equal(proLockPl?.isLocked, true);
assert.equal(proLockPl?.lockTierNotice, "Odblokuj w pakiecie Pro");
assert.ok(proLockPl?.sampleSummaryLines?.[0].includes("Rola administratora"));

const pdfLinesPl = canonicalReportToPdfLines(reportPl);
assert.ok(pdfLinesPl[0].includes("RAPORT BEZPIECZEŃSTWA VELMÈRE: TRILOCALETOKEN"));
assert.ok(pdfLinesPl.some((l) => l.includes("Badany kontrakt: 0x1234567890123456789012345678901234567890")));
// Clean customer PDF mode has ZERO locked section upselling:
assert.ok(!pdfLinesPl.some((l) => l.includes("WYMAGA PAKIETU PRO") || l.includes("WYMAGA PAKIETU ADVANCED")));
const teaserLinesPl = canonicalReportToPdfLines(reportPl, { includeLockedTeasers: true });
assert.ok(teaserLinesPl.some((l) => l.includes("[SEKCJA ZABLOKOWANA - WYMAGA PAKIETU PRO]")));
assert.ok(pdfLinesPl.some((l) => l.includes("POUFNOŚĆ I ZASTRZEŻENIE PRAWNE:")));

const pdfBytesPl = renderCanonicalReportToPdf(reportPl);
assert.ok(pdfBytesPl.pdfByteLength > 1000);
console.log("✓ Polish (PL) canonical report & clean PDF parity verified.");

// --- GERMAN (DE) ---
const reportDe = buildCanonicalAuditReport({ ...sample, locale: "de" }, "basic");
assert.equal(reportDe.locale, "de");
assert.equal(reportDe.verdict.riskLabel, "ERHÖHTES RISIKO (UNVERIFIZIERT)");
assert.ok(reportDe.verdict.summary.includes("Der Vertrag verfügt über keinen verifizierten"));
const overviewDe = reportDe.sections.find((s) => s.id === "overview");
assert.equal(overviewDe?.title, "Audit-Übersicht & Vertragskontext");
const proLockDe = reportDe.sections.find((s) => s.id === "pro_permission_parser");
assert.equal(proLockDe?.isLocked, true);
assert.equal(proLockDe?.lockTierNotice, "Freischalten mit Pro Audit");
assert.ok(proLockDe?.sampleSummaryLines?.[0].includes("Admin-Rolle"));

const pdfLinesDe = canonicalReportToPdfLines(reportDe);
assert.ok(pdfLinesDe[0].includes("VELMÈRE SICHERHEITSAUDITBERICHT: TRILOCALETOKEN"));
assert.ok(pdfLinesDe.some((l) => l.includes("Geprüfter Vertrag: 0x1234567890123456789012345678901234567890")));
assert.ok(pdfLinesDe.some((l) => l.includes("ENDGÜLTIGES URTEIL: ERHÖHTES RISIKO (UNVERIFIZIERT)")));
assert.ok(!pdfLinesDe.some((l) => l.includes("ERFORDERT PRO-STUFE") || l.includes("ERFORDERT ADVANCED-STUFE")));
const teaserLinesDe = canonicalReportToPdfLines(reportDe, { includeLockedTeasers: true });
assert.ok(teaserLinesDe.some((l) => l.includes("[GESPERRTER ABSCHNITT - ERFORDERT PRO-STUFE]")));
assert.ok(pdfLinesDe.some((l) => l.includes("VERTRAULICHKEIT & RECHTLICHER HINWEIS:")));

const pdfBytesDe = renderCanonicalReportToPdf(reportDe);
assert.ok(pdfBytesDe.pdfByteLength > 1000);
console.log("✓ German (DE) canonical report & clean PDF parity verified.");

// --- ENGLISH (EN) ---
const reportEn = buildCanonicalAuditReport({ ...sample, locale: "en" }, "basic");
assert.equal(reportEn.locale, "en");
assert.equal(reportEn.verdict.riskLabel, "ELEVATED RISK (UNVERIFIED CODE)");
assert.ok(reportEn.verdict.summary.includes("Contract lacks verified on-chain runtime bytecode"));
const overviewEn = reportEn.sections.find((s) => s.id === "overview");
assert.equal(overviewEn?.title, "Audit Overview & Contract Context");
const proLockEn = reportEn.sections.find((s) => s.id === "pro_permission_parser");
assert.equal(proLockEn?.isLocked, true);
assert.equal(proLockEn?.lockTierNotice, "Unlock with Pro Audit");
assert.ok(proLockEn?.sampleSummaryLines?.[0].includes("Admin role"));

const pdfLinesEn = canonicalReportToPdfLines(reportEn);
assert.ok(pdfLinesEn[0].includes("VELMERE SECURITY AUDIT REPORT: TRILOCALETOKEN"));
assert.ok(pdfLinesEn.some((l) => l.includes("Audited Contract: 0x1234567890123456789012345678901234567890")));
assert.ok(pdfLinesEn.some((l) => l.includes("VERDICT SUMMARY: ELEVATED RISK (UNVERIFIED CODE)")));
assert.ok(!pdfLinesEn.some((l) => l.includes("REQUIRES PRO ENTITLEMENT") || l.includes("REQUIRES ADVANCED ENTITLEMENT")));
const teaserLinesEn = canonicalReportToPdfLines(reportEn, { includeLockedTeasers: true });
assert.ok(teaserLinesEn.some((l) => l.includes("[LOCKED SECTION - REQUIRES PRO ENTITLEMENT]")));
assert.ok(pdfLinesEn.some((l) => l.includes("CONFIDENTIALITY & LEGAL NOTICE:")));

const pdfBytesEn = renderCanonicalReportToPdf(reportEn);
assert.ok(pdfBytesEn.pdfByteLength > 1000);
console.log("✓ English (EN) canonical report & PDF parity verified.");

console.log("\nALL TRI-LOCALE (PL / EN / DE) CANONICAL REPORT TESTS PASSED! PASS");
