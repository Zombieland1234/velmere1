#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const alignmentModule = await import("../../lib/market-integrity/risk-history-current-alignment.ts");
const contract = await import("../../lib/market-integrity/risk-history-contract.ts");
const { sha256Digest } = await import("../../lib/security/cryptographic-digest.ts");

const checks = [];
function check(id, condition, detail) {
  const row = { id, status: condition ? "PASS" : "FAIL", ...(detail === undefined ? {} : { detail }) };
  checks.push(row);
  if (!condition) throw new Error(`P96 current alignment failed: ${id} ${JSON.stringify(detail ?? null)}`);
}

const FIXED = "2026-08-21T01:00:00.000Z";
const HOUR = 3_600_000;
const at = (hours) => new Date(Date.parse(FIXED) + hours * HOUR).toISOString();
const digest = (seed) => sha256Digest(`p95:${seed}`);

function result(overrides = {}) {
  const base = {
    token: { marketId: "bitcoin", symbol: "BTC", name: "Bitcoin", assetClass: "crypto" },
    score: 42.4,
    modelBinding: {
      schemaVersion: "velmere.risk-model-binding.v1",
      scoreFormula: "deterministic_continuous_evidence_fusion_v10",
      featureSchemaVersion: "velmere.risk-feature-schema.v2",
      featureSchemaDigest: digest("features"),
      assetClassCohort: "crypto",
      providerConfigurationDigest: digest("providers-a"),
    },
    confidence: 77,
    level: "medium",
    badge: "elevated_risk",
    signals: [{ id: "thin_liquidity", severity: "medium", points: 12, metrics: { liquidity: 100 } }],
    metrics: { currentPrice: 100, marketCap: 1_000_000, volume24h: 50_000 },
    dataQuality: "live",
    dataSources: ["provider-a"],
    providerRiskDelivery: {
      schemaVersion: "pass6_provider_risk_delivery_v1",
      state: "verified",
      scorePublished: true,
      canonicalIdentity: "market:bitcoin",
      sourceReceiptRoot: digest("root-a"),
      receiptDigest: digest("receipt-a"),
      completenessBps: 10_000,
      sourceAsOf: FIXED,
      blockers: [],
    },
    customerTruth: {},
    generatedAt: FIXED,
  };
  return {
    ...base,
    ...overrides,
    token: { ...base.token, ...(overrides.token ?? {}) },
    modelBinding: overrides.modelBinding === null ? undefined : { ...base.modelBinding, ...(overrides.modelBinding ?? {}) },
    providerRiskDelivery: overrides.providerRiskDelivery === null ? undefined : { ...base.providerRiskDelivery, ...(overrides.providerRiskDelivery ?? {}) },
    metrics: { ...base.metrics, ...(overrides.metrics ?? {}) },
  };
}

function current(overrides = {}, publishedScore) {
  const value = result(overrides);
  return alignmentModule.buildRiskHistoryCurrentObservation({
    assetId: "bitcoin",
    result: value,
    publishedScore: publishedScore === undefined ? value.score : publishedScore,
  });
}

function publicHistoryRow(overrides = {}) {
  const value = result(overrides);
  const snapshot = contract.buildRiskHistorySnapshot({
    assetId: "bitcoin",
    result: value,
    observedAt: value.generatedAt,
  });
  const decision = contract.decideRiskHistoryEvent(snapshot);
  if (decision.decision !== "STORE") throw new Error("p95_history_fixture_not_stored");
  const event = decision.event;
  return {
    eventReference: event.eventDigest,
    observedAt: event.observedAt,
    score: event.score,
    level: event.level,
    confidence: event.confidence ?? null,
    eventTypes: event.eventTypes,
    changeReasons: event.changeReasons,
    methodologyVersion: event.methodologyVersion,
    scoreVersion: event.scoreVersion,
    evidenceVersion: event.evidenceVersion,
    comparabilityKey: event.comparabilityKey,
    comparableToPrevious: event.comparableToPrevious,
    isProbability: false,
    probabilityPercent: null,
  };
}

function align(currentObservation, history, historyAssetCanonicalId = "market:bitcoin") {
  return alignmentModule.alignRiskHistoryCurrentObservation({
    current: currentObservation,
    historyAssetCanonicalId,
    history,
  });
}

