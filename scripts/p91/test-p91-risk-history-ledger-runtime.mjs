#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";

const checks = [];
function check(id, condition, detail) {
  const row = { id, status: condition ? "PASS" : "FAIL", ...(detail === undefined ? {} : { detail }) };
  checks.push(row);
  if (!condition) throw new Error(`P91 risk history ledger failed: ${id} ${JSON.stringify(detail ?? null)}`);
}

const contract = await import("../../lib/market-integrity/risk-history-contract.ts");
const ledger = await import("../../lib/market-integrity/risk-ledger.ts");
const { withPass4825BrokeredEgressTestTransport } = await import("../../lib/network/brokered-egress.ts");
const { sha256Digest } = await import("../../lib/security/cryptographic-digest.ts");
const route = await import("../../lib/server/market-integrity-route-modules/history.ts");

const FIXED = "2026-08-20T12:00:00.000Z";
const HOUR = 3_600_000;
const at = (hours) => new Date(Date.parse(FIXED) + hours * HOUR).toISOString();
const digest = (seed) => sha256Digest(`p91-ledger:${seed}`);

function resetLedger() {
  delete globalThis.__velmereRiskHistoryEventLedgerP91;
}
function clearConfig() {
  delete process.env.SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
}
function configure() {
  process.env.SUPABASE_URL = "https://p91-risk-history.example.com";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "p91-local-no-socket-service-role-key";
}
function result(hours, overrides = {}) {
  const base = {
    token: { marketId: "bitcoin-p91", symbol: "BTC", name: "Bitcoin", assetClass: "crypto" },
    score: 40,
    modelBinding: {
      schemaVersion: "velmere.risk-model-binding.v1",
      scoreFormula: "deterministic_continuous_evidence_fusion_v10",
      featureSchemaVersion: "velmere.risk-feature-schema.v2",
      featureSchemaDigest: digest("features"),
      assetClassCohort: "crypto",
      providerConfigurationDigest: digest("providers"),
    },
    confidence: 80,
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
      canonicalIdentity: "market:bitcoin-p91",
      sourceReceiptRoot: digest("root"),
      receiptDigest: digest("receipt"),
      completenessBps: 10_000,
      sourceAsOf: at(hours),
      blockers: [],
    },
    customerTruth: {},
    generatedAt: at(hours),
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
function snapshot(hours, overrides = {}) {
  const r = result(hours, overrides);
  return contract.buildRiskHistorySnapshot({ assetId: "bitcoin-p91", result: r, observedAt: at(hours), price: r.metrics.currentPrice });
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
}
function body(init) {
  return init.body ? JSON.parse(String(init.body)) : {};
}
function noSocketDatabase({ tamperReadBack = false, failLatest = false } = {}) {
  const events = new Map();
  const calls = [];
  const transport = async (url, init) => {
    calls.push({ path: url.pathname, method: init.method ?? "GET" });
    const payload = body(init);
    if (url.pathname.endsWith("/velmere_get_latest_risk_history_events_v1")) {
      if (failLatest) return json({ error: "forced latest failure" }, 503);
      const ids = new Set(payload.p_asset_ids ?? []);
      const latest = new Map();
      for (const event of events.values()) {
        if (!ids.has(event.canonicalAssetId)) continue;
        const previous = latest.get(event.canonicalAssetId);
        if (!previous || Date.parse(event.observedAt) > Date.parse(previous.observedAt)) latest.set(event.canonicalAssetId, event);
      }
      return json(Array.from(latest.values()));
    }
    if (url.pathname.endsWith("/velmere_append_risk_history_events_v1")) {
      let stored = 0;
      let skipped = 0;
      const ids = [];
      const digests = [];
      for (const event of payload.p_events ?? []) {
        const existing = events.get(event.eventId);
        if (existing) skipped += 1;
        else { events.set(event.eventId, structuredClone(event)); stored += 1; }
        ids.push(event.eventId);
        digests.push(event.eventDigest);
      }
      return json({ ok: true, stored, skipped, conflicts: 0, eventIds: ids, eventDigests: digests });
    }
    if (url.pathname.endsWith("/velmere_read_risk_history_events_v1")) {
      const rows = (payload.p_event_ids ?? []).map((id) => structuredClone(events.get(id))).filter(Boolean);
      if (tamperReadBack && rows[0]) rows[0].score = 99;
      return json(rows);
    }
    if (url.pathname.endsWith("/velmere_read_risk_history_by_asset_v1")) {
      const rows = Array.from(events.values())
        .filter((event) => event.canonicalAssetId === payload.p_asset_id || event.assetId === payload.p_asset_id)
        .sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt))
        .slice(-(payload.p_limit ?? 144));
      return json(rows);
    }
    return json({ error: "unexpected path" }, 404);
  };
  return { events, calls, transport };
}

