#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";

const checks = [];
function check(id, condition, detail) {
  const row = { id, status: condition ? "PASS" : "FAIL", ...(detail === undefined ? {} : { detail }) };
  checks.push(row);
  if (!condition) throw new Error(`P93 durability compatibility failed: ${id} ${JSON.stringify(detail ?? null)}`);
}
async function rejects(id, fn, expected) {
  let message = null;
  try { await fn(); } catch (error) { message = error instanceof Error ? error.message : String(error); }
  check(id, message?.includes(expected) === true, message);
}

const contract = await import("../../lib/market-integrity/risk-history-contract.ts");
const ledger = await import("../../lib/market-integrity/risk-ledger.ts");
const { withPass4825BrokeredEgressTestTransport } = await import("../../lib/network/brokered-egress.ts");
const { sha256Digest } = await import("../../lib/security/cryptographic-digest.ts");

const FIXED = "2026-08-20T14:00:00.000Z";
const at = (minutes) => new Date(Date.parse(FIXED) + minutes * 60_000).toISOString();
const digest = (seed) => sha256Digest(`p93-durable:${seed}`);

function resetLedger() { delete globalThis.__velmereRiskHistoryEventLedgerP91; }
function clearConfig() {
  delete process.env.SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
}
function configure() {
  process.env.SUPABASE_URL = "https://p93-durable.example.com";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "p93-local-no-socket-durable-key";
}
function result(alias, canonicalIdentity, minutes, score = 42) {
  const symbol = canonicalIdentity.split(":").at(-1)?.toUpperCase() ?? "ASSET";
  return {
    token: { marketId: alias, symbol, name: `Asset ${symbol}`, assetClass: "crypto" },
    score,
    modelBinding: {
      schemaVersion: "velmere.risk-model-binding.v1",
      scoreFormula: "deterministic_continuous_evidence_fusion_v10",
      featureSchemaVersion: "velmere.risk-feature-schema.v2",
      featureSchemaDigest: digest(`features:${canonicalIdentity}`),
      assetClassCohort: "crypto",
      providerConfigurationDigest: digest(`providers:${canonicalIdentity}`),
    },
    confidence: 80,
    level: score >= 60 ? "high" : "medium",
    badge: score >= 60 ? "high_risk" : "elevated_risk",
    signals: [{ id: "bounded-signal", severity: score >= 60 ? "high" : "medium", points: 10 }],
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
}
function snapshot(alias, canonicalIdentity, minutes, score = 42) {
  const value = result(alias, canonicalIdentity, minutes, score);
  return contract.buildRiskHistorySnapshot({ assetId: alias, result: value, observedAt: at(minutes), price: 100 });
}
function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
}
function requestBody(init) { return init.body ? JSON.parse(String(init.body)) : {}; }

