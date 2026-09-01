#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";

const checks = [];
function check(id, condition, detail) {
  const row = { id, status: condition ? "PASS" : "FAIL", ...(detail === undefined ? {} : { detail }) };
  checks.push(row);
  if (!condition) throw new Error(`P93 canonical Risk History runtime failed: ${id} ${JSON.stringify(detail ?? null)}`);
}
async function rejects(id, fn, expected = null) {
  let message = null;
  try { await fn(); } catch (error) { message = error instanceof Error ? error.message : String(error); }
  check(id, message !== null && (expected === null || message.includes(expected)), message);
}

const contract = await import("../../lib/market-integrity/risk-history-contract.ts");
const ledger = await import("../../lib/market-integrity/risk-ledger.ts");
const route = await import("../../lib/server/market-integrity-route-modules/history.ts");
const { withPass4825BrokeredEgressTestTransport } = await import("../../lib/network/brokered-egress.ts");
const { canonicalJson } = await import("../../lib/security/canonical-json.ts");
const { sha256Digest } = await import("../../lib/security/cryptographic-digest.ts");

const FIXED = "2026-08-20T12:00:00.000Z";
const at = (minutes) => new Date(Date.parse(FIXED) + minutes * 60_000).toISOString();
const digest = (seed) => sha256Digest(`p93:${seed}`);

function clearConfig() {
  delete process.env.SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
}
function configure() {
  process.env.SUPABASE_URL = "https://p93-risk-history.example.com";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "p93-local-no-socket-service-role-key";
}
function resetLedger() {
  delete globalThis.__velmereRiskHistoryEventLedgerP91;
}
function result(canonicalIdentity, minutes, overrides = {}) {
  const symbol = canonicalIdentity.split(":").at(-1)?.slice(0, 8).toUpperCase() || "ASSET";
  const base = {
    token: { marketId: canonicalIdentity.replace(/^market:/u, ""), symbol, name: `Asset ${symbol}`, assetClass: "crypto" },
    score: 42,
    modelBinding: {
      schemaVersion: "velmere.risk-model-binding.v1",
      scoreFormula: "deterministic_continuous_evidence_fusion_v10",
      featureSchemaVersion: "velmere.risk-feature-schema.v2",
      featureSchemaDigest: digest(`features:${canonicalIdentity}`),
      assetClassCohort: "crypto",
      providerConfigurationDigest: digest(`providers:${canonicalIdentity}`),
    },
    confidence: 76,
    level: "medium",
    badge: "elevated_risk",
    signals: [{ id: "thin_liquidity", severity: "medium", points: 10 }],
    metrics: { currentPrice: 100 },
    dataQuality: "live",
    dataSources: ["provider-a"],
    providerRiskDelivery: {
      schemaVersion: "pass6_provider_risk_delivery_v1",
      state: "verified",
      scorePublished: true,
      canonicalIdentity,
      sourceReceiptRoot: digest(`root:${canonicalIdentity}:${minutes}`),
      receiptDigest: digest(`receipt:${canonicalIdentity}:${minutes}`),
      completenessBps: 10_000,
      sourceAsOf: at(minutes),
      blockers: [],
    },
    customerTruth: {},
    generatedAt: at(minutes),
  };
  return {
    ...base,
    ...overrides,
    token: { ...base.token, ...(overrides.token ?? {}) },
    modelBinding: { ...base.modelBinding, ...(overrides.modelBinding ?? {}) },
    providerRiskDelivery: { ...base.providerRiskDelivery, ...(overrides.providerRiskDelivery ?? {}) },
    metrics: { ...base.metrics, ...(overrides.metrics ?? {}) },
  };
}
function snapshot(alias, canonicalIdentity, minutes, overrides = {}) {
  const r = result(canonicalIdentity, minutes, overrides);
  return contract.buildRiskHistorySnapshot({ assetId: alias, result: r, observedAt: at(minutes), price: r.metrics.currentPrice });
}
function event(alias, canonicalIdentity, minutes, overrides = {}) {
  const decision = contract.decideRiskHistoryEvent(snapshot(alias, canonicalIdentity, minutes, overrides));
  if (decision.decision !== "STORE") throw new Error(`event fixture unavailable: ${decision.reason}`);
  return decision.event;
}
function recomputeEventDigest(value) {
  const { eventDigest: _ignored, ...unsigned } = value;
  return { ...value, eventDigest: sha256Digest(canonicalJson(unsigned)) };
}
function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
}
function requestBody(init) {
  return init.body ? JSON.parse(String(init.body)) : {};
}
function request(url, ip = "203.0.113.10") {
  return new Request(url, { headers: { "x-forwarded-for": ip, "user-agent": "Mozilla/5.0 P93" } });
}
function publicSemantics(payload) {
  return { mode: payload.mode, publication: payload.publication, riskHistory: payload.riskHistory };
}