clearConfig();
resetLedger();
const firstMemory = await ledger.persistRiskSnapshots([snapshot(0)]);
check("memory_first_event_stored", firstMemory.mode === "memory" && firstMemory.stored === 1 && firstMemory.readBackVerified === false, firstMemory);
const unchangedMemory = await ledger.persistRiskSnapshots([snapshot(1)]);
check("memory_unchanged_event_skipped", unchangedMemory.stored === 0 && unchangedMemory.skipped === 1, unchangedMemory);
const heartbeatMemory = await ledger.persistRiskSnapshots([snapshot(25)]);
check("memory_daily_heartbeat_stored", heartbeatMemory.stored === 1, heartbeatMemory);
const memoryStatus = await ledger.getRiskLedgerStatus();
check("memory_never_claims_durable", memoryStatus.longTermStorage === "runtime_mirror_only" && memoryStatus.durabilityState === "RUNTIME_MEMORY_ONLY", memoryStatus);
const memorySafe = await ledger.getCustomerSafeRiskLedgerStatus();
check("memory_customer_status_bounded", memorySafe.storageState === "RUNTIME_ONLY" && memorySafe.blockers.includes("durable_history_not_configured"), memorySafe);

resetLedger();
configure();
const configuredOnly = await ledger.persistRiskSnapshots([]);
const configuredStatus = await ledger.getRiskLedgerStatus();
check("configuration_alone_not_durable", configuredOnly.durabilityState === "CONFIGURED_UNVERIFIED" && configuredStatus.longTermStorage === "runtime_mirror_only", { configuredOnly, configuredStatus });
check("configured_customer_status_withheld", (await ledger.getCustomerSafeRiskLedgerStatus()).storageState === "CONFIGURED_UNVERIFIED");

resetLedger();
configure();
const database = noSocketDatabase();
const durableFirst = await withPass4825BrokeredEgressTestTransport(database.transport, () => ledger.persistRiskSnapshots([snapshot(0)]));
check("no_socket_exact_readback_durable", durableFirst.mode === "supabase" && durableFirst.readBackVerified === true && durableFirst.durabilityState === "DURABLE_READBACK_VERIFIED", durableFirst);
check("no_socket_three_stage_protocol", database.calls.map((row) => row.path.split("/").at(-1)).join(",") === "velmere_get_latest_risk_history_events_v1,velmere_append_risk_history_events_v1,velmere_read_risk_history_events_v1", database.calls);
const durableUnchanged = await withPass4825BrokeredEgressTestTransport(database.transport, () => ledger.persistRiskSnapshots([snapshot(1)]));
check("durable_unchanged_no_write", durableUnchanged.candidateEvents === 0 && durableUnchanged.skipped === 1 && database.events.size === 1, durableUnchanged);
const durableChanged = await withPass4825BrokeredEgressTestTransport(database.transport, () => ledger.persistRiskSnapshots([snapshot(2, { score: 68, level: "high" })]));
check("durable_material_change_written", durableChanged.stored === 1 && database.events.size === 2, durableChanged);
const durableHistory = await withPass4825BrokeredEgressTestTransport(database.transport, () => ledger.getPersistentRiskHistoryEvents("bitcoin-p91", 20));
check("durable_history_read", durableHistory.length === 2 && durableHistory.every(contract.verifyRiskHistoryEvent), durableHistory);
const durableStatus = await ledger.getRiskLedgerStatus();
check("durable_claim_requires_readback", durableStatus.longTermStorage === "durable_years_ready" && durableStatus.lastVerifiedAt, durableStatus);
const safeDurable = await ledger.getCustomerSafeRiskLedgerStatus();
check("customer_status_no_internal_error", safeDurable.storageState === "DURABLE_VERIFIED" && !("lastError" in safeDurable) && safeDurable.blockers.length === 0, safeDurable);

