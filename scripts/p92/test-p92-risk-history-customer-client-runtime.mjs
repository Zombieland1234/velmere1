#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";

const client = await import("../../lib/market-integrity/risk-history-customer-client.ts");
const checks = [];
function check(id, condition, detail) {
  const row = { id, status: condition ? "PASS" : "FAIL", ...(detail === undefined ? {} : { detail }) };
  checks.push(row);
  if (!condition) throw new Error(`P92 customer client failed: ${id} ${JSON.stringify(detail ?? null)}`);
}
function expectReject(id, callback, expectedCode = "invalid_customer_projection") {
  let code = null;
  try { callback(); } catch (error) { code = error?.code ?? error?.message ?? "unknown"; }
  check(id, code === expectedCode, code);
}
const d = (char) => `sha256:${char.repeat(64)}`;
const FIXED = "2026-08-20T12:00:00.000Z";
const SECOND = "2026-08-20T13:00:00.000Z";

function event(overrides = {}) {
  return {
    eventReference: d("a"),
    observedAt: FIXED,
    score: 42,
    level: "medium",
    confidence: 77,
    eventTypes: ["TRACKING_STARTED"],
    changeReasons: ["Velmère began verified tracking for this asset."],
    methodologyVersion: "deterministic_continuous_evidence_fusion_v10",
    scoreVersion: d("b"),
    evidenceVersion: "pass6_provider_risk_delivery_v1",
    comparabilityKey: d("c"),
    comparableToPrevious: false,
    isProbability: false,
    probabilityPercent: null,
    ...overrides,
  };
}
function segment(overrides = {}) {
  return {
    comparabilityKey: d("c"),
    methodologyVersion: "deterministic_continuous_evidence_fusion_v10",
    scoreVersion: d("b"),
    evidenceVersion: "pass6_provider_risk_delivery_v1",
    comparableWithPreviousSegment: false,
    startedAt: FIXED,
    endedAt: FIXED,
    ...overrides,
  };
}
function payload(overrides = {}) {
  const base = {
    mode: "stored",
    publication: { evidenceState: "verified", liveClaimed: false, currentness: "event_observation_time_bound" },
    riskHistory: {
      schemaVersion: "velmere.risk-history.customer.v1",
      productId: "risk-indicator",
      capability: "risk-history",
      status: "AVAILABLE",
      asset: { canonicalAssetId: "market:bitcoin", symbol: "BTC", name: "Bitcoin" },
      trackingStartedAt: FIXED,
      observations: 1,
      segments: [segment()],
      history: [event()],
      storage: {
        schemaVersion: "velmere.risk-history-ledger.customer-status.v1",
        storageState: "RUNTIME_ONLY",
        historyCompleteness: "RUNTIME_BOUNDED",
        blockers: ["durable_history_not_configured"],
      },
      limitations: [
        "Risk history begins when Velmère starts verified tracking; it is not reconstructed before that date.",
        "The score is a descriptive review-priority signal, not a probability, price forecast or trade instruction.",
      ],
    },
    generatedAt: FIXED,
  };
  return { ...base, ...overrides };
}

const path = client.buildRiskHistoryCustomerPath("market:bitcoin", 144);
check("safe_relative_path", path === "/api/market-integrity/history?id=market%3Abitcoin&limit=144", path);
expectReject("path_rejects_slash", () => client.buildRiskHistoryCustomerPath("../../admin", 10), "invalid_asset_identity");
expectReject("path_rejects_control", () => client.buildRiskHistoryCustomerPath("btc\nadmin", 10), "invalid_asset_identity");
expectReject("path_rejects_zero", () => client.buildRiskHistoryCustomerPath("bitcoin", 0), "invalid_limit");
expectReject("path_rejects_over_max", () => client.buildRiskHistoryCustomerPath("bitcoin", 145), "invalid_limit");
expectReject("path_rejects_fraction", () => client.buildRiskHistoryCustomerPath("bitcoin", 2.5), "invalid_limit");

const parsed = client.parseRiskHistoryCustomerPayload(payload());
check("valid_payload_parsed", parsed.schemaVersion === client.RISK_HISTORY_CUSTOMER_ROUTE_SCHEMA);
check("live_never_claimed", parsed.publication.liveClaimed === false);
check("score_not_probability", parsed.riskHistory.history.every((row) => row.isProbability === false && row.probabilityPercent === null));
check("tracking_bound", parsed.riskHistory.trackingStartedAt === parsed.riskHistory.history[0].observedAt);
check("customer_storage_only", !Object.hasOwn(parsed.riskHistory.storage, "lastError") && !Object.hasOwn(parsed.riskHistory.storage, "trackedAssets"));