// Exact application-level event integrity.
const valid = event("shared-alias", "market:alpha", 0);
check("valid_event_integrity", contract.verifyRiskHistoryEvent(valid));
const forgedId = recomputeEventDigest({ ...valid, eventId: `risk-history-${"a".repeat(40)}` });
check("recomputed_digest_cannot_forge_event_id", contract.verifyRiskHistoryEvent(forgedId) === false);
const forgedIdentity = recomputeEventDigest({ ...valid, identityClass: "CHAIN_CONTRACT" });
check("recomputed_digest_cannot_break_snapshot_identity_binding", contract.verifyRiskHistoryEvent(forgedIdentity) === false);
const forgedSymbol = recomputeEventDigest({ ...valid, symbol: "WRONG" });
check("recomputed_digest_cannot_break_symbol_binding", contract.verifyRiskHistoryEvent(forgedSymbol) === false);
const forgedSignalCount = recomputeEventDigest({ ...valid, signalCount: valid.signalCount + 1 });
check("recomputed_digest_cannot_break_signal_count_binding", contract.verifyRiskHistoryEvent(forgedSignalCount) === false);
const forgedTime = recomputeEventDigest({ ...valid, recordedAt: at(-1) });
check("recorded_before_observed_rejected", contract.verifyRiskHistoryEvent(forgedTime) === false);
const duplicateType = recomputeEventDigest({ ...valid, eventTypes: ["TRACKING_STARTED", "TRACKING_STARTED"] });
check("duplicate_event_type_rejected", contract.verifyRiskHistoryEvent(duplicateType) === false);
const extraField = recomputeEventDigest({ ...valid, internalProviderUrl: "https://private.example" });
check("unknown_event_field_rejected", contract.verifyRiskHistoryEvent(extraField) === false);

// Memory resolution must never let one legacy alias mix canonical assets.
clearConfig();
resetLedger();
const alpha = snapshot("shared-alias", "market:alpha", 0);
const beta = snapshot("shared-alias", "market:beta", 1);
const hidden = snapshot("hidden-alias", "market:hidden", 2, {
  providerRiskDelivery: { state: "withheld", scorePublished: false, blockers: ["rights_withheld"] },
});
const unique = snapshot("unique-alias", "market:unique", 3);
const memoryWrite = await ledger.persistRiskSnapshots([alpha, beta, hidden, unique]);
check("memory_fixtures_stored", memoryWrite.stored === 4 && memoryWrite.conflicts === 0, memoryWrite);
const ambiguous = await ledger.getPersistentRiskHistoryResolution("shared-alias", 20);
check("ambiguous_alias_returns_no_events", ambiguous.resolution === "AMBIGUOUS" && ambiguous.canonicalAssetId === null && ambiguous.events.length === 0, ambiguous);
const exactAlpha = await ledger.getPersistentRiskHistoryResolution("market:alpha", 20);
check("exact_canonical_precedes_alias_collision", exactAlpha.resolution === "RESOLVED" && exactAlpha.canonicalAssetId === "market:alpha" && exactAlpha.events.every((row) => row.canonicalAssetId === "market:alpha"), exactAlpha);
const uniqueAlias = await ledger.getPersistentRiskHistoryResolution("unique-alias", 20);
check("unique_alias_resolves_one_canonical_history", uniqueAlias.resolution === "RESOLVED" && uniqueAlias.canonicalAssetId === "market:unique" && uniqueAlias.events.length === 1, uniqueAlias);
const unknown = await ledger.getPersistentRiskHistoryResolution("unknown-alias", 20);
check("unknown_identity_returns_empty_resolution", unknown.resolution === "EMPTY" && unknown.events.length === 0, unknown);
const sharedReaderAmbiguous = await ledger.getPersistentRiskHistoryEvents("shared-alias", 20);
check("shared_cross_product_reader_rejects_ambiguous_alias", sharedReaderAmbiguous.length === 0, sharedReaderAmbiguous);
const sharedReaderExact = await ledger.getPersistentRiskHistoryEvents("market:alpha", 20);
check("shared_cross_product_reader_uses_exact_canonical_identity", sharedReaderExact.length === 1 && sharedReaderExact.every((row) => row.canonicalAssetId === "market:alpha"), sharedReaderExact);
const sharedSnapshotsAmbiguous = await ledger.getPersistentRiskHistory("shared-alias", 20);
check("shared_snapshot_reader_never_mixes_alias_collision", sharedSnapshotsAmbiguous.length === 0, sharedSnapshotsAmbiguous);

