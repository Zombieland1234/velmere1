import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  evaluateA84RealIntake,
} from "../../lib/worldclass/pass36-a84-shield-full-catalog-tier-matrix-runtime.js";
import {
  evaluateA85RealIntake,
} from "../../lib/worldclass/pass36-a85-shield-pro-map-full-depth-runtime.js";
import {
  evaluateA86RealIntake,
} from "../../lib/worldclass/pass36-a86-real-markets-cross-asset-runtime.js";

function readJson<T = Record<string, unknown>>(path: string) {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

const a84 = evaluateA84RealIntake(
  readJson("config/pass36/a84-shield-real-full-catalog-intake.json"),
  readJson<Parameters<typeof evaluateA84RealIntake>[1]>(
    "config/pass36/a84-shield-full-catalog-tier-matrix-policy.json",
  ),
);
assert.equal(a84.requiredAssetDenominator, 318);
assert.equal(a84.activeAssetDenominator, 318);
assert.equal(a84.denominatorValid, true);
assert.equal(a84.evidenceCompleteAssets, 0);
assert.equal(a84.unavailableOrBlockedAssets, 318);
assert.equal(a84.decision, "BLOCKED_CURRENT_FULL_CATALOG_EVIDENCE");

const a85 = evaluateA85RealIntake(
  readJson("evaluation/pass36/a85-real-shield-pro-map-intake.json"),
);
assert.equal(a85.requiredAssets, 318);
assert.equal(a85.activeAssetDenominator, 318);
assert.equal(a85.denominatorValid, true);
assert.equal(a85.evidenceCompleteAssets, 0);
assert.equal(a85.unavailableOrBlockedAssets, 318);
assert.equal(a85.decision, "BLOCKED_REAL_SHIELD_PRO_MAP_EVIDENCE");

const a86 = evaluateA86RealIntake(
  readJson("evaluation/pass36/a86-real-markets-intake.json"),
);
assert.equal(a86.requiredInstrumentDenominator, 583);
assert.equal(a86.supportedInstrumentDenominator, 583);
assert.equal(a86.denominatorValid, true);
assert.equal(a86.rows, 0);
assert.equal(a86.fullyVerified, 0);
assert.equal(a86.unavailableOrBlockedInstruments, 583);
assert.equal(a86.decision, "BLOCKED_REAL_MARKETS_CROSS_ASSET_EVIDENCE");

for (const badDenominator of [0, 1, 317, 319, Number.NaN]) {
  const result = evaluateA85RealIntake({
    ...readJson("evaluation/pass36/a85-real-shield-pro-map-intake.json"),
    activeAssetDenominator: badDenominator,
  });
  assert.equal(result.denominatorValid, false);
  assert.equal(result.decision, "BLOCKED_REAL_SHIELD_PRO_MAP_EVIDENCE");
}

for (const badDenominator of [0, 1, 582, 584, Number.NaN]) {
  const result = evaluateA86RealIntake({
    ...readJson("evaluation/pass36/a86-real-markets-intake.json"),
    supportedInstrumentDenominator: badDenominator,
  });
  assert.equal(result.denominatorValid, false);
  assert.equal(
    result.decision,
    "BLOCKED_REAL_MARKETS_CROSS_ASSET_EVIDENCE",
  );
}

console.log("A94 denominator truth boundary: PASS (22 assertions)");
