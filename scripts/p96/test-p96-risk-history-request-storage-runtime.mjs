#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";

const checks = [];
function check(id, condition, detail) {
  const row = { id, status: condition ? "PASS" : "FAIL", ...(detail === undefined ? {} : { detail }) };
  checks.push(row);
  if (!condition) throw new Error(`P96 Risk History request/storage runtime failed: ${id} ${JSON.stringify(detail ?? null)}`);
}
async function rejects(id, fn, expected = null) {
  let message = null;
  try { await fn(); } catch (error) { message = error instanceof Error ? error.message : String(error); }
  check(id, message !== null && (expected === null || message.includes(expected)), message);
}
function clone(value) { return structuredClone(value); }

const contract = await import("../../lib/market-integrity/risk-history-contract.ts");
const requestBinding = await import("../../lib/market-integrity/risk-history-customer-request-binding.ts");
const ledger = await import("../../lib/market-integrity/risk-ledger.ts");
const route = await import("../../lib/server/market-integrity-route-modules/history.ts");
const client = await import("../../lib/market-integrity/risk-history-customer-client.ts");
const { withPass4825BrokeredEgressTestTransport } = await import("../../lib/network/brokered-egress.ts");
const { sha256Digest } = await import("../../lib/security/cryptographic-digest.ts");

const FIXED = "2026-08-20T01:00:00.000Z";
const at = (minutes) => new Date(Date.parse(FIXED) + minutes * 60_000).toISOString();
const digest = (seed) => sha256Digest(`p95:${seed}`);

