import assert from "node:assert/strict";
import {
  buildSignedRiskCalibrationDriftReceipt,
  buildSignedRiskCalibrationProfile,
  verifySignedRiskCalibrationDriftReceipt,
  verifySignedRiskCalibrationProfile,
  type RiskCalibrationObservation,
  type SignedRiskCalibrationProfile,
} from "../../lib/market-integrity/risk-empirical-calibration.js";
import {
  buildRiskModelBinding,
  riskModelBindingDigest,
} from "../../lib/market-integrity/risk-model-binding.js";

const binding = {
  ...buildRiskModelBinding({
    symbol: "BTC",
    name: "Bitcoin",
    assetClass: "crypto",
    dataSources: ["provider-a", "provider-b"],
    consensusState: "aligned",
  }, "crypto"),
  outcomeHorizonMs: 24 * 60 * 60 * 1000,
};
const bindingDigest = riskModelBindingDigest(binding);
const signingSecret = "pass4826-risk-calibration-invariant-secret-01";
const start = Date.parse("2026-07-10T00:00:00.000Z");
const scoreBands = [10, 30, 50, 70, 90] as const;
const positiveEvery = [10, 4, 2, 4, 10] as const;

const observations: RiskCalibrationObservation[] = Array.from({ length: 660 }, (_, index) => {
  const band = index % scoreBands.length;
  const sequence = Math.floor(index / scoreBands.length);
  const positive = band < 2
    ? sequence % positiveEvery[band] === 0
    : band === 2
      ? sequence % 2 === 0
      : band === 3
        ? sequence % 4 !== 0
        : sequence % 10 !== 0;
  const observedAt = start + index * 10 * 60 * 1000;
  return {
    observationId: `discrete-${String(index).padStart(4, "0")}`,
    assetKey: `asset-${index}`,
    riskScore: scoreBands[band],
    featureCutoffAt: new Date(observedAt - 60_000).toISOString(),
    observedAt: new Date(observedAt).toISOString(),
    outcomeObservedAt: new Date(observedAt + binding.outcomeHorizonMs).toISOString(),
    outcomeOccurred: positive,
    cohort: "crypto",
    modelBindingDigest: bindingDigest,
  };
});

function build(rows = observations) {
  return buildSignedRiskCalibrationProfile({
    observations: rows,
    outcomeDefinition: "declared test event within 24 hours",
    scoreFormula: binding.scoreFormula,
    modelBinding: binding,
    signerKeyId: "pass4826-invariant-key",
    signingSecret,
    issuedAt: "2026-07-17T00:00:00.000Z",
    validityDays: 30,
    trainFraction: 0.65,
  });
}

const profile = build();
assert.equal(profile.status, "holdout_validated");
assert.ok(profile.mapping.length <= scoreBands.length, "equal scores must be aggregated before isotonic pooling");
assert.ok(profile.mapping.every((block, index, blocks) =>
  index === 0 || blocks[index - 1].maxScore < block.minScore,
), "isotonic blocks must be strictly non-overlapping");
assert.equal(
  profile.mapping.reduce((sum, block) => sum + block.sampleCount, 0),
  profile.trainingMetrics.sampleCount,
  "isotonic mapping must account for every training observation exactly once",
);

const reversedProfile = build([...observations].reverse());
assert.deepEqual(reversedProfile.mapping, profile.mapping, "input permutation must not change calibration mapping");
assert.equal(reversedProfile.datasetDigest, profile.datasetDigest, "input permutation must not change normalized dataset binding");
assert.deepEqual(reversedProfile.calibrationObservationKeyHashes, profile.calibrationObservationKeyHashes);
assert.equal(profile.datasetObservationCount, observations.length);
assert.ok(profile.datasetDiversity.trainingDistinctAssetCount >= 100);
assert.ok(profile.datasetDiversity.holdoutDistinctAssetCount >= 100);

const verified = verifySignedRiskCalibrationProfile({
  profile,
  signingSecret,
  now: "2026-07-18T00:00:00.000Z",
});
assert.equal(verified.ok, true);
assert.equal(verified.gateSemanticsValid, true);
assert.equal(verified.mappingValid, true);