expectReject("rejects_top_level_extra", () => client.parseRiskHistoryCustomerPayload({ ...payload(), rawResponse: {} }));
expectReject("rejects_live_claim", () => client.parseRiskHistoryCustomerPayload({ ...payload(), publication: { ...payload().publication, liveClaimed: true } }));
expectReject("rejects_wrong_currentness", () => client.parseRiskHistoryCustomerPayload({ ...payload(), publication: { ...payload().publication, currentness: "live" } }));
expectReject("rejects_raw_snapshot_field", () => {
  const value = payload(); value.riskHistory.history[0] = { ...value.riskHistory.history[0], snapshot: { private: true } };
  client.parseRiskHistoryCustomerPayload(value);
});
expectReject("rejects_probability", () => {
  const value = payload(); value.riskHistory.history[0] = { ...value.riskHistory.history[0], isProbability: true, probabilityPercent: 42 };
  client.parseRiskHistoryCustomerPayload(value);
});
expectReject("rejects_unknown_event", () => {
  const value = payload(); value.riskHistory.history[0] = { ...value.riskHistory.history[0], eventTypes: ["INSIDER_SIGNAL"] };
  client.parseRiskHistoryCustomerPayload(value);
});
expectReject("rejects_duplicate_event_type", () => {
  const value = payload(); value.riskHistory.history[0] = { ...value.riskHistory.history[0], eventTypes: ["SCORE_CHANGED", "SCORE_CHANGED"] };
  client.parseRiskHistoryCustomerPayload(value);
});
expectReject("rejects_empty_reasons", () => {
  const value = payload(); value.riskHistory.history[0] = { ...value.riskHistory.history[0], changeReasons: [] };
  client.parseRiskHistoryCustomerPayload(value);
});
expectReject("rejects_control_text", () => {
  const value = payload(); value.riskHistory.history[0] = { ...value.riskHistory.history[0], changeReasons: ["safe\ninternal"] };
  client.parseRiskHistoryCustomerPayload(value);
});
expectReject("rejects_noncanonical_time", () => {
  const value = payload(); value.generatedAt = "2026-08-20 12:00:00";
  client.parseRiskHistoryCustomerPayload(value);
});
expectReject("rejects_bad_digest", () => {
  const value = payload(); value.riskHistory.history[0] = { ...value.riskHistory.history[0], eventReference: "sha256:1234" };
  client.parseRiskHistoryCustomerPayload(value);
});
expectReject("rejects_unversioned_public_score", () => {
  const value = payload(); value.riskHistory.history[0] = { ...value.riskHistory.history[0], scoreVersion: "unversioned" };
  client.parseRiskHistoryCustomerPayload(value);
});
expectReject("rejects_observation_mismatch", () => {
  const value = payload(); value.riskHistory.observations = 2;
  client.parseRiskHistoryCustomerPayload(value);
});
expectReject("rejects_status_mismatch", () => {
  const value = payload(); value.riskHistory.status = "WITHHELD";
  client.parseRiskHistoryCustomerPayload(value);
});
expectReject("rejects_publication_mismatch", () => {
  const value = payload(); value.publication.evidenceState = "withheld";
  client.parseRiskHistoryCustomerPayload(value);
});
expectReject("rejects_duplicate_event_reference", () => {
  const value = payload();
  value.riskHistory.history = [event(), event({ observedAt: SECOND })];
  value.riskHistory.observations = 2;
  value.riskHistory.segments[0].endedAt = SECOND;
  client.parseRiskHistoryCustomerPayload(value);
});
expectReject("rejects_out_of_order_history", () => {
  const value = payload();
  value.riskHistory.history = [event({ eventReference: d("d"), observedAt: SECOND }), event()];
  value.riskHistory.observations = 2;
  value.riskHistory.trackingStartedAt = SECOND;
  value.riskHistory.segments[0].endedAt = SECOND;
  client.parseRiskHistoryCustomerPayload(value);
});
expectReject("rejects_unknown_storage_blocker", () => {
  const value = payload(); value.riskHistory.storage.blockers = ["database_password_failed"];
  client.parseRiskHistoryCustomerPayload(value);
});
expectReject("rejects_durable_with_blocker", () => {
  const value = payload(); value.riskHistory.storage.storageState = "DURABLE_VERIFIED"; value.riskHistory.storage.historyCompleteness = "DURABLE_BOUNDED";
  client.parseRiskHistoryCustomerPayload(value);
});
expectReject("rejects_internal_storage_field", () => {
  const value = payload(); value.riskHistory.storage = { ...value.riskHistory.storage, lastError: "secret" };
  client.parseRiskHistoryCustomerPayload(value);
});
expectReject("rejects_available_without_segment", () => {
  const value = payload(); value.riskHistory.segments = [];
  client.parseRiskHistoryCustomerPayload(value);
});
expectReject("rejects_unbound_segment_key", () => {
  const value = payload(); value.riskHistory.history[0] = { ...value.riskHistory.history[0], comparabilityKey: d("d") };
  client.parseRiskHistoryCustomerPayload(value);
});
expectReject("rejects_generated_before_observation", () => {
  const value = payload(); value.generatedAt = "2026-08-20T11:59:59.000Z";
  client.parseRiskHistoryCustomerPayload(value);
});
expectReject("rejects_runtime_wrong_blocker", () => {
  const value = payload(); value.riskHistory.storage.blockers = ["durable_history_readback_not_verified"];
  client.parseRiskHistoryCustomerPayload(value);
});
const durableValue = payload();
durableValue.riskHistory.storage = {
  schemaVersion: "velmere.risk-history-ledger.customer-status.v1",
  storageState: "DURABLE_VERIFIED",
  historyCompleteness: "DURABLE_BOUNDED",
  blockers: [],
};
check("accepts_exact_durable_contract", client.parseRiskHistoryCustomerPayload(durableValue).riskHistory.storage.storageState === "DURABLE_VERIFIED");
expectReject("rejects_too_many_rows", () => {
  const value = payload();
  value.riskHistory.history = Array.from({ length: 145 }, (_, index) => event({ eventReference: `sha256:${index.toString(16).padStart(64, "0")}`, observedAt: new Date(Date.parse(FIXED) + index * 1000).toISOString() }));
  value.riskHistory.observations = 145;
  client.parseRiskHistoryCustomerPayload(value);
});