const storage = await ledger.getCustomerSafeRiskLedgerStatus();
const emptyUnknown = contract.buildPublicCustomerRiskHistoryProjection({ requestedId: "unknown-alias", ...unknown, storage, limit: 20 });
const emptyAmbiguous = contract.buildPublicCustomerRiskHistoryProjection({ requestedId: "shared-alias", ...ambiguous, storage, limit: 20 });
const hiddenResolution = await ledger.getPersistentRiskHistoryResolution("market:hidden", 20);
const emptyWithheld = contract.buildPublicCustomerRiskHistoryProjection({ requestedId: "market:hidden", ...hiddenResolution, storage, limit: 20 });
check("unknown_ambiguous_withheld_publicly_indistinguishable",
  JSON.stringify(emptyUnknown) === JSON.stringify(emptyAmbiguous) && JSON.stringify(emptyUnknown) === JSON.stringify(emptyWithheld),
  { unknown: emptyUnknown.status, ambiguous: emptyAmbiguous.status, withheld: emptyWithheld.status });
check("public_empty_never_discloses_private_existence", !JSON.stringify(emptyWithheld).includes("Stored observations exist"));
const publicAlpha = contract.buildPublicCustomerRiskHistoryProjection({ requestedId: "market:alpha", ...exactAlpha, storage, limit: 20 });
check("public_exact_history_available", publicAlpha.status === "AVAILABLE" && publicAlpha.asset.canonicalAssetId === "market:alpha" && publicAlpha.observations === 1, publicAlpha);
await rejects("public_builder_rejects_mixed_canonical_events", () => contract.buildPublicCustomerRiskHistoryProjection({
  requestedId: "market:alpha", resolution: "RESOLVED", canonicalAssetId: "market:alpha", events: [valid, event("shared-alias", "market:beta", 4)], storage, limit: 20,
}), "identity_mix");
await rejects("public_builder_rejects_unbound_request_alias", () => contract.buildPublicCustomerRiskHistoryProjection({
  requestedId: "other-alias", resolution: "RESOLVED", canonicalAssetId: "market:alpha", events: [valid], storage, limit: 20,
}), "request_identity_unbound");
await rejects("public_builder_rejects_limit_above_144", () => contract.buildPublicCustomerRiskHistoryProjection({
  requestedId: "market:alpha", resolution: "RESOLVED", canonicalAssetId: "market:alpha", events: [valid], storage, limit: 145,
}), "limit_invalid");