function createDatabase({ tamperResolution = false, failResolution = false } = {}) {
  const events = new Map();
  const calls = [];
  let legacyV1Calls = 0;
  const transport = async (url, init) => {
    const payload = requestBody(init);
    const name = url.pathname.split("/").at(-1);
    calls.push({ name, payload });
    if (name === "velmere_get_latest_risk_history_events_v1") {
      const ids = new Set(payload.p_asset_ids ?? []);
      const latest = new Map();
      for (const event of events.values()) {
        if (!ids.has(event.canonicalAssetId)) continue;
        const previous = latest.get(event.canonicalAssetId);
        if (!previous || Date.parse(event.observedAt) > Date.parse(previous.observedAt)) latest.set(event.canonicalAssetId, event);
      }
      return json(Array.from(latest.values()).map((row) => structuredClone(row)));
    }
    if (name === "velmere_append_risk_history_events_v1") {
      const eventIds = [];
      const eventDigests = [];
      let stored = 0;
      let skipped = 0;
      let conflicts = 0;
      for (const event of payload.p_events ?? []) {
        const existing = events.get(event.eventId);
        if (!existing) { events.set(event.eventId, structuredClone(event)); stored += 1; }
        else if (existing.eventDigest === event.eventDigest) skipped += 1;
        else conflicts += 1;
        eventIds.push(event.eventId);
        eventDigests.push(event.eventDigest);
      }
      return json({ ok: conflicts === 0, stored, skipped, conflicts, eventIds, eventDigests });
    }
    if (name === "velmere_read_risk_history_events_v1") {
      return json((payload.p_event_ids ?? []).map((id) => events.get(id)).filter(Boolean).map((row) => structuredClone(row)));
    }
    if (name === "velmere_read_risk_history_by_asset_v1") {
      legacyV1Calls += 1;
      return json({ error: "legacy_reader_forbidden" }, 500);
    }
    if (name === "velmere_read_risk_history_by_asset_v2") {
      if (failResolution) return json({ error: "forced_resolution_outage" }, 503);
      const requested = String(payload.p_asset_id ?? "").toLowerCase();
      const all = Array.from(events.values());
      const exact = new Set(all.filter((row) => row.canonicalAssetId.toLowerCase() === requested).map((row) => row.canonicalAssetId));
      const aliases = new Set(all.filter((row) => row.assetId.toLowerCase() === requested).map((row) => row.canonicalAssetId));
      const candidates = exact.size > 0 ? exact : aliases;
      if (candidates.size === 0) return json({ schemaVersion: ledger.RISK_HISTORY_ASSET_RESOLUTION_SCHEMA, resolution: "EMPTY", canonicalAssetId: null, events: [] });
      if (candidates.size !== 1) return json({ schemaVersion: ledger.RISK_HISTORY_ASSET_RESOLUTION_SCHEMA, resolution: "AMBIGUOUS", canonicalAssetId: null, events: [] });
      const canonicalAssetId = [...candidates][0];
      const rows = all
        .filter((row) => row.canonicalAssetId === canonicalAssetId)
        .sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt))
        .slice(-(payload.p_limit ?? 144))
        .map((row) => structuredClone(row));
      if (tamperResolution && rows[0]) rows[0].symbol = "TAMPERED";
      return json({ schemaVersion: ledger.RISK_HISTORY_ASSET_RESOLUTION_SCHEMA, resolution: "RESOLVED", canonicalAssetId, events: rows });
    }
    return json({ error: "unexpected_rpc" }, 404);
  };
  return { events, calls, transport, get legacyV1Calls() { return legacyV1Calls; } };
}

clearConfig();
resetLedger();
configure();
const db = createDatabase();
const alphaFirst = snapshot("shared-alias", "market:alpha", 0, 42);
const alphaChanged = snapshot("shared-alias", "market:alpha", 2, 68);
const betaFirst = snapshot("shared-alias", "market:beta", 1, 35);

const firstWrite = await withPass4825BrokeredEgressTestTransport(db.transport, () => ledger.persistRiskSnapshots([alphaFirst]));
check("append_readback_first_write_durable", firstWrite.mode === "supabase" && firstWrite.readBackVerified === true && firstWrite.stored === 1, { mode: firstWrite.mode, stored: firstWrite.stored, readBackVerified: firstWrite.readBackVerified });
check("append_readback_three_stage_protocol", db.calls.slice(0, 3).map((row) => row.name).join(",") === "velmere_get_latest_risk_history_events_v1,velmere_append_risk_history_events_v1,velmere_read_risk_history_events_v1", db.calls.slice(0, 3).map((row) => row.name));
const secondWrite = await withPass4825BrokeredEgressTestTransport(db.transport, () => ledger.persistRiskSnapshots([alphaChanged, betaFirst]));
check("material_changes_append_for_two_canonical_assets", secondWrite.stored === 2 && secondWrite.conflicts === 0 && db.events.size === 3, { stored: secondWrite.stored, conflicts: secondWrite.conflicts, events: db.events.size });

const exactAlpha = await withPass4825BrokeredEgressTestTransport(db.transport, () => ledger.getPersistentRiskHistoryEvents("market:alpha", 720));
check("shared_reader_exact_alpha_only", exactAlpha.length === 2 && exactAlpha.every((row) => row.canonicalAssetId === "market:alpha"), exactAlpha.map((row) => row.canonicalAssetId));
const ambiguousAlias = await withPass4825BrokeredEgressTestTransport(db.transport, () => ledger.getPersistentRiskHistoryEvents("shared-alias", 720));
check("shared_reader_alias_collision_empty", ambiguousAlias.length === 0, ambiguousAlias);
const exactBeta = await withPass4825BrokeredEgressTestTransport(db.transport, () => ledger.getPersistentRiskHistory("market:beta", 720));
check("snapshot_reader_exact_beta_only", exactBeta.length === 1 && exactBeta[0].canonicalAssetId === "market:beta", exactBeta.map((row) => row.canonicalAssetId));
check("legacy_or_reader_never_called", db.legacyV1Calls === 0, db.legacyV1Calls);
const v2Calls = db.calls.filter((row) => row.name === "velmere_read_risk_history_by_asset_v2");
check("internal_analysis_window_uses_v2_720", v2Calls.length === 3 && v2Calls.every((row) => row.payload.p_limit === 720), v2Calls.map((row) => row.payload.p_limit));
const status = await ledger.getCustomerSafeRiskLedgerStatus();
check("durability_credit_still_comes_from_append_readback", status.storageState === "DURABLE_VERIFIED" && status.blockers.length === 0, status.storageState);