resetLedger();
configure();
const tamperedDb = noSocketDatabase({ tamperReadBack: true });
const tamperedResult = await withPass4825BrokeredEgressTestTransport(tamperedDb.transport, () => ledger.persistRiskSnapshots([snapshot(0)]));
check("tampered_readback_falls_back", tamperedResult.mode === "memory" && tamperedResult.durabilityState === "DEGRADED_MEMORY_FALLBACK" && tamperedResult.readBackVerified === false, tamperedResult);
const tamperedSafe = await ledger.getCustomerSafeRiskLedgerStatus();
check("tampered_customer_status_generic", tamperedSafe.storageState === "DEGRADED" && JSON.stringify(tamperedSafe).includes("durable_history_temporarily_unavailable") && !JSON.stringify(tamperedSafe).includes("score"), tamperedSafe);

resetLedger();
configure();
const failedDb = noSocketDatabase({ failLatest: true });
const failedResult = await withPass4825BrokeredEgressTestTransport(failedDb.transport, () => ledger.persistRiskSnapshots([snapshot(0)]));
check("rpc_failure_falls_back_without_durable_credit", failedResult.mode === "memory" && failedResult.durabilityState === "DEGRADED_MEMORY_FALLBACK" && Boolean(failedResult.error), failedResult);

clearConfig();
resetLedger();
await ledger.persistRiskSnapshots([snapshot(0)]);
const response = await route.GET(new Request("https://velmere.test/api/market-integrity/history?id=bitcoin-p91&limit=10"));
const routePayload = await response.json();
check("customer_route_no_store", response.headers.get("cache-control")?.includes("no-store") === true, Object.fromEntries(response.headers.entries()));
check("customer_route_projection_available", response.status === 200 && routePayload.riskHistory?.status === "AVAILABLE" && routePayload.riskHistory?.observations === 1, routePayload);
const routeText = JSON.stringify(routePayload);
check("customer_route_excludes_raw_snapshot", !/raw_snapshot|lastError|highestStoredRisk|marketCap|volume24h|dominantAgent/iu.test(routeText), { responseStatus: response.status, topLevelKeys: Object.keys(routePayload).sort() });
check("customer_route_no_live_claim", routePayload.publication?.liveClaimed === false);
const badDuplicate = await route.GET(new Request("https://velmere.test/api/market-integrity/history?id=a&id=b"));
check("customer_route_duplicate_query_rejected", badDuplicate.status === 400);
const badId = await route.GET(new Request("https://velmere.test/api/market-integrity/history?id=%3Cscript%3E"));
check("customer_route_invalid_identity_rejected", badId.status === 400);
const badLimit = await route.GET(new Request("https://velmere.test/api/market-integrity/history?id=bitcoin-p91&limit=1.5"));
check("customer_route_invalid_limit_rejected", badLimit.status === 400);

clearConfig();
const failed = checks.filter((row) => row.status !== "PASS");
function sanitizeReceiptDetail(value) {
  if (Array.isArray(value)) return value.map(sanitizeReceiptDetail);
  if (!value || typeof value !== "object") return value;
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (["lastPersistAt", "lastVerifiedAt", "generatedAt"].includes(key)) {
      out[key] = "<runtime-timestamp>";
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
  schemaVersion: "velmere.p91.risk-history-ledger-runtime.v1",
  generatedAt: FIXED,
  status: failed.length ? "FAIL" : "PASS_BOUNDED_NO_SOCKET_DURABILITY_PROTOCOL",
  checks: { total: checks.length, passed: checks.length - failed.length, failed: failed.length, rows: receiptRows },
  testTransport: { networkSocketsUsed: false, databaseSimulated: true, exactWriteReadbackProtocolExercised: true },
  zeroFakeCredit: {
    realPostgreSqlExecuted: false,
    realSupabaseExecuted: false,
    stagingRlsExecuted: false,
    productionDurabilityProven: false,
    customerFinal: "0/20",
    riskIndicatorFinal: false,
  },
  truthBoundary: "The no-socket transport exercises configured-origin policy, latest-read, append and exact read-back verification. It proves fail-closed application behavior, not PostgreSQL migration execution, RLS, triggers, staging or production durability.",
};
await mkdir(new URL("../../receipts/p91/", import.meta.url), { recursive: true });
await mkdir(new URL("../../artifacts/p91/", import.meta.url), { recursive: true });
await writeFile(new URL("../../receipts/p91/P91_RISK_HISTORY_LEDGER_RUNTIME.json", import.meta.url), `${JSON.stringify(receipt, null, 2)}\n`);
await writeFile(new URL("../../artifacts/p91/P91_RISK_HISTORY_LEDGER_RUNTIME.json", import.meta.url), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ status: receipt.status, checks: receipt.checks, testTransport: receipt.testTransport }, null, 2));
if (failed.length) process.exitCode = 1;