// Service-role no-socket v2 envelope path.
resetLedger();
configure();
const dbAlpha = event("shared-alias", "market:alpha", 0);
const dbUnique = event("unique-alias", "market:unique", 1);
const dbCalls = [];
const databaseTransport = async (url, init) => {
  dbCalls.push({ path: url.pathname, body: requestBody(init) });
  if (!url.pathname.endsWith("/velmere_read_risk_history_by_asset_v2")) return json({ error: "unexpected" }, 404);
  const payload = requestBody(init);
  if (payload.p_asset_id === "market:alpha" || payload.p_asset_id === "shared-alpha-only") {
    return json({ schemaVersion: ledger.RISK_HISTORY_ASSET_RESOLUTION_SCHEMA, resolution: "RESOLVED", canonicalAssetId: "market:alpha", events: [dbAlpha] });
  }
  if (payload.p_asset_id === "unique-alias") {
    return json({ schemaVersion: ledger.RISK_HISTORY_ASSET_RESOLUTION_SCHEMA, resolution: "RESOLVED", canonicalAssetId: "market:unique", events: [dbUnique] });
  }
  if (payload.p_asset_id === "shared-alias") {
    return json({ schemaVersion: ledger.RISK_HISTORY_ASSET_RESOLUTION_SCHEMA, resolution: "AMBIGUOUS", canonicalAssetId: null, events: [] });
  }
  return json({ schemaVersion: ledger.RISK_HISTORY_ASSET_RESOLUTION_SCHEMA, resolution: "EMPTY", canonicalAssetId: null, events: [] });
};
const dbExact = await withPass4825BrokeredEgressTestTransport(databaseTransport, () => ledger.getPersistentRiskHistoryResolution("market:alpha", 12));
check("database_v2_exact_resolution", dbExact.source === "DATABASE" && dbExact.resolution === "RESOLVED" && dbExact.events.length === 1, dbExact);
const readOnlyStatus = await ledger.getCustomerSafeRiskLedgerStatus();
check("read_only_resolution_never_promotes_durable_storage", readOnlyStatus.storageState === "CONFIGURED_UNVERIFIED", readOnlyStatus);
const dbAmbiguous = await withPass4825BrokeredEgressTestTransport(databaseTransport, () => ledger.getPersistentRiskHistoryResolution("shared-alias", 12));
check("database_v2_ambiguous_resolution", dbAmbiguous.resolution === "AMBIGUOUS" && dbAmbiguous.events.length === 0, dbAmbiguous);
const dbSharedReader = await withPass4825BrokeredEgressTestTransport(databaseTransport, () => ledger.getPersistentRiskHistoryEvents("market:alpha", 720));
check("database_shared_cross_product_reader_uses_v2", dbSharedReader.length === 1 && dbSharedReader[0].canonicalAssetId === "market:alpha", dbSharedReader);
check("database_v2_bounded_request", dbCalls.every((row) => row.path.endsWith("/velmere_read_risk_history_by_asset_v2") && Object.keys(row.body).sort().join(",") === "p_asset_id,p_limit")
  && dbCalls.some((row) => row.body.p_limit === 12)
  && dbCalls.some((row) => row.body.p_limit === 720), dbCalls);
await rejects("database_direct_resolution_rejects_above_internal_cap", () => ledger.getPersistentRiskHistoryResolution("market:alpha", 5_001), "risk_history_resolution_limit_invalid");
const extraEnvelopeTransport = async () => json({ schemaVersion: ledger.RISK_HISTORY_ASSET_RESOLUTION_SCHEMA, resolution: "EMPTY", canonicalAssetId: null, events: [], internalCount: 2 });
await rejects("database_envelope_extra_field_fails_closed", () => withPass4825BrokeredEgressTestTransport(extraEnvelopeTransport, () => ledger.getPersistentRiskHistoryResolution("unknown", 12)), "risk_history_resolution_unavailable");
const mixedEnvelopeTransport = async () => json({ schemaVersion: ledger.RISK_HISTORY_ASSET_RESOLUTION_SCHEMA, resolution: "RESOLVED", canonicalAssetId: "market:alpha", events: [dbAlpha, dbUnique] });
await rejects("database_mixed_identity_fails_closed", () => withPass4825BrokeredEgressTestTransport(mixedEnvelopeTransport, () => ledger.getPersistentRiskHistoryResolution("market:alpha", 12)), "risk_history_resolution_unavailable");
const outageTransport = async () => json({ error: "forced outage" }, 503);
await rejects("configured_database_outage_never_falls_back_to_memory_publication", () => withPass4825BrokeredEgressTestTransport(outageTransport, () => ledger.getPersistentRiskHistoryResolution("market:alpha", 12)), "risk_history_resolution_unavailable");
await rejects("configured_database_outage_never_falls_back_in_shared_reader", () => withPass4825BrokeredEgressTestTransport(outageTransport, () => ledger.getPersistentRiskHistoryEvents("market:alpha", 144)), "risk_history_resolution_unavailable");
clearConfig();

