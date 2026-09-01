import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { shieldProCalibratedRiskConfidence } from "@/lib/market-integrity/shield-pro-customer-truth";

const evidenceBound = {
  result: {
    confidence: 0.82,
    dataQuality: "live" as const,
    dataSources: ["legacy-label"],
    customerTruth: { confidenceClass: "EVIDENCE_BOUND" as const },
  },
  delivery: {
    state: "verified",
    verifiedProviderIds: ["provider-a", "provider-b"],
    risk: { state: "verified" },
  },
};

assert.equal(shieldProCalibratedRiskConfidence(evidenceBound), 0.82);
assert.equal(
  shieldProCalibratedRiskConfidence({
    ...evidenceBound,
    result: { ...evidenceBound.result, customerTruth: undefined },
  }),
  null,
  "verified transport must not mint numeric confidence without a calibration class",
);
assert.equal(
  shieldProCalibratedRiskConfidence({
    ...evidenceBound,
    result: {
      ...evidenceBound.result,
      customerTruth: { confidenceClass: "LIMITED_EVIDENCE" as const },
    },
  }),
  null,
  "LIMITED_EVIDENCE is explicitly uncalibrated",
);
assert.equal(
  shieldProCalibratedRiskConfidence({
    ...evidenceBound,
    delivery: { ...evidenceBound.delivery, risk: { state: "withheld" } },
  }),
  null,
  "withheld risk cannot publish confidence",
);
assert.equal(
  shieldProCalibratedRiskConfidence({
    ...evidenceBound,
    result: { ...evidenceBound.result, dataQuality: "demo" as const },
  }),
  null,
  "reference/demo data cannot publish confidence",
);
assert.equal(
  shieldProCalibratedRiskConfidence({
    ...evidenceBound,
    result: { ...evidenceBound.result, dataSources: [] },
    delivery: { ...evidenceBound.delivery, verifiedProviderIds: [] },
  }),
  null,
  "calibration without a verified provider identity is not customer-publishable",
);

for (const hostileConfidence of [Number.NaN, Number.POSITIVE_INFINITY, -0.01, 101, "0.99"]) {
  assert.equal(
    shieldProCalibratedRiskConfidence({
      ...evidenceBound,
      result: { ...evidenceBound.result, confidence: hostileConfidence as number },
    }),
    null,
    `hostile confidence ${String(hostileConfidence)} must fail closed`,
  );
}

assert.doesNotThrow(() => {
  assert.equal(
    shieldProCalibratedRiskConfidence({
      ...evidenceBound,
      result: { ...evidenceBound.result, dataSources: [null, 7, {}] as unknown as string[] },
      delivery: { ...evidenceBound.delivery, verifiedProviderIds: [null, 7, {}] as unknown as string[] },
    }),
    null,
  );
}, "malformed provider identities must fail closed instead of crashing the customer route");

const component = fs.readFileSync(
  path.join(process.cwd(), "components/market-integrity/ShieldProCleanTerminalClient.tsx"),
  "utf8",
);
assert.match(component, /function evidenceLabel[\s\S]*?shieldProCalibratedRiskConfidence\(row\)/);
assert.match(component, /case "evidence":[\s\S]*?shieldProCalibratedRiskConfidence\(row\)/);
assert.match(component, /function shieldProModalData[\s\S]*?shieldProCalibratedRiskConfidence\(row\)/);
assert.match(
  component,
  /const dashboardStats[\s\S]*?customerRows[\s\S]*?\.map\(\(\{ row \}\) => shieldProCalibratedRiskConfidence\(row\)\)/,
  "dashboard confidence must use the calibrated boundary on customer-projectable rows",
);
assert.doesNotMatch(
  component,
  /\.filter\(\(row\) => shieldProRiskVerified\(row\)\)\s*\.map\(\(row\) => row\.result\?\.confidence\)/,
  "dashboard aggregate bypasses the calibrated-confidence boundary",
);
assert.doesNotMatch(
  component,
  /const confidence = row\.result\?\.confidence/,
  "a Shield Pro customer modal or table still reads raw confidence",
);

console.log("Shield Pro calibrated confidence boundary: PASS");