const available = current();
check("current_observation_schema", available.schemaVersion === alignmentModule.RISK_HISTORY_CURRENT_OBSERVATION_SCHEMA);
check("current_observation_available", available.status === "AVAILABLE" && available.blocker === null, available);
check("current_score_preserves_table_precision", available.score === 42.4 && available.snapshotScore === 42, available);
check("current_identity_bound", available.canonicalAssetId === "market:bitcoin", available.canonicalAssetId);
check("current_versions_bound", Boolean(available.methodologyVersion && available.scoreVersion && available.evidenceVersion && available.comparabilityKey), available);
check("current_observation_verifier_accepts_canonical", alignmentModule.verifyRiskHistoryCurrentObservation(available) === true);
check("current_observation_verifier_rejects_extra_field", alignmentModule.verifyRiskHistoryCurrentObservation({ ...available, providerUrl: "https://private.example" }) === false);
check("current_observation_verifier_rejects_null_available", alignmentModule.verifyRiskHistoryCurrentObservation({ ...available, score: null }) === false);
check("current_score_null_withheld", current({}, null).blocker === "current_score_withheld");
check("current_score_above_range_withheld", current({}, 101).blocker === "current_score_invalid");
check("current_score_nan_withheld", current({}, Number.NaN).blocker === "current_score_invalid");
check("invalid_timestamp_withheld", current({ generatedAt: "2026-08-21 01:00:00" }).blocker === "current_timestamp_invalid");
check("snapshot_build_failure_withheld", current({ signals: null }).blocker === "current_snapshot_build_failed");
check("invalid_snapshot_withheld", current({ level: "impossible" }).blocker === "current_snapshot_invalid");
check("unpublishable_snapshot_withheld", current({ providerRiskDelivery: { state: "withheld", scorePublished: false, blockers: ["rights_withheld"] } }).blocker === "current_snapshot_not_publishable");
check("score_snapshot_mismatch_withheld", current({}, 44).blocker === "current_score_snapshot_mismatch");

const forgedCurrentAlignment = align({ ...available, canonicalAssetId: "market:forged", internalProviderUrl: "https://private.example" }, []);
check("forged_current_object_fails_closed", forgedCurrentAlignment.state === "CURRENT_WITHHELD" && forgedCurrentAlignment.currentDisplayAllowed === false, forgedCurrentAlignment);
check("forged_current_object_drops_sensitive_fields", !JSON.stringify(forgedCurrentAlignment).includes("private.example"), forgedCurrentAlignment);

const empty = align(available, []);
check("history_empty_state", empty.state === "HISTORY_EMPTY", empty);
check("history_empty_current_visible", empty.currentDisplayAllowed === true && empty.historyDisplayAllowed === false, empty);

const sameRow = publicHistoryRow();
const same = align(available, [sameRow]);
check("same_observation_aligned", same.state === "ALIGNED_SAME_OBSERVATION", same);
check("same_observation_both_visible", same.currentDisplayAllowed && same.historyDisplayAllowed, same);
check("same_observation_integer_history_vs_precise_current_supported", same.current.score === 42.4 && same.latestHistory?.score === 42, same);
check("same_observation_no_disclosure_required", same.disclosureRequired === false, same);
check("same_observation_time_delta_zero", same.timeDeltaMs === 0, same.timeDeltaMs);

const newerCurrent = current({ generatedAt: at(1), providerRiskDelivery: { sourceAsOf: at(1) } });
const newerComparable = align(newerCurrent, [sameRow]);
check("current_newer_comparable_state", newerComparable.state === "CURRENT_NEWER_COMPARABLE", newerComparable);
check("current_newer_comparable_current_visible", newerComparable.currentDisplayAllowed && newerComparable.historyDisplayAllowed, newerComparable);
check("current_newer_positive_time_delta", newerComparable.timeDeltaMs === HOUR, newerComparable.timeDeltaMs);

const newerSegmentCurrent = current({
  generatedAt: at(1),
  modelBinding: { providerConfigurationDigest: digest("providers-b") },
  providerRiskDelivery: { sourceAsOf: at(1) },
});
const newerSegment = align(newerSegmentCurrent, [sameRow]);
check("current_newer_segment_state", newerSegment.state === "CURRENT_NEWER_NEW_SEGMENT", newerSegment);
check("current_newer_segment_not_comparable", newerSegment.sameComparableSegment === false && newerSegment.disclosureRequired, newerSegment);

const newerHistoryRow = publicHistoryRow({ generatedAt: at(2), providerRiskDelivery: { sourceAsOf: at(2) } });
const historyNewer = align(available, [newerHistoryRow]);
check("history_newer_state", historyNewer.state === "HISTORY_NEWER_THAN_CURRENT", historyNewer);
check("history_newer_hides_table_score", historyNewer.currentDisplayAllowed === false && historyNewer.historyDisplayAllowed === true, historyNewer);
check("history_newer_negative_time_delta", historyNewer.timeDeltaMs === -2 * HOUR, historyNewer.timeDeltaMs);

