import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildPass2452RiskCalibrationKernel } from "@/lib/market-integrity/risk-calibration-kernel";
import { buildPass2453ReportEvidenceCapsule } from "@/lib/market-integrity/report-evidence-capsule";
import {
  parseRiskScore,
  requireRiskScore,
  RiskScoreUnavailableError,
} from "@/lib/market-integrity/risk-score-availability";
import type { TokenRiskResult } from "@/lib/market-integrity/risk-types";
import { buildVlmModalEvidencePacket } from "@/lib/market-integrity/vlm-modal-evidence-packet";

const baseModalInput = {
  tier: "Basic" as const,
  symbol: "TST",
  name: "Test asset",
  priceLabel: "$1.00",
  sourceLabel: "CoinGecko",
  providerLabels: ["CoinGecko"],
  sourceTimeLabel: "live",
  candles: Array.from({ length: 8 }, (_, index) => ({
    timestamp: 1_700_000_000_000 + index * 60_000,
    close: 1 + index / 100,
  })),
};

assert.equal(parseRiskScore(null), null);
assert.equal(parseRiskScore(""), null);
assert.equal(parseRiskScore("unavailable; previous score 42%"), null);
assert.equal(parseRiskScore("42% pending verification"), null);
assert.equal(parseRiskScore("-1"), null);
assert.equal(parseRiskScore("101"), null);
assert.equal(parseRiskScore("0%"), 0);
assert.equal(parseRiskScore("42,50 / 100"), 42.5);
assert.equal(requireRiskScore(0, "zero_is_valid"), 0);
assert.throws(
  () => requireRiskScore(null, "adversarial_missing"),
  (error: unknown) =>
    error instanceof RiskScoreUnavailableError &&
    error.code === "risk_score_unavailable",
);

const missingModalRisk = buildVlmModalEvidencePacket({
  ...baseModalInput,
  riskLabel: null,
});
assert.equal(missingModalRisk.riskScore, null);
assert.equal(missingModalRisk.riskState, "unavailable");
assert.equal(
  missingModalRisk.lanes.find((item) => item.id === "risk-score")?.state,
  "missing",
);
assert.ok(missingModalRisk.missingData.includes("Risk score"));
assert.equal(missingModalRisk.coverageGrade, "Evidence-limited");

const proseInjection = buildVlmModalEvidencePacket({
  ...baseModalInput,
  tier: "Advanced",
  riskLabel: "risk unavailable; cached 42%; honeypot",
});
assert.equal(proseInjection.riskScore, null);
assert.equal(proseInjection.claimPolicy.contractClaimsAllowed, false);
assert.equal(
  proseInjection.lanes.find((item) => item.id === "rug-pull-trap")?.state,
  "locked",
);

const explicitNullWins = buildVlmModalEvidencePacket({
  ...baseModalInput,
  riskScore: null,
  riskLabel: "42%",
});
assert.equal(explicitNullWins.riskScore, null);

const realZero = buildVlmModalEvidencePacket({
  ...baseModalInput,
  riskLabel: "0%",
});
assert.equal(realZero.riskScore, 0);
assert.equal(realZero.riskState, "available");
assert.ok(realZero.evidenceCoverageCap > missingModalRisk.evidenceCoverageCap);

const missingCalibration = buildPass2452RiskCalibrationKernel({
  query: "TST",
  symbol: "TST",
  result: null,
});
assert.equal(missingCalibration.calibratedRiskScore, null);
assert.equal(missingCalibration.state, "blocked");
assert.equal(missingCalibration.noFillerGovernor.state, "blocked");
assert.ok(
  missingCalibration.noFillerGovernor.requiredBeforeAdvancedConclusion.some(
    (item) => item.includes("TokenRiskResult.score"),
  ),
);

const zeroResult: TokenRiskResult = {
  token: { symbol: "TST", name: "Test asset", assetClass: "crypto" },
  score: 0,
  level: "low",
  badge: "low_detected_risk",
  signals: [],
  metrics: {},
  dataQuality: "partial",
  dataSources: ["test-provider"],
  generatedAt: "2026-07-18T00:00:00.000Z",
};
const zeroCalibration = buildPass2452RiskCalibrationKernel({
  result: zeroResult,
});
assert.notEqual(zeroCalibration.calibratedRiskScore, null);

const invalidRuntimeScore = buildPass2452RiskCalibrationKernel({
  result: { ...zeroResult, score: 142 },
});
assert.equal(invalidRuntimeScore.calibratedRiskScore, null);
assert.equal(invalidRuntimeScore.state, "blocked");

const capsule = buildPass2453ReportEvidenceCapsule({
  riskCalibration: missingCalibration,
});
const riskSection = capsule.reportSections.find(
  (section) => section.id === "risk_calibration",
);
assert.ok(riskSection);
assert.ok(
  !riskSection.confirmedEvidence.some((item) =>
    item.startsWith("calibratedRiskScore:"),
  ),
);
assert.ok(
  riskSection.missingEvidence.some((item) =>
    item.includes("risk-score baseline") || item.includes("TokenRiskResult.score"),
  ),
);

const routeFiles = [
  "fixtures/route-modules/market-integrity/customer-export-redaction-packet.ts",
  "fixtures/route-modules/market-integrity/customer-export-delivery-ledger-persistence.ts",
  "fixtures/route-modules/market-integrity/customer-export-expiry-recall.ts",
  "fixtures/route-modules/market-integrity/customer-export-operator-release-reinstatement.ts",
  "fixtures/route-modules/market-integrity/customer-remedy-refund-credit.ts",
  "fixtures/route-modules/market-integrity/account-vault-remedy-reopen.ts",
  "fixtures/route-modules/market-integrity/customer-export-dispute-chargeback-hold.ts",
];
for (const file of routeFiles) {
  const source = readFileSync(file, "utf8");
  assert.ok(source.includes("parseRiskScore"), `${file}: strict parser required`);
  assert.ok(source.includes("risk_score_unavailable") || source.includes("RISK_SCORE_UNAVAILABLE_CODE"));
  assert.ok(!/riskScore:\s*Number\([^\n]*\?\?\s*72/u.test(source));
}

const auditPipelineSource = readFileSync(
  "lib/security/audit-customer-report-pipeline.ts",
  "utf8",
);
assert.ok(auditPipelineSource.includes("requireRiskScore"));
assert.ok(!/finalVerdict\.riskScore\s*\?\?\s*50/u.test(auditPipelineSource));

console.log("PASS: VLM risk scores remain unavailable without an explicit 0..100 baseline");
