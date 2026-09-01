#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";

const checks = [];
function check(id, condition, detail) {
  const row = { id, status: condition ? "PASS" : "FAIL", ...(detail === undefined ? {} : { detail }) };
  checks.push(row);
  if (!condition) throw new Error(`P94 public Risk History runtime failed: ${id} ${JSON.stringify(detail ?? null)}`);
}
async function rejects(id, fn, expected = null) {
  let message = null;
  try { await fn(); } catch (error) { message = error instanceof Error ? error.message : String(error); }
  check(id, message !== null && (expected === null || message.includes(expected)), message);
}

const contract = await import("../../lib/market-integrity/risk-history-contract.ts");
const ledger = await import("../../lib/market-integrity/risk-ledger.ts");
const route = await import("../../lib/server/market-integrity-route-modules/history.ts");
const client = await import("../../lib/market-integrity/risk-history-customer-client.ts");
const { withPass4825BrokeredEgressTestTransport } = await import("../../lib/network/brokered-egress.ts");
const { sha256Digest } = await import("../../lib/security/cryptographic-digest.ts");

const FIXED = "2026-08-20T08:00:00.000Z";
const at = (minutes) => new Date(Date.parse(FIXED) + minutes * 60_000).toISOString();
const digest = (seed) => sha256Digest(`p94:${seed}`);

