#!/usr/bin/env node
import fs from "node:fs";

const file = "lib/security/audit-canonical-report.ts";
let source = fs.readFileSync(file, "utf8");

function replaceExact(oldText, newText, id, expectedCount = 1) {
  const count = source.split(oldText).length - 1;
  if (count !== expectedCount) throw new Error(`${id}_match_count:${count}:expected:${expectedCount}`);
  source = source.split(oldText).join(newText);
}

replaceExact(
`  const tierQualityScore = clientTier === "advanced"
    ? Math.min(99, Math.round(92 + (report.verdict.confidenceScore % 7)))
    : clientTier === "pro"
    ? Math.min(88, Math.round(80 + (report.verdict.confidenceScore % 8)))
    : Math.min(68, Math.round(58 + (report.verdict.confidenceScore % 9)));`,
`  const tierQualityScore = Number.isFinite(report.verdict.auditQualityScore)
    ? Math.max(0, Math.min(100, Number(report.verdict.auditQualityScore)))
    : 0;`,
"synthetic_tier_quality",
);

replaceExact(
`      lines.push(
        isPl
          ? "TYP ANALIZY: ZAUTOMATYZOWANA WERYFIKACJA STATYCZNA & FORMALNA"
          : isDe
            ? "ANALYSETYP: AUTOMATISIERTE STATISCHE & FORMALE PRÜFUNG"
            : "ANALYSIS TYPE: AUTOMATED STATIC & FORMAL ANALYSIS"
      );`,
`      lines.push(
        isPl
          ? "TYP ANALIZY: ZAUTOMATYZOWANA ANALIZA; WERYFIKACJA FORMALNA TYLKO GDY WYKONANA I ZWIĄZANA Z DOWODEM"
          : isDe
            ? "ANALYSETYP: AUTOMATISIERTE ANALYSE; FORMALE VERIFIKATION NUR BEI AUSFÜHRUNG UND NACHWEISBINDUNG"
            : "ANALYSIS TYPE: AUTOMATED ANALYSIS; FORMAL VERIFICATION ONLY WHEN EXECUTED AND EVIDENCE-BOUND"
      );`,
"formal_analysis_copy",
);

replaceExact(
`  const qScore = report.verdict.auditQualityScore ?? (report.clientEntitlementTier === "advanced" ? 95 : report.clientEntitlementTier === "pro" ? 82 : 62);`,
`  const qScore = report.verdict.auditQualityScore ?? 0;`,
"pdf_quality_fallback",
);

replaceExact(
`  const releaseDecisionStr = report.verdict.releaseDecision ?? "PASS";
  const verificationStatusStr = report.verdict.verificationStatus ?? "VERIFIED";`,
`  const releaseDecisionStr = report.verdict.releaseDecision ?? "BLOCKED";
  const verificationStatusStr = report.verdict.verificationStatus ?? "INSUFFICIENT_EVIDENCE";`,
"verdict_fallbacks",
);

replaceExact(
`sp.marketStateTimestamp || "2026-09-09T16:00:00Z (NYSE Close)"`,
`sp.marketStateTimestamp || "NOT_OBSERVED"`,
"market_timestamp_fallbacks",
2,
);
replaceExact(
`sp.regulatoryFilingHash || report.target.contractAddress`,
`sp.regulatoryFilingHash || "NOT_OBSERVED"`,
"market_filing_fallbacks",
2,
);

fs.writeFileSync(file, source);
console.log(JSON.stringify({ status: "PATCHED", file, replacementGroups: 6, concreteReplacements: 8 }, null, 2));