const identityConflict = align(available, [sameRow], "market:ethereum");
check("identity_conflict_state", identityConflict.state === "IDENTITY_CONFLICT", identityConflict);
check("identity_conflict_hides_current", identityConflict.currentDisplayAllowed === false && identityConflict.historyDisplayAllowed === true, identityConflict);

const scoreConflictRow = publicHistoryRow({ score: 47.8, level: "medium" });
const scoreConflict = align(available, [scoreConflictRow]);
check("same_time_score_conflict", scoreConflict.state === "SAME_OBSERVATION_CONFLICT", scoreConflict);
check("same_time_score_conflict_hides_current", scoreConflict.currentDisplayAllowed === false && scoreConflict.disclosureRequired, scoreConflict);

const versionConflictRow = publicHistoryRow({ modelBinding: { providerConfigurationDigest: digest("providers-b") } });
const versionConflict = align(available, [versionConflictRow]);
check("same_time_version_conflict", versionConflict.state === "SAME_OBSERVATION_CONFLICT" && versionConflict.sameComparableSegment === false, versionConflict);

const withheldCurrent = current({}, null);
const withheldAlignment = align(withheldCurrent, [sameRow]);
check("withheld_current_state", withheldAlignment.state === "CURRENT_WITHHELD", withheldAlignment);
check("withheld_current_preserves_history", withheldAlignment.currentDisplayAllowed === false && withheldAlignment.historyDisplayAllowed === true, withheldAlignment);
check("withheld_current_does_not_invent_delta", withheldAlignment.timeDeltaMs === null && withheldAlignment.scoreDelta === null, withheldAlignment);

const sensitiveTokens = ["providerRiskDelivery", "sourceReceiptRoot", "receiptDigest", "provider-a", "https://", "rawResponse"];
const serialized = JSON.stringify([available, same, newerComparable, newerSegment, historyNewer, identityConflict, scoreConflict, withheldAlignment]);
check("alignment_projection_excludes_raw_provider_material", sensitiveTokens.every((token) => !serialized.includes(token)), sensitiveTokens.filter((token) => serialized.includes(token)));
check("alignment_schema_versioned", same.schemaVersion === alignmentModule.RISK_HISTORY_CURRENT_ALIGNMENT_SCHEMA);
check("history_reference_digest_only", /^sha256:[a-f0-9]{64}$/u.test(same.latestHistory?.eventReference ?? ""), same.latestHistory?.eventReference);
check("score_is_not_probability", !serialized.includes("probability") && !serialized.includes("forecast"));

const repeated = align(current(), [publicHistoryRow()]);
check("deterministic_alignment_repeat", JSON.stringify(repeated) === JSON.stringify(same));

const failed = checks.filter((row) => row.status !== "PASS");
const receipt = {
  schemaVersion: "velmere.p96.risk-history-current-alignment-runtime.v1",
  generatedAt: "2026-08-21T01:30:00.000Z",
  status: failed.length ? "FAIL" : "PASS_BOUNDED_LOCAL_CURRENT_VS_STORED_ALIGNMENT",
  checks: { total: checks.length, passed: checks.length - failed.length, failed: failed.length, rows: checks },
  execution: { network: "NO_SOCKET", database: "NOT_EXECUTED", browser: "NOT_RENDERED", fixture: "LOCAL_CONTROLLED" },
  zeroFakeCredit: {
    currentTableScoreDeployed: false,
    storedHistoryDeployed: false,
    browserRendered: false,
    realCustomerInput: false,
    riskIndicatorFinal: false,
    customerFinal: "0/20",
  },
  truthBoundary: "The local deterministic runtime proves fail-closed version/time/identity alignment between a current table-score observation and public stored Risk History rows. It does not prove deployed HTTP, PostgreSQL, Browser rendering, real customer input, Risk Indicator FINAL or Customer FINAL.",
};
for (const relative of ["receipts/p96/P96_RISK_HISTORY_CURRENT_ALIGNMENT_RUNTIME.json", "artifacts/p96/P96_RISK_HISTORY_CURRENT_ALIGNMENT_RUNTIME.json"]) {
  const target = path.join(root, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(receipt, null, 2)}\n`);
}
console.log(JSON.stringify({ status: receipt.status, checks: receipt.checks }, null, 2));
if (failed.length) process.exitCode = 1;