// Public route: one payload shape for unknown, ambiguous and private-only cases.
resetLedger();
await ledger.persistRiskSnapshots([alpha, beta, hidden, unique]);
const availableResponse = await route.GET(request("https://velmere.test/api/market-integrity/history?id=market%3Aalpha&limit=12", "203.0.113.20"));
const availablePayload = await availableResponse.json();
check("route_exact_canonical_available", availableResponse.status === 200 && availablePayload.riskHistory?.status === "AVAILABLE" && availablePayload.riskHistory?.asset?.canonicalAssetId === "market:alpha", availablePayload);
const unknownResponse = await route.GET(request("https://velmere.test/api/market-integrity/history?id=unknown-alias&limit=12", "203.0.113.21"));
const ambiguousResponse = await route.GET(request("https://velmere.test/api/market-integrity/history?id=shared-alias&limit=12", "203.0.113.22"));
const hiddenResponse = await route.GET(request("https://velmere.test/api/market-integrity/history?id=market%3Ahidden&limit=12", "203.0.113.23"));
const unknownPayload = await unknownResponse.json();
const ambiguousPayload = await ambiguousResponse.json();
const hiddenPayload = await hiddenResponse.json();
check("route_non_enumerating_payload_semantics",
  JSON.stringify(publicSemantics(unknownPayload)) === JSON.stringify(publicSemantics(ambiguousPayload))
    && JSON.stringify(publicSemantics(unknownPayload)) === JSON.stringify(publicSemantics(hiddenPayload)),
  { unknown: publicSemantics(unknownPayload), ambiguous: publicSemantics(ambiguousPayload), hidden: publicSemantics(hiddenPayload) });
check("route_non_enumerating_status_is_empty", [unknownPayload, ambiguousPayload, hiddenPayload].every((value) => value.riskHistory?.status === "EMPTY" && value.riskHistory?.asset?.canonicalAssetId === null));
check("route_limit_145_rejected_not_clamped", (await route.GET(request("https://velmere.test/api/market-integrity/history?id=market%3Aalpha&limit=145", "203.0.113.24"))).status === 400);
check("route_limit_144_accepted", (await route.GET(request("https://velmere.test/api/market-integrity/history?id=market%3Aalpha&limit=144", "203.0.113.25"))).status === 200);
const headers = availableResponse.headers;
check("route_full_security_headers", headers.get("cache-control") === "no-store"
  && headers.get("x-content-type-options") === "nosniff"
  && headers.get("x-frame-options") === "DENY"
  && headers.get("cross-origin-resource-policy") === "same-origin"
  && headers.get("permissions-policy")?.includes("camera=()") === true
  && headers.get("x-robots-tag")?.includes("noindex") === true,
  Object.fromEntries(headers.entries()));
check("route_rate_limit_headers", headers.get("x-ratelimit-limit") === "36" && headers.get("x-velmere-rate-limit-mode") === "memory", Object.fromEntries(headers.entries()));
check("route_excludes_resolution_and_raw_evidence", !/AMBIGUOUS|canonicalAssetIdCandidates|snapshotDigest|providerUrl|rawResponse|sourceReceiptRoot/iu.test(JSON.stringify(ambiguousPayload)));

let lastRateResponse = null;
for (let index = 0; index < 37; index += 1) {
  lastRateResponse = await route.GET(request("https://velmere.test/api/market-integrity/history?id=unknown-rate-limit", "198.51.100.77"));
}
check("route_37th_request_rate_limited", lastRateResponse?.status === 429, lastRateResponse?.status);