function clearConfig() {
  delete process.env.SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
}
function configure() {
  process.env.SUPABASE_URL = "https://p94-risk-history.example.com";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "p94-local-no-socket-service-role-key";
}
function resetLedger() {
  delete globalThis.__velmereRiskHistoryEventLedgerP91;
}
function result(canonicalIdentity, minutes, index, overrides = {}) {
  const symbol = canonicalIdentity.split(":").at(-1)?.slice(0, 8).toUpperCase() || "ASSET";
  const score = index % 2 === 0 ? 40 : 41;
  const base = {
    token: { marketId: canonicalIdentity.replace(/^market:/u, ""), symbol, name: `Asset ${symbol}`, assetClass: "crypto" },
    score,
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
function snapshot(alias, canonicalIdentity, minutes, index, overrides = {}) {
  const r = result(canonicalIdentity, minutes, index, overrides);
  return contract.buildRiskHistorySnapshot({ assetId: alias, result: r, observedAt: at(minutes), price: r.metrics.currentPrice });
}
function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
}
function requestBody(init) { return init.body ? JSON.parse(String(init.body)) : {}; }
function request(url, ip) {
  return new Request(url, { headers: { "x-forwarded-for": ip, "user-agent": "Mozilla/5.0 P94" } });
}
function publicSemantics(payload) {
  return { schemaVersion: payload.schemaVersion, mode: payload.mode, publication: payload.publication, riskHistory: payload.riskHistory };
}
function clone(value) { return structuredClone(value); }

// Build 150 public events and 12 interleaved private events. The oldest public
// event uses an alias not repeated in the latest page, proving request binding
// cannot be inferred only from returned rows.
clearConfig();
resetLedger();
const snapshots = [];
let publicIndex = 0;
for (let minute = 0; minute < 162; minute += 1) {
  const hidden = minute > 0 && minute % 13 === 0;
  if (hidden) {
    snapshots.push(snapshot("private-p94-alias", "market:p94", minute, minute, {
      providerRiskDelivery: { state: "withheld", scorePublished: false, blockers: ["rights_withheld"] },
    }));
  } else {
    const alias = publicIndex === 0 ? "legacy-old-alias" : "current-alias";
    snapshots.push(snapshot(alias, "market:p94", minute, minute));
    publicIndex += 1;
  }
}
check("fixture_contains_exactly_150_public_events", publicIndex === 150, publicIndex);
const write = await ledger.persistRiskSnapshots(snapshots);
check("fixture_events_stored_without_conflict", write.stored === 162 && write.conflicts === 0, {
  attempted: write.attempted,
  stored: write.stored,
  skipped: write.skipped,
  conflicts: write.conflicts,
  durabilityState: write.durabilityState,
});
const internalP94 = await ledger.getPersistentRiskHistoryResolution("market:p94", 5_000);
const privateP94Event = internalP94.events.find((row) => !row.customerPublishable && row.publicationState === "WITHHELD");
check("fixture_contains_verified_private_event_for_negative_controls", Boolean(privateP94Event), privateP94Event?.eventId ?? null);

const first = await ledger.getPublicRiskHistoryResolution("market:p94", 144, null);
check("latest_page_resolves_canonical_identity", first.resolution === "RESOLVED" && first.canonicalAssetId === "market:p94" && first.requestBinding.resolutionKind === "CANONICAL", first.requestBinding);
check("latest_page_contains_144_public_events", first.events.length === 144 && first.events.every((row) => row.customerPublishable && row.publicationState === "PUBLIC"), first.events.length);
check("private_events_do_not_consume_public_limit", first.events.every((row) => row.assetId !== "private-p94-alias"), { returned: first.events.length });
check("latest_page_has_older_cursor", first.page.before === null && first.page.hasOlder && first.page.nextBefore === first.events[0].observedAt, first.page);
check("latest_page_does_not_include_old_only_alias", first.events.every((row) => row.assetId !== "legacy-old-alias"));
const second = await ledger.getPublicRiskHistoryResolution("market:p94", 144, first.page.nextBefore);
check("older_page_contains_remaining_six_public_events", second.events.length === 6 && !second.page.hasOlder && second.page.nextBefore === null, second.page);
check("older_page_cursor_is_exclusive", second.events.every((row) => Date.parse(row.observedAt) < Date.parse(first.page.nextBefore)), second.events.map((row) => row.observedAt));
check("older_page_reaches_oldest_public_alias", second.events[0].assetId === "legacy-old-alias", second.events[0].assetId);
const exhausted = await ledger.getPublicRiskHistoryResolution("market:p94", 144, second.events[0].observedAt);
check("exhausted_window_normalizes_to_empty", exhausted.resolution === "EMPTY" && exhausted.events.length === 0 && exhausted.requestBinding.resolutionKind === null, exhausted);

const aliasFirst = await ledger.getPublicRiskHistoryResolution("legacy-old-alias", 144, null);
check("old_only_alias_resolves_latest_page", aliasFirst.resolution === "RESOLVED" && aliasFirst.events.length === 144 && aliasFirst.requestBinding.resolutionKind === "UNIQUE_ALIAS", aliasFirst.requestBinding);
check("old_only_alias_binding_is_explicit_not_returned_row_dependent", aliasFirst.events.every((row) => row.assetId !== "legacy-old-alias") && aliasFirst.requestBinding.requestedId === "legacy-old-alias");

const alpha = snapshot("shared-p94", "market:alpha-p94", 300, 300);
const beta = snapshot("shared-p94", "market:beta-p94", 301, 301);
const privateOnly = snapshot("private-only-p94", "market:private-p94", 302, 302, {
  providerRiskDelivery: { state: "withheld", scorePublished: false, blockers: ["rights_withheld"] },
});
const extraWrite = await ledger.persistRiskSnapshots([alpha, beta, privateOnly]);
check("non_enumeration_fixtures_stored", extraWrite.stored === 3 && extraWrite.conflicts === 0, extraWrite);
const unknown = await ledger.getPublicRiskHistoryResolution("unknown-p94", 20, null);
const ambiguous = await ledger.getPublicRiskHistoryResolution("shared-p94", 20, null);
const privateResult = await ledger.getPublicRiskHistoryResolution("market:private-p94", 20, null);
check("unknown_ambiguous_private_all_empty", [unknown, ambiguous, privateResult].every((row) => row.resolution === "EMPTY" && row.events.length === 0 && row.requestBinding.resolutionKind === null));

const storage = await ledger.getCustomerSafeRiskLedgerStatus();
const firstProjection = contract.buildPublicCustomerRiskHistoryProjection({ requestedId: "market:p94", ...first, storage, limit: 144 });
const secondProjection = contract.buildPublicCustomerRiskHistoryProjection({ requestedId: "market:p94", ...second, storage, limit: 144 });
const aliasProjection = contract.buildPublicCustomerRiskHistoryProjection({ requestedId: "legacy-old-alias", ...aliasFirst, storage, limit: 144 });
check("latest_projection_truthfully_bounded", firstProjection.window.isLatestWindow && firstProjection.window.hasOlder && !firstProjection.window.reachesTrackingStart && !firstProjection.window.completeVisibleHistory && firstProjection.trackingStartedAt === null, firstProjection.window);
check("older_projection_reaches_public_tracking_start", !secondProjection.window.isLatestWindow && !secondProjection.window.hasOlder && secondProjection.window.reachesTrackingStart && !secondProjection.window.completeVisibleHistory && secondProjection.trackingStartedAt === secondProjection.history[0].observedAt, secondProjection.window);
check("alias_projection_request_binding_allows_latest_window", aliasProjection.status === "AVAILABLE" && aliasProjection.asset.canonicalAssetId === "market:p94", aliasProjection.asset);
const unknownProjection = contract.buildPublicCustomerRiskHistoryProjection({ requestedId: "unknown-p94", ...unknown, storage, limit: 20 });
const ambiguousProjection = contract.buildPublicCustomerRiskHistoryProjection({ requestedId: "shared-p94", ...ambiguous, storage, limit: 20 });
const privateProjection = contract.buildPublicCustomerRiskHistoryProjection({ requestedId: "market:private-p94", ...privateResult, storage, limit: 20 });
check("public_empty_projection_is_non_enumerating", JSON.stringify(unknownProjection) === JSON.stringify(ambiguousProjection) && JSON.stringify(unknownProjection) === JSON.stringify(privateProjection));
check("public_projection_contains_no_private_payload", !/private-p94|rights_withheld|sourceReceiptRoot|snapshotDigest|rawResponse|providerUrl/iu.test(JSON.stringify(firstProjection)));
await rejects("builder_rejects_unbound_alias_binding", () => contract.buildPublicCustomerRiskHistoryProjection({
  requestedId: "wrong-alias", ...aliasFirst, storage, limit: 144,
}), "request_identity_unbound");
await rejects("builder_rejects_private_event_crossing_boundary", () => contract.buildPublicCustomerRiskHistoryProjection({
  requestedId: "market:p94", resolution: "RESOLVED", canonicalAssetId: "market:p94", events: [privateP94Event],
  requestBinding: { schemaVersion: "velmere.risk-history-public-request-binding.v1", requestedId: "market:p94", resolutionKind: "CANONICAL" },
  page: { requestedLimit: 1, before: null, hasOlder: false, nextBefore: null }, storage, limit: 1,
}), "nonpublic_event");
await rejects("builder_rejects_cursor_at_or_before_event", () => contract.buildPublicCustomerRiskHistoryProjection({
  requestedId: "market:p94", resolution: "RESOLVED", canonicalAssetId: "market:p94", events: [first.events.at(-1)],
  requestBinding: first.requestBinding, page: { requestedLimit: 1, before: first.events.at(-1).observedAt, hasOlder: false, nextBefore: null }, storage, limit: 1,
}), "cursor_boundary");

// Route v2 with exact cursor semantics and one non-enumerating empty shape.
const latestRouteResponse = await route.GET(request("https://velmere.test/api/market-integrity/history?id=market%3Ap94&limit=144", "203.0.113.94"));
const latestRoutePayload = await latestRouteResponse.json();
check("route_v2_schema_is_physical", latestRouteResponse.status === 200 && latestRoutePayload.schemaVersion === route.RISK_HISTORY_PUBLIC_ROUTE_SCHEMA && latestRoutePayload.riskHistory.schemaVersion === contract.RISK_HISTORY_PUBLIC_CUSTOMER_SCHEMA, latestRoutePayload.schemaVersion);
check("route_latest_window_truth", latestRoutePayload.riskHistory.window.hasOlder && latestRoutePayload.riskHistory.window.nextBefore === first.page.nextBefore, latestRoutePayload.riskHistory.window);
const cursorUrl = `https://velmere.test/api/market-integrity/history?id=market%3Ap94&limit=144&before=${encodeURIComponent(first.page.nextBefore)}`;
const olderRouteResponse = await route.GET(request(cursorUrl, "203.0.113.95"));
const olderRoutePayload = await olderRouteResponse.json();
check("route_older_window_returns_six", olderRouteResponse.status === 200 && olderRoutePayload.riskHistory.observations === 6 && olderRoutePayload.riskHistory.window.reachesTrackingStart, olderRoutePayload.riskHistory.window);
check("route_security_headers_preserved", latestRouteResponse.headers.get("cache-control") === "no-store"
  && latestRouteResponse.headers.get("x-content-type-options") === "nosniff"
  && latestRouteResponse.headers.get("x-frame-options") === "DENY"
  && latestRouteResponse.headers.get("cross-origin-resource-policy") === "same-origin"
  && latestRouteResponse.headers.get("x-robots-tag")?.includes("noindex") === true, Object.fromEntries(latestRouteResponse.headers.entries()));
check("route_duplicate_before_rejected", (await route.GET(request(`${cursorUrl}&before=${encodeURIComponent(first.page.nextBefore)}`, "203.0.113.96"))).status === 400);
check("route_invalid_cursor_rejected", (await route.GET(request("https://velmere.test/api/market-integrity/history?id=market%3Ap94&before=not-time", "203.0.113.97"))).status === 400);
check("route_future_cursor_rejected", (await route.GET(request("https://velmere.test/api/market-integrity/history?id=market%3Ap94&before=2099-01-01T00%3A00%3A00.000Z", "203.0.113.98"))).status === 400);
check("route_unsupported_key_rejected", (await route.GET(request("https://velmere.test/api/market-integrity/history?id=market%3Ap94&raw=true", "203.0.113.99"))).status === 400);
const routeUnknown = await (await route.GET(request("https://velmere.test/api/market-integrity/history?id=unknown-p94&limit=20", "203.0.113.100"))).json();
const routeAmbiguous = await (await route.GET(request("https://velmere.test/api/market-integrity/history?id=shared-p94&limit=20", "203.0.113.101"))).json();
const routePrivate = await (await route.GET(request("https://velmere.test/api/market-integrity/history?id=market%3Aprivate-p94&limit=20", "203.0.113.102"))).json();
check("route_unknown_ambiguous_private_semantics_identical", JSON.stringify(publicSemantics(routeUnknown)) === JSON.stringify(publicSemantics(routeAmbiguous)) && JSON.stringify(publicSemantics(routeUnknown)) === JSON.stringify(publicSemantics(routePrivate)));
check("route_never_exposes_request_binding_or_private_fields", !/requestBinding|resolutionKind|private-p94|rights_withheld|snapshotDigest|sourceReceiptRoot/iu.test(JSON.stringify(latestRoutePayload)));

// Strict customer parser and page merge.
const parsedFirst = client.parseRiskHistoryCustomerPayload(latestRoutePayload);
const parsedSecond = client.parseRiskHistoryCustomerPayload(olderRoutePayload);
check("client_accepts_latest_page", parsedFirst.riskHistory.window.isLatestWindow && parsedFirst.riskHistory.observations === 144);
check("client_accepts_older_page", parsedSecond.riskHistory.window.before === first.page.nextBefore && parsedSecond.riskHistory.observations === 6);
const merged = client.mergeRiskHistoryCustomerPages([parsedFirst, parsedSecond]);
check("client_merges_150_public_observations", merged?.observations === 150 && merged.loadedPages === 2 && merged.completeVisibleHistory && !merged.hasOlder, {
  observations: merged?.observations,
  loadedPages: merged?.loadedPages,
  hasOlder: merged?.hasOlder,
  completeVisibleHistory: merged?.completeVisibleHistory,
});
check("merged_history_is_strictly_chronological", merged?.history.every((row, index, rows) => index === 0 || Date.parse(row.observedAt) > Date.parse(rows[index - 1].observedAt)) === true);
check("merged_tracking_start_is_oldest_public_event", merged?.trackingStartedAt === secondProjection.history[0].observedAt, merged?.trackingStartedAt);
const reversedPages = [parsedSecond, parsedFirst];
await rejects("client_rejects_reversed_page_chain", () => client.mergeRiskHistoryCustomerPages(reversedPages), "incompatible_history_pages");
const duplicatePage = clone(parsedSecond);
duplicatePage.riskHistory.history[0].eventReference = parsedFirst.riskHistory.history[0].eventReference;
await rejects("client_rejects_duplicate_event_reference_across_pages", () => client.mergeRiskHistoryCustomerPages([parsedFirst, duplicatePage]), "incompatible_history_pages");
for (const [id, mutate] of [
  ["client_rejects_missing_top_schema", (value) => { delete value.schemaVersion; }],
  ["client_rejects_extra_window_field", (value) => { value.riskHistory.window.internal = true; }],
  ["client_rejects_wrong_next_cursor", (value) => { value.riskHistory.window.nextBefore = value.riskHistory.window.newestIncludedAt; }],
  ["client_rejects_false_completeness", (value) => { value.riskHistory.window.completeVisibleHistory = true; }],
  ["client_rejects_tracking_start_on_bounded_page", (value) => { value.riskHistory.trackingStartedAt = value.riskHistory.history[0].observedAt; }],
]) {
  const bad = clone(latestRoutePayload);
  mutate(bad);
  await rejects(id, () => client.parseRiskHistoryCustomerPayload(bad), "invalid_customer_projection");
}
check("client_path_includes_canonical_cursor", client.buildRiskHistoryCustomerPath("market:p94", 12, at(50)) === `/api/market-integrity/history?id=market%3Ap94&limit=12&before=${encodeURIComponent(at(50))}`);
await rejects("client_path_rejects_noncanonical_cursor", () => client.buildRiskHistoryCustomerPath("market:p94", 12, "2026-08-20"), "invalid_cursor");

// Time-proportional chart: one hour is 10% of a ten-hour span, not half.
const chartRows = [
  { ...parsedSecond.riskHistory.history[0], observedAt: "2026-08-20T00:00:00.000Z", score: 20 },
  { ...parsedSecond.riskHistory.history[1], observedAt: "2026-08-20T01:00:00.000Z", score: 30 },
  { ...parsedSecond.riskHistory.history[2], observedAt: "2026-08-20T10:00:00.000Z", score: 40 },
];
const polyline = client.buildRiskHistoryChartPolyline(chartRows, 100, 100, 10);
const x = polyline.split(" ").map((point) => Number(point.split(",")[0]));
check("chart_uses_real_time_spacing", x.length === 3 && x[0] === 10 && x[1] === 18 && x[2] === 90, { polyline, x });
check("chart_single_point_is_centered", client.buildRiskHistoryChartPolyline([chartRows[0]], 100, 100, 10).startsWith("50.00,"));
check("chart_rejects_equal_timestamps", client.buildRiskHistoryChartPolyline([chartRows[0], { ...chartRows[1], observedAt: chartRows[0].observedAt }]) === "");
check("chart_rejects_reverse_time", client.buildRiskHistoryChartPolyline([chartRows[1], chartRows[0]]) === "");
check("chart_rejects_invalid_time", client.buildRiskHistoryChartPolyline([{ ...chartRows[0], observedAt: "invalid" }]) === "");

// Service-role, no-socket public RPC envelope path.
resetLedger();
configure();
const dbCalls = [];
function publicEnvelope({ requestedId = "market:p94", resolutionKind = "CANONICAL", events = first.events.slice(-3), limit = 3, before = null, hasOlder = true, extra = null } = {}) {
  const value = {
    schemaVersion: ledger.RISK_HISTORY_PUBLIC_RESOLUTION_SCHEMA,
    resolution: events.length ? "RESOLVED" : "EMPTY",
    canonicalAssetId: events.length ? "market:p94" : null,
    events,
    requestBinding: {
      schemaVersion: "velmere.risk-history-public-request-binding.v1",
      requestedId,
      resolutionKind: events.length ? resolutionKind : null,
    },
    page: {
      requestedLimit: limit,
      before,
      hasOlder: events.length ? hasOlder : false,
      nextBefore: events.length && hasOlder ? events[0].observedAt : null,
    },
  };
  return extra ? { ...value, [extra]: true } : value;
}
const dbTransport = async (url, init) => {
  const body = requestBody(init);
  dbCalls.push({ path: url.pathname, body });
  if (!url.pathname.endsWith("/velmere_read_public_risk_history_by_asset_v1")) return json({ error: "unexpected" }, 404);
  return json(publicEnvelope({ requestedId: String(body.p_asset_id).toLowerCase(), limit: body.p_limit, before: body.p_before, events: first.events.slice(-body.p_limit), hasOlder: true }));
};
const dbPage = await withPass4825BrokeredEgressTestTransport(dbTransport, () => ledger.getPublicRiskHistoryResolution("market:p94", 3, null));
check("database_public_rpc_envelope_accepted", dbPage.source === "DATABASE" && dbPage.events.length === 3 && dbPage.page.hasOlder, dbPage.page);
check("database_public_rpc_exact_method_and_body", dbCalls.length === 1 && dbCalls[0].path.endsWith("/velmere_read_public_risk_history_by_asset_v1") && JSON.stringify(Object.keys(dbCalls[0].body).sort()) === JSON.stringify(["p_asset_id", "p_before", "p_limit"]), dbCalls);
const dbStatus = await ledger.getCustomerSafeRiskLedgerStatus();
check("public_database_read_never_promotes_durability", dbStatus.storageState === "CONFIGURED_UNVERIFIED", dbStatus);
const wrongBindingTransport = async () => json(publicEnvelope({ requestedId: "other", limit: 3, events: first.events.slice(-3) }));
await rejects("database_wrong_request_binding_fails_closed", () => withPass4825BrokeredEgressTestTransport(wrongBindingTransport, () => ledger.getPublicRiskHistoryResolution("market:p94", 3, null)), "unavailable");
const extraTransport = async () => json(publicEnvelope({ limit: 3, events: first.events.slice(-3), extra: "internalCount" }));
await rejects("database_extra_envelope_field_fails_closed", () => withPass4825BrokeredEgressTestTransport(extraTransport, () => ledger.getPublicRiskHistoryResolution("market:p94", 3, null)), "unavailable");
const privateTransport = async () => json(publicEnvelope({ limit: 1, events: [privateP94Event], hasOlder: false }));
await rejects("database_private_event_crossing_boundary_fails_closed", () => withPass4825BrokeredEgressTestTransport(privateTransport, () => ledger.getPublicRiskHistoryResolution("market:p94", 1, null)), "unavailable");
const badCursorTransport = async () => json(publicEnvelope({ limit: 3, events: first.events.slice(-3), hasOlder: true }));
await rejects("database_nonprogressing_cursor_fails_closed", () => withPass4825BrokeredEgressTestTransport(badCursorTransport, () => ledger.getPublicRiskHistoryResolution("market:p94", 3, first.events.at(-1).observedAt)), "unavailable");
const aliasDbTransport = async () => json(publicEnvelope({ requestedId: "legacy-old-alias", resolutionKind: "UNIQUE_ALIAS", limit: 3, events: first.events.slice(-3) }));
const aliasDb = await withPass4825BrokeredEgressTestTransport(aliasDbTransport, () => ledger.getPublicRiskHistoryResolution("legacy-old-alias", 3, null));
check("database_explicit_alias_binding_survives_page_without_alias_row", aliasDb.requestBinding.resolutionKind === "UNIQUE_ALIAS" && aliasDb.events.every((row) => row.assetId !== "legacy-old-alias"));
const outageTransport = async () => json({ error: "forced" }, 503);
await rejects("configured_database_outage_never_falls_back_to_memory", () => withPass4825BrokeredEgressTestTransport(outageTransport, () => ledger.getPublicRiskHistoryResolution("market:p94", 3, null)), "unavailable");
clearConfig();

const failed = checks.filter((row) => row.status !== "PASS");
function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (!value || typeof value !== "object") return value;
  const output = {};
  for (const [key, item] of Object.entries(value)) {
    if (["lastPersistAt", "lastVerifiedAt", "generatedAt"].includes(key)) output[key] = "<runtime-timestamp>";
    else if (["retry-after", "x-ratelimit-reset"].includes(key.toLowerCase())) output[key] = "<runtime-window>";
    else output[key] = sanitize(item);
  }
  return output;
}
const receipt = {
  schemaVersion: "velmere.p94.risk-history-public-pagination-runtime.v1",
  generatedAt: FIXED,
  status: failed.length ? "FAIL" : "PASS_BOUNDED_NO_SOCKET_PUBLIC_ONLY_PAGINATION",
  checks: {
    total: checks.length,
    passed: checks.length - failed.length,
    failed: failed.length,
    rows: checks.map((row) => ({ ...row, ...(row.detail === undefined ? {} : { detail: sanitize(row.detail) }) })),
  },
  execution: {
    networkSocketsUsed: false,
    realPostgreSqlExecuted: false,
    publicOnlyFilteringBeforeLimitExercised: true,
    cursorPaginationExercised: true,
    oldOnlyAliasBindingExercised: true,
    nonEnumeratingEmptySemanticsExercised: true,
    customerParserAndMergeExercised: true,
    timeProportionalChartExercised: true,
  },
  zeroFakeCredit: {
    browserRendered: false,
    stagingExecuted: false,
    productionExecuted: false,
    riskIndicatorFinal: false,
    customerFinal: "0/20",
    live: false,
  },
  truthBoundary: "This bounded no-socket proof exercises public-only filtering before pagination, exclusive cursor windows, explicit canonical/unique-alias request binding, strict customer parsing, multi-page merge and time-proportional chart geometry. It does not execute PostgreSQL, RLS, deployed HTTP, a real Browser, customer-authorized input, exact Windows or Customer FINAL.",
};
await mkdir(new URL("../../receipts/p94/", import.meta.url), { recursive: true });
await mkdir(new URL("../../artifacts/p94/", import.meta.url), { recursive: true });
for (const target of [
  new URL("../../receipts/p94/P94_RISK_HISTORY_PUBLIC_PAGINATION_RUNTIME.json", import.meta.url),
  new URL("../../artifacts/p94/P94_RISK_HISTORY_PUBLIC_PAGINATION_RUNTIME.json", import.meta.url),
]) await writeFile(target, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ status: receipt.status, checks: receipt.checks, execution: receipt.execution }, null, 2));
if (failed.length) process.exitCode = 1;