resetLedger();
configure();
const preseeded = createDatabase();
for (const event of db.events.values()) preseeded.events.set(event.eventId, structuredClone(event));
const readOnly = await withPass4825BrokeredEgressTestTransport(preseeded.transport, () => ledger.getPersistentRiskHistoryEvents("market:alpha", 720));
check("read_only_v2_returns_verified_events", readOnly.length === 2 && readOnly.every(contract.verifyRiskHistoryEvent), readOnly.length);
const readOnlyStatus = await ledger.getCustomerSafeRiskLedgerStatus();
check("read_only_v2_never_creates_durability_credit", readOnlyStatus.storageState === "CONFIGURED_UNVERIFIED", readOnlyStatus.storageState);

resetLedger();
configure();
const tampered = createDatabase({ tamperResolution: true });
for (const event of db.events.values()) tampered.events.set(event.eventId, structuredClone(event));
await rejects("tampered_v2_event_fails_closed", () => withPass4825BrokeredEgressTestTransport(tampered.transport, () => ledger.getPersistentRiskHistoryEvents("market:alpha", 720)), "risk_history_resolution_unavailable");
const tamperedStatus = await ledger.getCustomerSafeRiskLedgerStatus();
check("tampered_v2_marks_degraded_without_private_error", tamperedStatus.storageState === "DEGRADED" && tamperedStatus.blockers.includes("durable_history_temporarily_unavailable"), tamperedStatus);

resetLedger();
configure();
const outage = createDatabase({ failResolution: true });
for (const event of db.events.values()) outage.events.set(event.eventId, structuredClone(event));
await rejects("configured_v2_outage_never_memory_fallback", () => withPass4825BrokeredEgressTestTransport(outage.transport, () => ledger.getPersistentRiskHistory("market:alpha", 720)), "risk_history_resolution_unavailable");

clearConfig();
const failed = checks.filter((row) => row.status !== "PASS");
const receipt = {
  schemaVersion: "velmere.p93.risk-history-durable-canonical-compatibility-runtime.v1",
  generatedAt: FIXED,
  status: failed.length ? "FAIL" : "PASS_BOUNDED_NO_SOCKET_DURABILITY_CANONICAL_COMPATIBILITY",
  checks: { total: checks.length, passed: checks.length - failed.length, failed: failed.length, rows: checks },
  execution: { networkSocketsUsed: false, realPostgreSqlExecuted: false, p91AppendReadbackProtocolExercised: true, p93V2CanonicalReaderExercised: true, legacyV1AssetReaderCalls: db.legacyV1Calls },
  zeroFakeCredit: { stagingExecuted: false, rlsExecuted: false, backupRestoreExecuted: false, deployedHttp: false, customerFinal: "0/20", riskIndicatorFinal: false },
  truthBoundary: "This no-socket compatibility proof executes the inherited P91 append plus exact read-back protocol and the P93 v2 canonical shared reader in one bounded flow. It proves that exact canonical reads survive the P93 migration while ambiguous aliases fail closed. It does not execute PostgreSQL, RLS, staging, backup/restore, deployed HTTP, Browser or Customer FINAL.",
};
for (const relative of [
  "receipts/p93/P93_RISK_HISTORY_DURABLE_CANONICAL_COMPATIBILITY_RUNTIME.json",
  "artifacts/p93/P93_RISK_HISTORY_DURABLE_CANONICAL_COMPATIBILITY_RUNTIME.json",
]) {
  const target = new URL(`../../${relative}`, import.meta.url);
  await mkdir(new URL(".", target), { recursive: true });
  await writeFile(target, `${JSON.stringify(receipt, null, 2)}\n`);
}
console.log(JSON.stringify({ status: receipt.status, checks: receipt.checks, execution: receipt.execution }, null, 2));
if (failed.length) process.exitCode = 1;
