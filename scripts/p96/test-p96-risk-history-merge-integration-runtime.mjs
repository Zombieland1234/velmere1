#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";

const checks = [];
function check(id, condition, detail) {
  const row = { id, status: condition ? "PASS" : "FAIL", ...(detail === undefined ? {} : { detail }) };
  checks.push(row);
  if (!condition) throw new Error(`P96 merge integration failed: ${id} ${JSON.stringify(detail ?? null)}`);
}
async function rejects(id, fn, expected = null) {
  let message = null;
  try { await fn(); } catch (error) { message = error instanceof Error ? error.message : String(error); }
  check(id, message !== null && (expected === null || message.includes(expected)), message);
}

const contract = await import("../../lib/market-integrity/risk-history-contract.ts");
const alignment = await import("../../lib/market-integrity/risk-history-current-alignment.ts");
const requestBinding = await import("../../lib/market-integrity/risk-history-customer-request-binding.ts");
const ledger = await import("../../lib/market-integrity/risk-ledger.ts");
const route = await import("../../lib/server/market-integrity-route-modules/history.ts");
const client = await import("../../lib/market-integrity/risk-history-customer-client.ts");
const { sha256Digest } = await import("../../lib/security/cryptographic-digest.ts");

const FIXED = "2026-08-20T04:00:00.000Z";
const at = (minutes) => new Date(Date.parse(FIXED) + minutes * 60_000).toISOString();
const digest = (seed) => sha256Digest(`p96:${seed}`);
function reset() {
  delete process.env.SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete globalThis.__velmereRiskHistoryEventLedgerP91;
}
function result({ canonicalIdentity, minute = 0, score = 42.4, providerConfiguration = "stable" }) {
  const marketId = canonicalIdentity.replace(/^market:/u, "");
  return {
    token: { marketId, symbol: marketId.toUpperCase().slice(0, 8), name: `Asset ${marketId}`, assetClass: "crypto" },
    score,
    modelBinding: {
      schemaVersion: "velmere.risk-model-binding.v1",
      scoreFormula: "deterministic_continuous_evidence_fusion_v10",
      featureSchemaVersion: "velmere.risk-feature-schema.v2",
      featureSchemaDigest: digest(`features:${canonicalIdentity}`),
      assetClassCohort: "crypto",
      providerConfigurationDigest: digest(`providers:${providerConfiguration}`),
    },
    confidence: 77,
    level: score >= 70 ? "high" : score >= 35 ? "medium" : "low",
    badge: score >= 70 ? "high_risk" : "elevated_risk",
    signals: [{ id: "thin_liquidity", severity: "medium", points: 12 }],
    metrics: { currentPrice: 100, marketCap: 1_000_000, volume24h: 50_000 },
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
}
function snapshot(alias, value) {
  return contract.buildRiskHistorySnapshot({ assetId: alias, result: value, observedAt: value.generatedAt, price: value.metrics.currentPrice });
}
function request(assetId, limit = 10, before = null, suffix = 196) {
  const query = new URLSearchParams({ id: assetId, limit: String(limit) });
  if (before) query.set("before", before);
  return new Request(`https://velmere.test/api/market-integrity/history?${query.toString()}`, {
    headers: { "x-forwarded-for": `203.0.113.${suffix}`, "user-agent": "Mozilla/5.0 P96" },
  });
}

reset();
const btcResult = result({ canonicalIdentity: "market:p96-btc", minute: 0, score: 42.4 });
const stored = await ledger.persistRiskSnapshots([snapshot("p96-btc", btcResult)]);
check("btc_fixture_stored", stored.stored === 1 && stored.conflicts === 0, stored);
const btcResponse = await route.GET(request("market:p96-btc"));
const btcRaw = await btcResponse.json();
check("route_and_projection_v3", btcResponse.status === 200
  && btcRaw.schemaVersion === "velmere.risk-history.customer-route.v3"
  && btcRaw.riskHistory?.schemaVersion === "velmere.risk-history.customer.v3", btcRaw.schemaVersion);
const expectedBinding = requestBinding.buildRiskHistoryCustomerRequestBinding({ assetId: "market:p96-btc", limit: 10, before: null });
check("route_binding_matches_exact_btc_request", JSON.stringify(btcRaw.requestBinding) === JSON.stringify(expectedBinding), btcRaw.requestBinding);
const btcPage = client.parseRiskHistoryCustomerPayload(btcRaw, { assetId: "market:p96-btc", limit: 10, before: null });
check("btc_page_canonical_identity", btcPage.riskHistory.asset.canonicalAssetId === "market:p96-btc", btcPage.riskHistory.asset);
check("btc_page_memory_provenance_bounded", btcPage.riskHistory.storage.pageSource === "MEMORY"
  && btcPage.riskHistory.storage.pageReadState === "RUNTIME_PAGE_ONLY"
  && btcPage.riskHistory.storage.durableRetentionClaimed === false
  && btcPage.riskHistory.storage.backupRestoreProven === false, btcPage.riskHistory.storage);

const btcCurrent = alignment.buildRiskHistoryCurrentObservation({ assetId: "p96-btc", result: btcResult, publishedScore: btcResult.score });
const btcAligned = alignment.alignRiskHistoryCurrentObservation({
  current: btcCurrent,
  historyAssetCanonicalId: btcPage.riskHistory.asset.canonicalAssetId,
  history: btcPage.riskHistory.history,
});
check("same_asset_request_and_history_align", btcAligned.state === "ALIGNED_SAME_OBSERVATION", btcAligned);
check("same_asset_preserves_precise_current_and_integer_history", btcAligned.current.score === 42.4 && btcAligned.latestHistory?.score === 42, btcAligned);
check("aligned_both_customer_views_allowed", btcAligned.currentDisplayAllowed && btcAligned.historyDisplayAllowed, btcAligned);

await rejects("btc_payload_rejected_for_eth_request", () => client.parseRiskHistoryCustomerPayload(
  btcRaw,
  { assetId: "market:p96-eth", limit: 10, before: null },
), "invalid_customer_projection");

const ethResult = result({ canonicalIdentity: "market:p96-eth", minute: 0, score: 37.2 });
await ledger.persistRiskSnapshots([snapshot("p96-eth", ethResult)]);
const ethRaw = await (await route.GET(request("market:p96-eth", 10, null, 197))).json();
const ethPage = client.parseRiskHistoryCustomerPayload(ethRaw, { assetId: "market:p96-eth", limit: 10, before: null });
const crossAssetAlignment = alignment.alignRiskHistoryCurrentObservation({
  current: btcCurrent,
  historyAssetCanonicalId: ethPage.riskHistory.asset.canonicalAssetId,
  history: ethPage.riskHistory.history,
});
check("btc_current_cannot_be_relabelled_as_eth_history", crossAssetAlignment.state === "IDENTITY_CONFLICT", crossAssetAlignment);
check("identity_conflict_hides_current_but_preserves_history", !crossAssetAlignment.currentDisplayAllowed && crossAssetAlignment.historyDisplayAllowed, crossAssetAlignment);

const newerBtcHistory = result({ canonicalIdentity: "market:p96-btc", minute: 1, score: 48.1 });
await ledger.persistRiskSnapshots([snapshot("p96-btc", newerBtcHistory)]);
const newerRaw = await (await route.GET(request("market:p96-btc", 10, null, 198))).json();
const newerPage = client.parseRiskHistoryCustomerPayload(newerRaw, { assetId: "market:p96-btc", limit: 10, before: null });
const staleCurrentAlignment = alignment.alignRiskHistoryCurrentObservation({
  current: btcCurrent,
  historyAssetCanonicalId: newerPage.riskHistory.asset.canonicalAssetId,
  history: newerPage.riskHistory.history,
});
check("newer_bound_history_withholds_stale_table_current", staleCurrentAlignment.state === "HISTORY_NEWER_THAN_CURRENT"
  && staleCurrentAlignment.currentDisplayAllowed === false
  && staleCurrentAlignment.historyDisplayAllowed === true, staleCurrentAlignment);

const currentOnlyNewerResult = result({ canonicalIdentity: "market:p96-btc", minute: 2, score: 50.6 });
const currentOnlyNewer = alignment.buildRiskHistoryCurrentObservation({ assetId: "p96-btc", result: currentOnlyNewerResult, publishedScore: currentOnlyNewerResult.score });
const newerCurrentAlignment = alignment.alignRiskHistoryCurrentObservation({
  current: currentOnlyNewer,
  historyAssetCanonicalId: newerPage.riskHistory.asset.canonicalAssetId,
  history: newerPage.riskHistory.history,
});
check("newer_unstored_current_is_not_silently_called_stored", newerCurrentAlignment.state === "CURRENT_NEWER_COMPARABLE"
  && newerCurrentAlignment.timeDeltaMs === 60_000, newerCurrentAlignment);

const serialized = JSON.stringify({ btcPage, btcAligned, crossAssetAlignment, staleCurrentAlignment, newerCurrentAlignment });
check("integrated_projection_contains_no_provider_url", !/https?:\/\//iu.test(serialized));
check("integrated_projection_contains_no_raw_provider_material", !/rawResponse|sourceReceiptRoot|receiptDigest|providerConfigurationDigest/iu.test(serialized));
check("request_binding_and_alignment_schemas_both_versioned", btcPage.requestBinding.schemaVersion === "velmere.risk-history-customer-request-binding.v1"
  && btcAligned.schemaVersion === "velmere.risk-history-current-alignment.v1");

const repeated = alignment.alignRiskHistoryCurrentObservation({
  current: btcCurrent,
  historyAssetCanonicalId: btcPage.riskHistory.asset.canonicalAssetId,
  history: btcPage.riskHistory.history,
});
check("integrated_alignment_deterministic", JSON.stringify(repeated) === JSON.stringify(btcAligned));

const failed = checks.filter((row) => row.status !== "PASS");
const receipt = {
  schemaVersion: "velmere.p96.risk-history-sibling-merge-integration-runtime.v1",
  generatedAt: "2026-08-21T05:00:00.000Z",
  status: failed.length ? "FAIL" : "PASS_BOUNDED_LOCAL_SIBLING_MERGE_INTEGRATION",
  checks: { total: checks.length, passed: checks.length - failed.length, failed: failed.length, rows: checks },
  execution: {
    networkSocketsUsed: false,
    realPostgreSqlExecuted: false,
    requestPageBindingExercised: true,
    currentHistoryAlignmentExercised: true,
    crossAssetResponseSwapRejected: true,
    staleCurrentWithheld: true,
  },
  truthBoundary: "This local no-socket integration proof exercises both formerly sibling P95 contracts in one current tree. It does not prove PostgreSQL, deployed HTTP/cache behavior, Browser rendering, real customer input, whole-project build, exact Windows or Customer FINAL.",
};
for (const relative of ["receipts/p96/P96_RISK_HISTORY_SIBLING_MERGE_INTEGRATION_RUNTIME.json", "artifacts/p96/P96_RISK_HISTORY_SIBLING_MERGE_INTEGRATION_RUNTIME.json"]) {
  const target = new URL(`../../${relative}`, import.meta.url);
  await mkdir(new URL(".", target), { recursive: true });
  await writeFile(target, `${JSON.stringify(receipt, null, 2)}\n`);
}
console.log(JSON.stringify({ status: receipt.status, checks: receipt.checks }, null, 2));
if (failed.length) process.exitCode = 1;
