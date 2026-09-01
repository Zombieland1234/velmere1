import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const truth = fs.readFileSync(path.join(process.cwd(), "lib/market-integrity/risk-indicator-customer-truth.ts"), "utf8");
const riskProfile = fs.readFileSync(path.join(process.cwd(), "lib/market-integrity/risk-engine-profile.ts"), "utf8");
const shield = fs.readFileSync(path.join(process.cwd(), "components/market-integrity/ShieldRealMarketsParityClient.tsx"), "utf8");
const shieldPro = fs.readFileSync(path.join(process.cwd(), "components/market-integrity/ShieldProCleanTerminalClient.tsx"), "utf8");
const realMarkets = fs.readFileSync(path.join(process.cwd(), "lib/market-integrity/pass4418-cross-asset-brief-detail-helpers.ts"), "utf8");

assert.match(truth, /CALIBRATION_MISSING/);
assert.match(truth, /calibrated:\s*false/);
assert.match(riskProfile, /function computeDataConfidence/);
assert.match(shield, /shieldProCalibratedRiskConfidencePublishable\(row\)/);
assert.match(shieldPro, /shieldProCalibratedRiskConfidence\(row\)/);
const truthGate = fs.readFileSync(path.join(process.cwd(), "lib/market-integrity/shield-pro-customer-truth.ts"), "utf8");
assert.match(truthGate, /return confidenceClass === "EVIDENCE_BOUND";/);
assert.doesNotMatch(truthGate, /LIMITED_EVIDENCE" \|\| confidenceClass === "EVIDENCE_BOUND/);
assert.match(shield, /confidenceCalibrated:\s*confidenceScore !== null/);
assert.match(shieldPro, /confidenceCalibrated:\s*normalizedConfidence !== null/);
assert.match(realMarkets, /quote\.confidenceCap is an internal evidence\/completeness ceiling, not a calibrated probability/);
assert.match(realMarkets, /const confidence = null;/);

console.log("A102 Risk Indicator calibration / customer-confidence publication truth: PASS");