const previousEnv = {
  NODE_ENV: process.env.NODE_ENV,
  VERCEL_ENV: process.env.VERCEL_ENV,
  VERCEL: process.env.VERCEL,
  VELMERE_TRUSTED_PROXY_PROFILE: process.env.VELMERE_TRUSTED_PROXY_PROFILE,
};
process.env.NODE_ENV = "production";
process.env.VERCEL_ENV = "production";
process.env.VERCEL = "1";
process.env.VELMERE_TRUSTED_PROXY_PROFILE = "vercel";
const productionNoDurable = await route.GET(new Request("https://velmere.test/api/market-integrity/history?id=market%3Aalpha", {
  headers: { "x-vercel-forwarded-for": "192.0.2.42", "user-agent": "Mozilla/5.0 P93" },
}));
check("production_missing_durable_limiter_fails_closed", productionNoDurable.status === 503 && (await productionNoDurable.json()).mode === "rate_limit_storage_unavailable", productionNoDurable.status);
for (const [key, value] of Object.entries(previousEnv)) {
  if (value === undefined) delete process.env[key]; else process.env[key] = value;
}

clearConfig();
const failed = checks.filter((row) => row.status !== "PASS");
function sanitizeReceiptDetail(value) {
  if (Array.isArray(value)) return value.map(sanitizeReceiptDetail);
  if (!value || typeof value !== "object") return value;
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (["generatedAt", "lastPersistAt", "lastVerifiedAt"].includes(key)) {
      out[key] = "<runtime-timestamp>";
      continue;
    }
    if (["retry-after", "x-ratelimit-reset"].includes(key.toLowerCase())) {
      out[key] = "<runtime-window>";
      continue;
    }
    out[key] = sanitizeReceiptDetail(item);
  }
  return out;
}
const receiptRows = checks.map((row) => ({
  ...row,
  ...(row.detail === undefined ? {} : { detail: sanitizeReceiptDetail(row.detail) }),
}));
const receipt = {
  schemaVersion: "velmere.p93.risk-history-canonical-resolution-runtime.v1",
  generatedAt: FIXED,
  status: failed.length ? "FAIL" : "PASS_BOUNDED_NO_SOCKET_CANONICAL_PUBLIC_ROUTE",
  checks: { total: checks.length, passed: checks.length - failed.length, failed: failed.length, rows: receiptRows },
  execution: {
    networkSocketsUsed: false,
    realPostgreSqlExecuted: false,
    publicPayloadTimingIndistinguishabilityProven: false,
    canonicalIdentityIsolationExercised: true,
    sharedCrossProductReaderCanonicalized: true,
    payloadEnumerationOracleRemoved: true,
    productionDurableRateLimitMissingFailsClosed: true,
  },
  zeroFakeCredit: {
    browserRendered: false,
    stagingExecuted: false,
    productionExecuted: false,
    riskIndicatorFinal: false,
    customerFinal: "0/20",
    live: false,
  },
  truthBoundary: "This proves exact application-level event integrity, canonical identity isolation across the shared Shield/Angel/report reader, non-enumerating response semantics, bounded public reads and fail-closed limiter behavior using memory and no-socket transports. It does not prove timing indistinguishability, PostgreSQL execution, staging RLS, deployed HTTP behavior, Browser journeys or Customer FINAL.",
};
await mkdir(new URL("../../receipts/p93/", import.meta.url), { recursive: true });
await mkdir(new URL("../../artifacts/p93/", import.meta.url), { recursive: true });
for (const target of [
  new URL("../../receipts/p93/P93_RISK_HISTORY_CANONICAL_RESOLUTION_RUNTIME.json", import.meta.url),
  new URL("../../artifacts/p93/P93_RISK_HISTORY_CANONICAL_RESOLUTION_RUNTIME.json", import.meta.url),
]) await writeFile(target, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ status: receipt.status, checks: receipt.checks, execution: receipt.execution }, null, 2));
if (failed.length) process.exitCode = 1;