const malformedProfiles: unknown[] = [
  null,
  {},
  { ...profile, modelBinding: undefined },
  { ...profile, mapping: [{ ...profile.mapping[0], calibratedProbability: Number.NaN }] },
  { ...profile, validationGates: [...profile.validationGates, { id: "unapproved_extra_gate", passed: true, observed: 1, required: 1 }] },
  { ...profile, datasetObservationCount: profile.datasetObservationCount + 1 },
  { ...profile, calibrationObservationKeyHashes: [...profile.calibrationObservationKeyHashes, profile.calibrationObservationKeyHashes[0]] },
  { ...profile, datasetDiversity: { ...profile.datasetDiversity, maximumObservationsPerAssetAllowed: 99 } },
  { ...profile, integrityDigest: null, signature: null },
];
for (const malformed of malformedProfiles) {
  assert.doesNotThrow(() => verifySignedRiskCalibrationProfile({
    profile: malformed as SignedRiskCalibrationProfile,
    signingSecret,
    now: "2026-07-18T00:00:00.000Z",
  }));
  assert.equal(verifySignedRiskCalibrationProfile({
    profile: malformed as SignedRiskCalibrationProfile,
    signingSecret,
    now: "2026-07-18T00:00:00.000Z",
  }).ok, false);
}
assert.equal(verifySignedRiskCalibrationProfile({
  profile,
  signingSecret: "weak",
  now: "2026-07-18T00:00:00.000Z",
}).ok, false, "weak verification keys must fail closed");

const monitoringSecret = "pass4826-risk-drift-monitoring-secret-0001";
const monitoredAt = "2026-07-18T00:00:00.000Z";
const monitoredMs = Date.parse(monitoredAt);
const currentDriftRows = observations.slice(0, 150).map((observation, index) => {
  const observedAtMs = monitoredMs - 35 * 60 * 60_000 + index * 4 * 60_000;
  return {
    observationId: `drift-${observation.observationId}`,
    assetKey: `current-asset-${index}`,
    riskScore: observation.riskScore,
    observedAt: new Date(observedAtMs).toISOString(),
    outcomeObservedAt: new Date(observedAtMs + binding.outcomeHorizonMs).toISOString(),
    outcomeOccurred: observation.outcomeOccurred,
    cohort: binding.assetClassCohort,
    modelBindingDigest: bindingDigest,
    profileId: profile.profileId,
  };
});
const driftReceipt = buildSignedRiskCalibrationDriftReceipt({
  profile,
  profileSigningSecret: signingSecret,
  observations: currentDriftRows,
  monitoredAt,
  signerKeyId: "pass4826-drift-key",
  monitoringSecret,
});
assert.equal(driftReceipt.schemaVersion, "velmere.risk-calibration-drift.v2");
const driftVerification = verifySignedRiskCalibrationDriftReceipt({
  receipt: driftReceipt,
  monitoringSecret,
  now: "2026-07-18T01:00:00.000Z",
});
assert.equal(driftVerification.ok, true);
assert.equal(driftVerification.policyValid, true);
assert.equal(driftVerification.profileBindingValid, true);
assert.equal(driftVerification.observationWindowValid, true);
assert.equal(driftVerification.statusSemanticsValid, true);
for (const malformed of [
  null,
  {},
  { ...driftReceipt, policy: undefined },
  { ...driftReceipt, currentScoreBins: [] },
  { ...driftReceipt, profileDatasetDigest: `sha256:${"0".repeat(64)}` },
  { ...driftReceipt, calibrationOverlapCount: 1 },
  { ...driftReceipt, distinctAssetCount: 1 },
  { ...driftReceipt, firstObservedAt: "2020-01-01T00:00:00.000Z" },
  { ...driftReceipt, status: "ready", scorePopulationStabilityIndex: 99 },
]) {
  assert.doesNotThrow(() => verifySignedRiskCalibrationDriftReceipt({
    receipt: malformed as typeof driftReceipt,
    monitoringSecret,
    now: "2026-07-18T01:00:00.000Z",
  }));
  assert.equal(verifySignedRiskCalibrationDriftReceipt({
    receipt: malformed as typeof driftReceipt,
    monitoringSecret,
    now: "2026-07-18T01:00:00.000Z",
  }).ok, false);
}
assert.throws(() => buildSignedRiskCalibrationDriftReceipt({
  profile,
  profileSigningSecret: signingSecret,
  observations: currentDriftRows.map((observation) => ({
    ...observation,
    observationId: `weak-policy-${observation.observationId}`,
  })),
  monitoredAt,
  signerKeyId: "pass4826-drift-key",
  monitoringSecret,
  blockedPsi: 0.9,
}), /risk_calibration_drift_block_policy_invalid/u);

const staleRows = currentDriftRows.map((observation) => {
  const observedAtMs = Date.parse(observation.observedAt) - 48 * 60 * 60_000;
  return {
    ...observation,
    observationId: `stale-${observation.observationId}`,
    observedAt: new Date(observedAtMs).toISOString(),
    outcomeObservedAt: new Date(observedAtMs + binding.outcomeHorizonMs).toISOString(),
  };
});
assert.throws(() => buildSignedRiskCalibrationDriftReceipt({
  profile,
  profileSigningSecret: signingSecret,
  observations: staleRows,
  monitoredAt,
  signerKeyId: "pass4826-drift-key",
  monitoringSecret,
}), /risk_calibration_drift_stale_observation/u);

