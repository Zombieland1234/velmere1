#!/usr/bin/env node
import fs from "node:fs";

const src = fs.readFileSync("lib/security/audit-canonical-report.ts", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(!src.includes("AUTOMATED STATIC & FORMAL ANALYSIS"), "formal_analysis_default_copy_remaining");
assert(!src.includes("ZAUTOMATYZOWANA WERYFIKACJA STATYCZNA & FORMALNA"), "formal_analysis_default_copy_pl_remaining");
assert(!src.includes('report.verdict.releaseDecision ?? "PASS"'), "release_decision_defaults_to_pass");
assert(!src.includes('report.verdict.verificationStatus ?? "VERIFIED"'), "verification_status_defaults_to_verified");
assert(src.includes('report.verdict.releaseDecision ?? "BLOCKED"'), "release_decision_fail_closed_fallback_missing");
assert(src.includes('report.verdict.verificationStatus ?? "INSUFFICIENT_EVIDENCE"'), "verification_status_fail_closed_fallback_missing");
assert(!src.includes('report.clientEntitlementTier === "advanced" ? 95'), "pdf_quality_still_inferred_from_tier");
assert(!src.includes("2026-09-09T16:00:00Z (NYSE Close)"), "market_timestamp_static_fallback_remaining");
assert(!src.includes("sp.regulatoryFilingHash || report.target.contractAddress"), "market_filing_fallback_uses_target_identifier");

console.log(JSON.stringify({ status: "PASS", checks: 9 }, null, 2));
