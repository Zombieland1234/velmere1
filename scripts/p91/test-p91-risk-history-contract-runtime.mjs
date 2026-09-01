#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";

const checks = [];
function check(id, condition, detail) {
  const row = { id, status: condition ? "PASS" : "FAIL", ...(detail === undefined ? {} : { detail }) };
  checks.push(row);
  if (!condition) throw new Error(`P91 risk history contract failed: ${id} ${JSON.stringify(detail ?? null)}`);
}

const history = await import("../../lib/market-integrity/risk-history-contract.ts");
const { sha256Digest } = await import("../../lib/security/cryptographic-digest.ts");

const FIXED = "2026-08-20T12:00:00.000Z";
const HOUR = 3_600_000;
const at = (hours) => new Date(Date.parse(FIXED) + hours * HOUR).toISOString();
const digest = (seed) => sha256Digest(`p91:${seed}`);

function result(overrides = {}) {
  const base = {
    token: { marketId: "bitcoin", symbol: "BTC", name: "Bitcoin", assetClass: "crypto" },
    score: 42,
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

function snapshot(hours, overrides = {}) {
  const r = result({ generatedAt: at(hours), ...overrides });
  return history.buildRiskHistorySnapshot({
    assetId: "bitcoin",
    result: r,
    observedAt: at(hours),
    price: r.metrics.currentPrice,
    marketCap: r.metrics.marketCap,
    volume24h: r.metrics.volume24h,
  });
}

const firstSnapshot = snapshot(0);
check("snapshot_schema", firstSnapshot.schemaVersion === history.RISK_HISTORY_SNAPSHOT_SCHEMA);
check("canonical_market_identity", firstSnapshot.canonicalAssetId === "market:bitcoin" && firstSnapshot.identityClass === "MARKET_ID", firstSnapshot.canonicalAssetId);
check("verified_snapshot_public", firstSnapshot.customerPublishable === true && firstSnapshot.publicationState === "PUBLIC");
check("snapshot_digest_valid", history.verifyRiskHistorySnapshot(firstSnapshot));
check("score_version_bound", /^sha256:[a-f0-9]{64}$/u.test(firstSnapshot.scoreVersion));
check("evidence_version_bound", firstSnapshot.evidenceVersion === "pass6_provider_risk_delivery_v1");
check("comparability_key_bound", /^sha256:[a-f0-9]{64}$/u.test(firstSnapshot.comparabilityKey));

const first = history.decideRiskHistoryEvent(firstSnapshot);
check("first_event_stored", first.decision === "STORE" && first.reason === "FIRST_EVENT");
if (first.decision !== "STORE") throw new Error("first event unavailable");
check("first_marker", first.event.eventTypes.length === 1 && first.event.eventTypes[0] === "TRACKING_STARTED", first.event.eventTypes);
check("first_event_integrity", history.verifyRiskHistoryEvent(first.event));

const exactDuplicate = history.decideRiskHistoryEvent(firstSnapshot, first.event);
check("exact_duplicate_skipped", exactDuplicate.decision === "SKIP" && exactDuplicate.reason === "EXACT_DUPLICATE", exactDuplicate);

const unchangedHour = history.decideRiskHistoryEvent(snapshot(1), first.event);
check("unchanged_under_heartbeat_skipped", unchangedHour.decision === "SKIP" && unchangedHour.reason === "UNCHANGED_WITHIN_HEARTBEAT", unchangedHour);

const heartbeat = history.decideRiskHistoryEvent(snapshot(25), first.event);
check("daily_heartbeat_stored", heartbeat.decision === "STORE" && heartbeat.reason === "HEARTBEAT_DUE", heartbeat);
if (heartbeat.decision !== "STORE") throw new Error("heartbeat unavailable");
check("heartbeat_only_marker", JSON.stringify(heartbeat.event.eventTypes) === JSON.stringify(["HEARTBEAT"]), heartbeat.event.eventTypes);

const scoreChangeSnapshot = snapshot(2, { score: 61, level: "high" });
const scoreChange = history.decideRiskHistoryEvent(scoreChangeSnapshot, first.event);
check("score_change_stored", scoreChange.decision === "STORE");
if (scoreChange.decision !== "STORE") throw new Error("score change unavailable");
check("score_and_level_markers", scoreChange.event.eventTypes.includes("SCORE_CHANGED") && scoreChange.event.eventTypes.includes("LEVEL_CHANGED"), scoreChange.event.eventTypes);
check("score_change_comparable", scoreChange.event.comparableToPrevious === true);

const evidenceChangeSnapshot = snapshot(3, {
  providerRiskDelivery: { receiptDigest: digest("receipt-b"), sourceReceiptRoot: digest("root-b"), sourceAsOf: at(3) },
});
const evidenceChange = history.decideRiskHistoryEvent(evidenceChangeSnapshot, first.event);
check("evidence_change_stored", evidenceChange.decision === "STORE");
if (evidenceChange.decision !== "STORE") throw new Error("evidence change unavailable");
check("evidence_change_marker", evidenceChange.event.eventTypes.includes("EVIDENCE_CHANGED"), evidenceChange.event.eventTypes);

const methodSnapshot = snapshot(4, {
  modelBinding: { providerConfigurationDigest: digest("providers-b") },
  providerRiskDelivery: { sourceAsOf: at(4) },
});
const methodChange = history.decideRiskHistoryEvent(methodSnapshot, first.event);
check("method_change_stored", methodChange.decision === "STORE");
if (methodChange.decision !== "STORE") throw new Error("method change unavailable");
check("method_change_noncomparable", methodChange.event.eventTypes.includes("METHODOLOGY_CHANGED") && methodChange.event.comparableToPrevious === false, methodChange.event);

const withheldSnapshot = snapshot(5, {
  providerRiskDelivery: { state: "withheld", scorePublished: false, blockers: ["rights_currentness_withheld"], sourceAsOf: at(5) },
});
check("withheld_snapshot_not_public", withheldSnapshot.customerPublishable === false && withheldSnapshot.publicationState === "WITHHELD");
const withheld = history.decideRiskHistoryEvent(withheldSnapshot, methodChange.event);
check("publication_withheld_event_stored", withheld.decision === "STORE");
if (withheld.decision !== "STORE") throw new Error("withheld event unavailable");
check("publication_state_marker", withheld.event.eventTypes.includes("PUBLICATION_STATE_CHANGED"), withheld.event.eventTypes);

const unresolved = history.buildRiskHistorySnapshot({
  assetId: "mystery",
  result: result({
    token: { marketId: undefined, tokenAddress: undefined, chainId: undefined, symbol: "MYS", name: "Mystery" },
    providerRiskDelivery: { canonicalIdentity: "symbol:mys" },
  }),
  observedAt: FIXED,
});
check("unresolved_identity_withheld", unresolved.identityClass === "UNRESOLVED" && unresolved.customerPublishable === false, unresolved);

const unversioned = history.buildRiskHistorySnapshot({
  assetId: "bitcoin",
  result: result({ modelBinding: null }),
  observedAt: FIXED,
});
check("unversioned_score_withheld", unversioned.scoreVersion === "unversioned" && unversioned.customerPublishable === false, unversioned);

const tamperedSnapshot = { ...firstSnapshot, score: 99 };
check("tampered_snapshot_rejected", history.verifyRiskHistorySnapshot(tamperedSnapshot) === false);
const tamperedEvent = { ...first.event, score: 99 };
check("tampered_event_rejected", history.verifyRiskHistoryEvent(tamperedEvent) === false);
const collisionSnapshot = { ...snapshot(0), score: 43 };
collisionSnapshot.snapshotDigest = digest("forged-collision");
check("invalid_collision_snapshot_rejected", history.decideRiskHistoryEvent(collisionSnapshot, first.event).decision === "CONFLICT");
const older = history.decideRiskHistoryEvent(snapshot(-1), first.event);
check("non_monotonic_rejected", older.decision === "CONFLICT" && older.reason === "NON_MONOTONIC_TIME", older);

const storage = {
  schemaVersion: "velmere.risk-history-ledger.customer-status.v1",
  storageState: "RUNTIME_ONLY",
  historyCompleteness: "RUNTIME_BOUNDED",
  blockers: ["durable_history_not_configured"],
};
const projection = history.buildCustomerRiskHistoryProjection({
  requestedId: "bitcoin",
  events: [first.event, scoreChange.event, methodChange.event, withheld.event],
  storage,
});
check("customer_projection_available", projection.status === "AVAILABLE" && projection.observations === 3, projection);
check("withheld_event_not_exposed", !projection.history.some((row) => row.observedAt === withheld.event.observedAt));
check("methodology_segments_explicit", projection.segments.length === 2 && projection.segments[1].comparableWithPreviousSegment === false, projection.segments);
check("score_not_probability", projection.history.every((row) => row.isProbability === false && row.probabilityPercent === null));
function collectKeys(value, output = []) {
  if (Array.isArray(value)) for (const item of value) collectKeys(item, output);
  else if (value && typeof value === "object") for (const [key, item] of Object.entries(value)) { output.push(key); collectKeys(item, output); }
  return output;
}
const publicKeys = collectKeys(projection);
check("customer_projection_excludes_raw_market_fields", !["price", "marketCap", "volume24h", "dominantAgent", "raw_snapshot", "lastError"].some((key) => publicKeys.includes(key)), publicKeys);
check("customer_projection_has_durable_boundary", projection.limitations.some((row) => row.includes("durable history is not yet verified")));

const onlyWithheld = history.buildCustomerRiskHistoryProjection({ requestedId: "bitcoin", events: [withheld.event], storage });
check("only_withheld_status", onlyWithheld.status === "WITHHELD" && onlyWithheld.history.length === 0, onlyWithheld);
const empty = history.buildCustomerRiskHistoryProjection({ requestedId: "bitcoin", events: [], storage });
check("empty_status", empty.status === "EMPTY" && empty.trackingStartedAt === null, empty);

const failed = checks.filter((row) => row.status !== "PASS");
const receipt = {
  schemaVersion: "velmere.p91.risk-history-contract-runtime.v1",
  generatedAt: FIXED,
  status: failed.length ? "FAIL" : "PASS_BOUNDED_LOCAL_EVENT_CONTRACT",
  checks: { total: checks.length, passed: checks.length - failed.length, failed: failed.length, rows: checks },
  zeroFakeCredit: {
    realDatabaseExecuted: false,
    durableReadBackProven: false,
    customerFinal: "0/20",
    riskIndicatorFinal: false,
    live: false,
  },
  truthBoundary: "This proves deterministic event selection, version/comparability binding and customer-safe projection on controlled local fixtures. It is not deployed PostgreSQL, staging, production, real provider currentness or Customer FINAL proof.",
};
await mkdir(new URL("../../receipts/p91/", import.meta.url), { recursive: true });
await mkdir(new URL("../../artifacts/p91/", import.meta.url), { recursive: true });
await writeFile(new URL("../../receipts/p91/P91_RISK_HISTORY_CONTRACT_RUNTIME.json", import.meta.url), `${JSON.stringify(receipt, null, 2)}\n`);
await writeFile(new URL("../../artifacts/p91/P91_RISK_HISTORY_CONTRACT_RUNTIME.json", import.meta.url), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ status: receipt.status, checks: receipt.checks }, null, 2));
if (failed.length) process.exitCode = 1;