const emptyValue = payload({
  publication: { evidenceState: "withheld", liveClaimed: false, currentness: "unavailable" },
  riskHistory: {
    ...payload().riskHistory,
    status: "EMPTY",
    asset: { canonicalAssetId: null, symbol: null, name: null },
    trackingStartedAt: null,
    observations: 0,
    segments: [],
    history: [],
  },
});
const emptyParsed = client.parseRiskHistoryCustomerPayload(emptyValue);
check("empty_projection_supported", emptyParsed.riskHistory.status === "EMPTY" && emptyParsed.riskHistory.history.length === 0);

const line = client.buildRiskHistoryChartPolyline([
  event({ score: 0 }),
  event({ eventReference: d("d"), observedAt: SECOND, score: 100 }),
], 100, 50, 5);
check("chart_polyline_bounded", line === "5.00,45.00 95.00,5.00", line);
check("chart_empty_safe", client.buildRiskHistoryChartPolyline([], 100, 50, 5) === "");
check("chart_invalid_dimensions_safe", client.buildRiskHistoryChartPolyline([event()], Number.NaN, 50, 5) === "");

const originalFetch = globalThis.fetch;
let captured = null;
globalThis.fetch = async (input, init) => {
  captured = { input, init };
  return new Response(JSON.stringify(payload()), { status: 200, headers: { "content-type": "application/json" } });
};
const fetched = await client.fetchRiskHistoryCustomerPayload({ assetId: "market:bitcoin", limit: 12 });
check("fetch_returns_strict_projection", fetched.riskHistory.status === "AVAILABLE");
check("fetch_same_origin_relative", captured?.input === "/api/market-integrity/history?id=market%3Abitcoin&limit=12", captured?.input);
check("fetch_no_store", captured?.init?.cache === "no-store");
check("fetch_same_origin_credentials", captured?.init?.credentials === "same-origin");
check("fetch_redirect_error", captured?.init?.redirect === "error");
check("fetch_accept_json", captured?.init?.headers?.accept === "application/json");

globalThis.fetch = async () => new Response(JSON.stringify({ mode: "error" }), { status: 503, headers: { "content-type": "application/json" } });
let requestFailed = null;
try { await client.fetchRiskHistoryCustomerPayload({ assetId: "bitcoin" }); } catch (error) { requestFailed = error?.code; }
check("fetch_non_ok_fails_closed", requestFailed === "request_failed", requestFailed);
globalThis.fetch = originalFetch;

const failed = checks.filter((row) => row.status !== "PASS");
const receipt = {
  schemaVersion: "velmere.p92.risk-history-customer-client-runtime.v1",
  generatedAt: FIXED,
  status: failed.length ? "FAIL" : "PASS_BOUNDED_LOCAL_CUSTOMER_CLIENT",
  checks: { total: checks.length, passed: checks.length - failed.length, failed: failed.length, rows: checks },
  zeroFakeCredit: {
    browserRendered: false,
    realCustomerRouteExecuted: false,
    durableDatabaseProven: false,
    customerFinal: "0/20",
    riskIndicatorFinal: false,
    live: false,
  },
  truthBoundary: "This proves strict client parsing, same-origin bounded fetch configuration, anti-probability semantics and deterministic chart geometry on controlled local payloads. It is not Browser, staging, deployed database or Customer FINAL proof.",
};
await mkdir(new URL("../../receipts/p92/", import.meta.url), { recursive: true });
await mkdir(new URL("../../artifacts/p92/", import.meta.url), { recursive: true });
for (const target of [
  new URL("../../receipts/p92/P92_RISK_HISTORY_CUSTOMER_CLIENT_RUNTIME.json", import.meta.url),
  new URL("../../artifacts/p92/P92_RISK_HISTORY_CUSTOMER_CLIENT_RUNTIME.json", import.meta.url),
]) await writeFile(target, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ status: receipt.status, checks: receipt.checks }, null, 2));
if (failed.length) process.exitCode = 1;