for (const rows of [
  currentDriftRows.map((observation) => ({ ...observation, cohort: "equity" })),
  currentDriftRows.map((observation) => ({ ...observation, modelBindingDigest: `sha256:${"0".repeat(64)}` })),
  currentDriftRows.map((observation) => ({ ...observation, profileId: "risk-cal-000000000000000000000000" })),
]) {
  assert.throws(() => buildSignedRiskCalibrationDriftReceipt({
    profile,
    profileSigningSecret: signingSecret,
    observations: rows,
    monitoredAt,
    signerKeyId: "pass4826-drift-key",
    monitoringSecret,
  }), /risk_calibration_drift_(?:cohort|model_binding|profile_binding)_mismatch/u);
}

assert.throws(() => buildSignedRiskCalibrationDriftReceipt({
  profile,
  profileSigningSecret: signingSecret,
  observations: currentDriftRows.map((observation, index) => ({
    ...observation,
    assetKey: `only-${index % 29}`,
  })),
  monitoredAt,
  signerKeyId: "pass4826-drift-key",
  monitoringSecret,
}), /risk_calibration_drift_distinct_assets_too_small/u);

const overlapSource = observations[300];
assert.throws(() => buildSignedRiskCalibrationDriftReceipt({
  profile,
  profileSigningSecret: signingSecret,
  observations: currentDriftRows.map((observation, index) => index === 0
    ? {
        ...observation,
        observationId: "reused-calibration-row",
        assetKey: overlapSource.assetKey,
        riskScore: overlapSource.riskScore,
        observedAt: overlapSource.observedAt,
        outcomeObservedAt: overlapSource.outcomeObservedAt,
        outcomeOccurred: overlapSource.outcomeOccurred,
      }
    : observation),
  monitoredAt,
  signerKeyId: "pass4826-drift-key",
  monitoringSecret,
  maximumObservationAgeMs: 7 * 24 * 60 * 60_000,
}), /risk_calibration_drift_calibration_dataset_overlap/u);

const lowDiversityProfile = build(observations.map((observation, index) => ({
  ...observation,
  assetKey: index < 429 ? `thin-train-${index % 80}` : `thin-holdout-${index % 80}`,
})));
assert.equal(lowDiversityProfile.status, "rejected", "pseudo-replicated low-diversity datasets must be rejected");
assert.equal(verifySignedRiskCalibrationProfile({
  profile: lowDiversityProfile,
  signingSecret,
  now: monitoredAt,
}).ok, false);

assert.throws(() => build(observations.map((observation, index) => index === observations.length - 1
  ? {
      ...observation,
      observationId: "duplicate-asset-time-under-new-id",
      assetKey: observations[0].assetKey,
      observedAt: observations[0].observedAt,
      featureCutoffAt: observations[0].featureCutoffAt,
      outcomeObservedAt: observations[0].outcomeObservedAt,
    }
  : observation)), /risk_calibration_duplicate_asset_time_observation/u);

for (const override of [
  { trainFraction: Number.NaN },
  { minimumHoldoutSamples: 199 },
  { minimumClassSamples: 29 },
  { minimumAuRoc: 0.64 },
  { minimumBrierSkill: -0.01 },
  { maximumEce: 0.13 },
  { minimumTrainingDistinctAssets: 99 },
  { minimumHoldoutDistinctAssets: 99 },
  { minimumHoldoutClassDistinctAssets: 29 },
  { maximumObservationsPerAsset: 21 },
  { validityDays: 366 },
]) {
  assert.throws(() => buildSignedRiskCalibrationProfile({
    observations,
    outcomeDefinition: "declared test event within 24 hours",
    scoreFormula: binding.scoreFormula,
    modelBinding: binding,
    signerKeyId: "pass4826-invariant-key",
    signingSecret,
    issuedAt: "2026-07-17T00:00:00.000Z",
    ...override,
  }), /risk_calibration_/u);
}

console.log("PASS equal-score isotonic aggregation and permutation invariance");
console.log("PASS signed profile semantic validation and malformed-profile fail-closed behavior");
console.log("PASS drift policy v2 is signed, semantically checked and malformed-input safe");
console.log("PASS drift observations are fresh, profile-bound, asset-diverse and disjoint from calibration data");
console.log("PASS calibration datasets reject pseudo-replication and low asset diversity");
console.log("PASS validation thresholds cannot be weakened below the production floor");
