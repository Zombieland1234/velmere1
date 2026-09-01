import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildDeterministicVlmAnalysis, type VlmAnalysisAsset } from "../../lib/market-integrity/vlm-analysis.js";

const base: VlmAnalysisAsset = {
  symbol: "CAL",
  name: "Calibration Boundary",
  priceLabel: "107",
  changeLabel: "+7%",
  sourceLabel: "provider-a",
  sourceTimeLabel: "2026-08-11T12:00:00.000Z",
  riskLabel: "41",
  candles: [
    { timestamp: 1, close: 100, volume: 100 },
    { timestamp: 2, close: 101, volume: 100 },
    { timestamp: 3, close: 102, volume: 100 },
    { timestamp: 4, close: 103, volume: 100 },
    { timestamp: 5, close: 104, volume: 100 },
    { timestamp: 6, close: 105, volume: 100 },
    { timestamp: 7, close: 106, volume: 100 },
    { timestamp: 8, close: 107, volume: 100 },
  ],
};

const noConfidence = buildDeterministicVlmAnalysis(base, "basic", "en");
const uncalibrated = buildDeterministicVlmAnalysis({ ...base, confidenceLabel: "88%" }, "basic", "en");
const calibrated = buildDeterministicVlmAnalysis({ ...base, confidenceLabel: "88%", confidenceCalibrated: true }, "basic", "en");

assert.equal(noConfidence.confidence, null);
assert.equal(uncalibrated.confidence, null, "a numeric confidenceLabel cannot self-authorize publication");
assert.equal(calibrated.confidence, 88, "explicit calibration authority may publish the attached confidence value");

// A confidence label must not improve data/input coverage merely by existing.
assert.equal(uncalibrated.dataQuality, noConfidence.dataQuality);
const noQuality = noConfidence.signals.find((item) => item.id === "data-quality");
const uncalibratedQuality = uncalibrated.signals.find((item) => item.id === "data-quality");
assert.ok(noQuality && uncalibratedQuality);
assert.equal(uncalibratedQuality.value, noQuality.value, "uncalibrated confidence must not inflate input coverage");
assert.equal(uncalibratedQuality.inputFields.includes("confidenceLabel"), false);
assert.match(uncalibratedQuality.derivation, /does not increase coverage|nie zwiększa pokrycia|erhöht die Abdeckung nicht/i);

// A provider-looking string cannot self-authorize source credit either.
assert.equal(uncalibrated.sourceCount, 0, "sourceLabel without verification must not mint a provider count");
const sourceVerified = buildDeterministicVlmAnalysis({ ...base, sourceVerified: true }, "basic", "en");
assert.equal(sourceVerified.sourceCount, 1);
const placeholderSource = buildDeterministicVlmAnalysis({
  ...base,
  sourceLabel: "Source unavailable",
  sourceTimeLabel: "Source time pending",
  sourceVerified: true,
}, "basic", "en");
assert.equal(placeholderSource.sourceCount, 0, "placeholder source copy is not evidence");
assert.equal(placeholderSource.completedAt, new Date(0).toISOString(), "placeholder source time is not a verified timestamp");
assert.ok(sourceVerified.signals.flatMap((item) => item.evidence).some((entry) => entry.source === "provider-a"));
assert.ok(placeholderSource.signals.flatMap((item) => item.evidence).every((entry) => entry.source !== "Source unavailable"));
const guidanceIsNotEvidence = buildDeterministicVlmAnalysis({
  ...base,
  sourceVerified: true,
  evidenceNotes: ["No investment advice", "Paid tier unavailable"],
}, "basic", "en");
assert.equal(
  guidanceIsNotEvidence.signals.flatMap((item) => item.evidence).some((entry) => /No investment advice|Paid tier unavailable/.test(entry.note)),
  false,
  "customer guidance/limitations must not be promoted into Sources used",
);

const analysisTab = fs.readFileSync(path.join(process.cwd(), "components/market-integrity/analysis/AnalysisTab.tsx"), "utf8");
assert.match(analysisTab, /Calibrated confidence/);
assert.match(analysisTab, /Skalibrowana pewność/);
assert.match(analysisTab, /Kalibrierte Konfidenz/);

console.log("A102 active Analysis calibrated-confidence boundary: PASS");