function clearConfig() {
  delete process.env.SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
}
function configure() {
  process.env.SUPABASE_URL = "https://p95-risk-history.example.com";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "p95-local-no-socket-service-role-key";
}
function resetLedger() { delete globalThis.__velmereRiskHistoryEventLedgerP91; }
function result(canonicalIdentity, minute, index, overrides = {}) {
  const symbol = canonicalIdentity.split(":").at(-1)?.slice(0, 8).toUpperCase() || "ASSET";
  const base = {
    token: { marketId: canonicalIdentity.replace(/^market:/u, ""), symbol, name: `Asset ${symbol}`, assetClass: "crypto" },
    score: 40 + index,
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
    metrics: { currentPrice: 100 + index },
    dataQuality: "live",
    dataSources: ["provider-a"],
    providerRiskDelivery: {
      schemaVersion: "pass6_provider_risk_delivery_v1",
      state: "verified",
      scorePublished: true,
      canonicalIdentity,
      sourceReceiptRoot: digest(`root:${canonicalIdentity}:${minute}`),
      receiptDigest: digest(`receipt:${canonicalIdentity}:${minute}`),
      completenessBps: 10_000,
      sourceAsOf: at(minute),
      blockers: [],
    },
    customerTruth: {},
    generatedAt: at(minute),
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
function snapshot(alias, canonicalIdentity, minute, index, overrides = {}) {
  const value = result(canonicalIdentity, minute, index, overrides);
  return contract.buildRiskHistorySnapshot({ assetId: alias, result: value, observedAt: at(minute), price: value.metrics.currentPrice });
}
function request(url, suffix) {
  return new Request(url, { headers: { "x-forwarded-for": `203.0.113.${suffix}`, "user-agent": "Mozilla/5.0 P95" } });
}
function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
}
function requestBody(init) { return init.body ? JSON.parse(String(init.body)) : {}; }
function publicState(payload) {
  const copy = clone(payload);
  delete copy.generatedAt;
  delete copy.requestBinding;
  if (copy.riskHistory?.storage) delete copy.riskHistory.storage.pageEvidenceDigest;
  return copy;
}

clearConfig();
resetLedger();
const snapshots = [0, 1, 2, 3].map((minute, index) => snapshot("p95-alias", "market:p95", minute, index));
const write = await ledger.persistRiskSnapshots(snapshots);
check("memory_fixture_stored", write.stored === 4 && write.conflicts === 0, write);

const firstResponse = await route.GET(request("https://velmere.test/api/market-integrity/history?id=market%3Ap95&limit=2", 95));
const firstRaw = await firstResponse.json();
check("route_v3_and_projection_v3", firstResponse.status === 200
  && firstRaw.schemaVersion === "velmere.risk-history.customer-route.v3"
  && firstRaw.riskHistory.schemaVersion === "velmere.risk-history.customer.v3", {
  route: firstRaw.schemaVersion,
  projection: firstRaw.riskHistory?.schemaVersion,
});
const expectedFirstBinding = requestBinding.buildRiskHistoryCustomerRequestBinding({ assetId: "market:p95", limit: 2, before: null });
check("route_request_binding_exact", JSON.stringify(firstRaw.requestBinding) === JSON.stringify(expectedFirstBinding), firstRaw.requestBinding);
check("request_binding_has_no_raw_asset_id", !JSON.stringify(firstRaw.requestBinding).includes("market:p95"), firstRaw.requestBinding);
const firstParsed = client.parseRiskHistoryCustomerPayload(firstRaw, { assetId: "market:p95", limit: 2, before: null });
check("client_accepts_exact_request", firstParsed.riskHistory.observations === 2 && firstParsed.riskHistory.window.hasOlder, firstParsed.riskHistory.window);
check("memory_page_proof_is_request_scoped", firstParsed.riskHistory.storage.schemaVersion === "velmere.risk-history-page-storage-proof.v2"
  && firstParsed.riskHistory.storage.pageSource === "MEMORY"
  && firstParsed.riskHistory.storage.pageReadState === "RUNTIME_PAGE_ONLY"
  && firstParsed.riskHistory.storage.pageIntegrityVerified
  && !firstParsed.riskHistory.storage.durableRetentionClaimed
  && !firstParsed.riskHistory.storage.backupRestoreProven, firstParsed.riskHistory.storage);
check("memory_page_proof_has_all_required_blockers", JSON.stringify(firstParsed.riskHistory.storage.blockers) === JSON.stringify([
  "database_page_read_not_verified",
  "multi_year_retention_not_proven",
  "backup_restore_not_proven",
]), firstParsed.riskHistory.storage.blockers);
const recomputedFirstDigest = contract.buildRiskHistoryPageEvidenceDigest({
  pageSource: "MEMORY",
  resolution: "RESOLVED",
  canonicalAssetId: firstParsed.riskHistory.asset.canonicalAssetId,
  requestBinding: firstParsed.requestBinding,
  page: {
    requestedLimit: firstParsed.riskHistory.window.requestedLimit,
    before: firstParsed.riskHistory.window.before,
    hasOlder: firstParsed.riskHistory.window.hasOlder,
    nextBefore: firstParsed.riskHistory.window.nextBefore,
  },
  events: firstParsed.riskHistory.history.map((row) => ({ eventReference: row.eventReference, observedAt: row.observedAt })),
});
check("page_evidence_digest_independently_recomputed", recomputedFirstDigest === firstParsed.riskHistory.storage.pageEvidenceDigest, recomputedFirstDigest);

const originalFetch = globalThis.fetch;
const fetchCalls = [];
globalThis.fetch = async (input, init = {}) => {
  fetchCalls.push({ input: String(input), method: init.method, cache: init.cache, credentials: init.credentials, redirect: init.redirect });
  return new Response(JSON.stringify(firstRaw), { status: 200, headers: { "content-type": "application/json" } });
};
try {
  const fetched = await client.fetchRiskHistoryCustomerPayload({ assetId: "market:p95", limit: 2, before: null });
  check("customer_fetch_path_and_policy_are_exact", fetched.requestBinding.pageReference === expectedFirstBinding.pageReference
    && fetchCalls.length === 1
    && fetchCalls[0].input === "/api/market-integrity/history?id=market%3Ap95&limit=2"
    && fetchCalls[0].method === "GET"
    && fetchCalls[0].cache === "no-store"
    && fetchCalls[0].credentials === "same-origin"
    && fetchCalls[0].redirect === "error", fetchCalls);
  await rejects("customer_fetch_rejects_cross_asset_cached_response", () => client.fetchRiskHistoryCustomerPayload({ assetId: "market:other", limit: 2, before: null }), "invalid_customer_projection");
} finally {
  globalThis.fetch = originalFetch;
}

await rejects("client_rejects_wrong_asset_for_valid_payload", () => client.parseRiskHistoryCustomerPayload(firstRaw, { assetId: "market:other", limit: 2, before: null }), "invalid_customer_projection");
await rejects("client_rejects_wrong_limit_for_valid_payload", () => client.parseRiskHistoryCustomerPayload(firstRaw, { assetId: "market:p95", limit: 3, before: null }), "invalid_customer_projection");
await rejects("client_rejects_wrong_cursor_for_valid_payload", () => client.parseRiskHistoryCustomerPayload(firstRaw, { assetId: "market:p95", limit: 2, before: at(2) }), "invalid_customer_projection");
for (const [id, mutate] of [
  ["client_rejects_tampered_asset_reference", (value) => { value.requestBinding.assetReference = digest("wrong-asset"); }],
  ["client_rejects_tampered_page_reference", (value) => { value.requestBinding.pageReference = digest("wrong-page"); }],
  ["client_rejects_tampered_page_source", (value) => { value.riskHistory.storage.pageSource = "DATABASE"; }],
  ["client_rejects_tampered_page_read_state", (value) => { value.riskHistory.storage.pageReadState = "DATABASE_PAGE_RESPONSE_VERIFIED"; }],
  ["client_rejects_durable_retention_overclaim", (value) => { value.riskHistory.storage.durableRetentionClaimed = true; }],
  ["client_rejects_backup_restore_overclaim", (value) => { value.riskHistory.storage.backupRestoreProven = true; }],
  ["client_rejects_tampered_page_evidence_digest", (value) => { value.riskHistory.storage.pageEvidenceDigest = digest("wrong-evidence"); }],
  ["client_rejects_tampered_event_reference", (value) => { value.riskHistory.history[0].eventReference = digest("wrong-event"); }],
  ["client_rejects_storage_extra_field", (value) => { value.riskHistory.storage.internalState = "durable"; }],
  ["client_rejects_top_level_extra_field", (value) => { value.internal = true; }],
]) {
  const bad = clone(firstRaw);
  mutate(bad);
  await rejects(id, () => client.parseRiskHistoryCustomerPayload(bad, { assetId: "market:p95", limit: 2, before: null }), "invalid_customer_projection");
}

const before = firstParsed.riskHistory.window.nextBefore;
const secondResponse = await route.GET(request(`https://velmere.test/api/market-integrity/history?id=market%3Ap95&limit=2&before=${encodeURIComponent(before)}`, 96));
const secondRaw = await secondResponse.json();
const secondParsed = client.parseRiskHistoryCustomerPayload(secondRaw, { assetId: "market:p95", limit: 2, before });
check("second_page_binding_is_cursor_specific", secondParsed.requestBinding.assetReference === firstParsed.requestBinding.assetReference
  && secondParsed.requestBinding.pageReference !== firstParsed.requestBinding.pageReference
  && secondParsed.requestBinding.before === before, secondParsed.requestBinding);
check("second_page_evidence_digest_is_page_specific", secondParsed.riskHistory.storage.pageEvidenceDigest !== firstParsed.riskHistory.storage.pageEvidenceDigest);
const merged = client.mergeRiskHistoryCustomerPages([firstParsed, secondParsed]);
check("two_bound_pages_merge_to_complete_history", merged?.observations === 4 && merged.completeVisibleHistory && !merged.hasOlder, merged);
const wrongAssetPage = clone(secondParsed);
wrongAssetPage.requestBinding = requestBinding.buildRiskHistoryCustomerRequestBinding({ assetId: "market:other", limit: 2, before });
await rejects("merge_rejects_cross_asset_request_binding", () => client.mergeRiskHistoryCustomerPages([firstParsed, wrongAssetPage]), "incompatible_history_pages");
const duplicateBindingPage = clone(secondParsed);
duplicateBindingPage.requestBinding = clone(firstParsed.requestBinding);
await rejects("merge_rejects_duplicate_page_binding", () => client.mergeRiskHistoryCustomerPages([firstParsed, duplicateBindingPage]), "incompatible_history_pages");

// A global durability flag from another operation must never promote this
// exact memory page. This proves the old process-global bleed is gone.
globalThis.__velmereRiskHistoryEventLedgerP91.durabilityState = "DURABLE_READBACK_VERIFIED";
const bleedResponse = await route.GET(request("https://velmere.test/api/market-integrity/history?id=market%3Ap95&limit=2", 97));
const bleedRaw = await bleedResponse.json();
const bleedParsed = client.parseRiskHistoryCustomerPayload(bleedRaw, { assetId: "market:p95", limit: 2, before: null });
check("global_durable_state_cannot_promote_memory_page", bleedParsed.riskHistory.storage.pageSource === "MEMORY"
  && bleedParsed.riskHistory.storage.pageReadState === "RUNTIME_PAGE_ONLY"
  && bleedParsed.riskHistory.storage.blockers.includes("database_page_read_not_verified"), bleedParsed.riskHistory.storage);
check("route_no_longer_exposes_global_ledger_status_fields", !/storageState|historyCompleteness|DURABLE_VERIFIED/iu.test(JSON.stringify(bleedRaw)));

// Non-enumeration: unknown, ambiguous and private-only requests have the same
// public state after removing request-specific reflection hashes and time.
const alpha = snapshot("shared-p95", "market:alpha-p95", 10, 10);
const beta = snapshot("shared-p95", "market:beta-p95", 11, 11);
const privateOnly = snapshot("private-only-p95", "market:private-p95", 12, 12, {
  providerRiskDelivery: { state: "withheld", scorePublished: false, blockers: ["rights_withheld"] },
});
await ledger.persistRiskSnapshots([alpha, beta, privateOnly]);
const unknownRaw = await (await route.GET(request("https://velmere.test/api/market-integrity/history?id=unknown-p95&limit=2", 98))).json();
const ambiguousRaw = await (await route.GET(request("https://velmere.test/api/market-integrity/history?id=shared-p95&limit=2", 99))).json();
const privateRaw = await (await route.GET(request("https://velmere.test/api/market-integrity/history?id=market%3Aprivate-p95&limit=2", 100))).json();
check("unknown_ambiguous_private_public_state_is_identical", JSON.stringify(publicState(unknownRaw)) === JSON.stringify(publicState(ambiguousRaw))
  && JSON.stringify(publicState(unknownRaw)) === JSON.stringify(publicState(privateRaw)));
check("empty_responses_do_not_expose_private_identity", !/private-p95|rights_withheld|shared-p95|alpha-p95|beta-p95/iu.test(JSON.stringify(publicState(privateRaw))));

// No-socket database page proof. The exact database page response is verified,
// but it still cannot claim long-term retention or restore.
// Use already verified event rows from the memory ledger fixture to avoid
// reconstructing a synthetic database shape through a second implementation.
clearConfig();
resetLedger();
await ledger.persistRiskSnapshots(snapshots);
const dbSource = await ledger.getPublicRiskHistoryResolution("market:p95", 2, null);
configure();
const dbCalls = [];
const dbTransport = async (url, init) => {
  const body = requestBody(init);
  dbCalls.push({ path: url.pathname, body });
  if (!url.pathname.endsWith("/velmere_read_public_risk_history_by_asset_v1")) return json({ error: "unexpected" }, 404);
  return json({
    schemaVersion: ledger.RISK_HISTORY_PUBLIC_RESOLUTION_SCHEMA,
    resolution: "RESOLVED",
    canonicalAssetId: "market:p95",
    events: dbSource.events,
    requestBinding: {
      schemaVersion: "velmere.risk-history-public-request-binding.v1",
      requestedId: String(body.p_asset_id).toLowerCase(),
      resolutionKind: "CANONICAL",
    },
    page: {
      requestedLimit: body.p_limit,
      before: body.p_before,
      hasOlder: true,
      nextBefore: dbSource.events[0].observedAt,
    },
  });
};
const dbResponse = await withPass4825BrokeredEgressTestTransport(dbTransport, () => route.GET(request("https://velmere.test/api/market-integrity/history?id=market%3Ap95&limit=2", 101)));
const dbRaw = await dbResponse.json();
const dbParsed = client.parseRiskHistoryCustomerPayload(dbRaw, { assetId: "market:p95", limit: 2, before: null });
check("database_page_response_proof_is_separate_from_durability", dbParsed.riskHistory.storage.pageSource === "DATABASE"
  && dbParsed.riskHistory.storage.pageReadState === "DATABASE_PAGE_RESPONSE_VERIFIED"
  && !dbParsed.riskHistory.storage.durableRetentionClaimed
  && !dbParsed.riskHistory.storage.backupRestoreProven
  && JSON.stringify(dbParsed.riskHistory.storage.blockers) === JSON.stringify(["multi_year_retention_not_proven", "backup_restore_not_proven"]), dbParsed.riskHistory.storage);
check("database_rpc_method_and_body_are_exact", dbCalls.length === 1
  && dbCalls[0].path.endsWith("/velmere_read_public_risk_history_by_asset_v1")
  && JSON.stringify(Object.keys(dbCalls[0].body).sort()) === JSON.stringify(["p_asset_id", "p_before", "p_limit"]), dbCalls);
check("database_page_digest_differs_from_memory_page_digest", dbParsed.riskHistory.storage.pageEvidenceDigest !== firstParsed.riskHistory.storage.pageEvidenceDigest);
await rejects("merge_rejects_mixed_memory_and_database_pages", () => client.mergeRiskHistoryCustomerPages([firstParsed, dbParsed]), "incompatible_history_pages");
const outageTransport = async () => json({ error: "forced" }, 503);
const outageResponse = await withPass4825BrokeredEgressTestTransport(outageTransport, () => route.GET(request("https://velmere.test/api/market-integrity/history?id=market%3Ap95&limit=2", 102)));
check("configured_database_outage_fails_closed_without_memory_page", outageResponse.status === 503, outageResponse.status);
clearConfig();

await rejects("page_evidence_builder_rejects_event_count_above_limit", () => contract.buildRiskHistoryPageEvidenceDigest({
  pageSource: "MEMORY",
  resolution: "RESOLVED",
  canonicalAssetId: "market:p95",
  requestBinding: requestBinding.buildRiskHistoryCustomerRequestBinding({ assetId: "market:p95", limit: 1, before: null }),
  page: { requestedLimit: 1, before: null, hasOlder: false, nextBefore: null },
  events: firstParsed.riskHistory.history.map((row) => ({ eventReference: row.eventReference, observedAt: row.observedAt })),
}), "event_count_invalid");
await rejects("page_evidence_builder_rejects_wrong_next_cursor", () => contract.buildRiskHistoryPageEvidenceDigest({
  pageSource: "MEMORY",
  resolution: "RESOLVED",
  canonicalAssetId: "market:p95",
  requestBinding: expectedFirstBinding,
  page: { requestedLimit: 2, before: null, hasOlder: true, nextBefore: firstParsed.riskHistory.history.at(-1).observedAt },
  events: firstParsed.riskHistory.history.map((row) => ({ eventReference: row.eventReference, observedAt: row.observedAt })),
}), "next_cursor_invalid");
await rejects("page_evidence_builder_rejects_event_at_cursor", () => contract.buildRiskHistoryPageEvidenceDigest({
  pageSource: "MEMORY",
  resolution: "RESOLVED",
  canonicalAssetId: "market:p95",
  requestBinding: requestBinding.buildRiskHistoryCustomerRequestBinding({ assetId: "market:p95", limit: 1, before: firstParsed.riskHistory.history[0].observedAt }),
  page: { requestedLimit: 1, before: firstParsed.riskHistory.history[0].observedAt, hasOlder: false, nextBefore: null },
  events: [{ eventReference: firstParsed.riskHistory.history[0].eventReference, observedAt: firstParsed.riskHistory.history[0].observedAt }],
}), "event_cursor_invalid");
const malformedBinding = clone(expectedFirstBinding);
malformedBinding.pageReference = digest("forged-page-reference");
await rejects("page_evidence_builder_rejects_malformed_binding_shape", () => contract.buildRiskHistoryPageEvidenceDigest({
  pageSource: "MEMORY",
  resolution: "RESOLVED",
  canonicalAssetId: "market:p95",
  requestBinding: malformedBinding,
  page: { requestedLimit: 2, before: null, hasOlder: true, nextBefore: firstParsed.riskHistory.history[0].observedAt },
  events: firstParsed.riskHistory.history.map((row) => ({ eventReference: row.eventReference, observedAt: row.observedAt })),
}), "input_invalid");

check("request_path_is_same_origin_and_cursor_canonical", client.buildRiskHistoryCustomerPath("market:p95", 2, before) === `/api/market-integrity/history?id=market%3Ap95&limit=2&before=${encodeURIComponent(before)}`);
await rejects("request_binding_builder_rejects_invalid_cursor", () => requestBinding.buildRiskHistoryCustomerRequestBinding({ assetId: "market:p95", limit: 2, before: "2026-08-20" }), "cursor_invalid");
await rejects("request_binding_shape_rejects_extra_field", () => {
  const value = { ...expectedFirstBinding, rawId: "market:p95" };
  if (!requestBinding.verifyRiskHistoryCustomerRequestBindingShape(value)) throw new Error("shape_rejected");
}, "shape_rejected");

const failed = checks.filter((row) => row.status !== "PASS");
const receipt = {
  schemaVersion: "velmere.p96.risk-history-request-storage-runtime.v1",
  generatedAt: FIXED,
  status: failed.length ? "FAIL" : "PASS_BOUNDED_NO_SOCKET_REQUEST_BOUND_PAGE_PROVENANCE",
  checks: {
    total: checks.length,
    passed: checks.length - failed.length,
    failed: failed.length,
    rows: checks,
  },
  execution: {
    networkSocketsUsed: false,
    realPostgreSqlExecuted: false,
    cryptographicRequestBindingExercised: true,
    pageEvidenceDigestIndependentlyRecomputed: true,
    processGlobalDurabilityBleedRejected: true,
    memoryAndDatabasePageSourcesSeparated: true,
    crossAssetAndCrossCursorReplayRejected: true,
    nonEnumeratingEmptySemanticsExercised: true,
  },
  zeroFakeCredit: {
    stagingExecuted: false,
    productionExecuted: false,
    multiYearRetentionProven: false,
    backupRestoreProven: false,
    browserRendered: false,
    riskIndicatorFinal: false,
    customerFinal: "0/20",
    live: false,
  },
  truthBoundary: "This bounded no-socket proof verifies cryptographic binding of each customer response to the requested asset/limit/cursor, page-specific evidence digests, per-page DATABASE versus MEMORY provenance, rejection of process-global durability bleed, strict multi-page merging and non-enumerating empty behavior. It does not execute PostgreSQL, prove retention/backup restoration, render a Browser, deploy HTTP, use real customer-authorized input, run exact Windows or establish Customer FINAL.",
};
await mkdir(new URL("../../receipts/p96/", import.meta.url), { recursive: true });
await mkdir(new URL("../../artifacts/p96/", import.meta.url), { recursive: true });
for (const target of [
  new URL("../../receipts/p96/P96_RISK_HISTORY_REQUEST_STORAGE_RUNTIME.json", import.meta.url),
  new URL("../../artifacts/p96/P96_RISK_HISTORY_REQUEST_STORAGE_RUNTIME.json", import.meta.url),
]) await writeFile(target, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ status: receipt.status, checks: receipt.checks, execution: receipt.execution }, null, 2));
if (failed.length) process.exitCode = 1;
