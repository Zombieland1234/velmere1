#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const helper = await import(pathToFileURL(path.resolve("lib/market-integrity/asset-detail-client-helpers.ts")).href + `?r30=${Date.now()}`);
const model = await import(pathToFileURL(path.resolve("components/market-integrity/asset-detail/chart-model.ts")).href + `?r30=${Date.now()}`);
let checks = 0;
const rows = [];
const ok = (value, id, detail = null) => { checks += 1; assert.ok(value, `${id}:${JSON.stringify(detail)}`); rows.push({ id, passed: true, detail }); };

const labels = [
  { assetClassLabel: "Crypto", exchangeLabel: "Shield" },
  { assetClassLabel: "Kryptoaktywa", exchangeLabel: "Rynek krypto" },
  { assetClassLabel: "Kryptowährung", exchangeLabel: "Kryptomarkt" },
];
for (const label of labels) {
  ok(helper.resolvePass4408AssetSessionPolicy({ symbol: "BTC", providerSymbol: "BTCUSDT", assetClass: "crypto", venue: "binance", ...label }) === "crypto_24_7", `session.crypto.${label.assetClassLabel}`);
  ok(helper.resolvePass4408AssetSessionPolicy({ symbol: "COIN", providerSymbol: "COIN", assetClass: "stock", venue: "nasdaq", ...label }) === "session_market", `session.stock-copy-not-authority.${label.assetClassLabel}`);
}
ok(helper.resolvePass4408AssetSessionPolicy({ symbol: "SPY", assetClass: "etf", venue: "provider_quorum", assetClassLabel: "ETF" }) === "mixed_provider", "session.mixed-canonical-venue");
ok(helper.resolvePass4408AssetSessionPolicy({ symbol: "ETH", venue: "mexc" }) === "crypto_24_7", "session.legacy-canonical-venue");

const stock = { symbol: "SAP", providerSymbol: "SAP.DE", assetClass: "stock", venue: "xetra" };
const crypto = { symbol: "BTC", providerSymbol: "BTCUSDT", assetClass: "crypto", venue: "binance" };
ok(helper.resolvePass4408AssetDetailChartIntervalMs(stock, "4H") === 60 * 60_000, "cadence.real-markets-4h-is-provider-hourly");
ok(helper.resolvePass4408AssetDetailChartIntervalMs(crypto, "4H") === 4 * 60 * 60_000, "cadence.shield-4h-is-aggregated-4h");
ok(helper.resolvePass4408AssetDetailChartIntervalMs(stock, "1M") === 30 * 24 * 60 * 60_000, "cadence.real-markets-1m-is-monthly");
ok(helper.resolvePass4408AssetDetailChartIntervalMs(crypto, "1M") === 24 * 60 * 60_000, "cadence.shield-1m-range-is-daily");

function candles(count, step) {
  const start = 1_700_000_000_000;
  return Array.from({ length: count }, (_, index) => ({ timestamp: start + index * step, open: 100 + index, high: 102 + index, low: 99 + index, close: 101 + index, volume: 1000 + index }));
}
const hourly = candles(48, 60 * 60_000);
const daily = candles(45, 24 * 60 * 60_000);
const correctHourly = model.pass4534ChartPrecisionSummary(hourly, "4H", helper.resolvePass4408AssetDetailChartIntervalMs(stock, "4H"));
const wrongHourly = model.pass4534ChartPrecisionSummary(hourly, "4H", 4 * 60 * 60_000);
ok(correctHourly.duplicateCount === 0, "precision.stock-4h-no-false-duplicates", correctHourly);
ok(wrongHourly.duplicateCount > 0, "precision.old-stock-4h-would-false-duplicate", wrongHourly);
const correctDaily = model.pass4534ChartPrecisionSummary(daily, "1M", helper.resolvePass4408AssetDetailChartIntervalMs(crypto, "1M"));
const wrongDaily = model.pass4534ChartPrecisionSummary(daily, "1M", 30 * 24 * 60 * 60_000);
ok(correctDaily.duplicateCount === 0, "precision.crypto-1m-no-false-duplicates", correctDaily);
ok(wrongDaily.duplicateCount > 0, "precision.old-crypto-1m-would-false-duplicate", wrongDaily);

ok(helper.resolvePass4408ChartEvidenceMode({ ...crypto, marketDataState: "local_reference" }, 180) === "local_reference", "evidence.reference-not-live");
ok(helper.resolvePass4408ChartEvidenceMode({ ...crypto, marketDataState: "last_known_good" }, 180) === "last_known_good", "evidence.last-known-distinct");
ok(helper.resolvePass4408ChartEvidenceMode({ ...crypto, marketDataState: "partial_not_live" }, 180) === "partial_not_live", "evidence.partial-distinct");
ok(helper.resolvePass4408ChartEvidenceMode({ ...crypto, marketDataState: "live_verified" }, 180) === "live_verified", "evidence.live-requires-live-state");
ok(helper.resolvePass4408ChartEvidenceMode({ ...crypto, marketDataState: "live_verified" }, 7) === "pending", "evidence.sparse-cannot-live");

const modal = fs.readFileSync("components/market-integrity/AssetDetailModal.tsx", "utf8");
ok(!modal.includes('state === "production-ready"'), "ui.no-local-production-ready-state");
ok(!modal.includes("<small>PASS4540</small>"), "ui.no-visible-checkpoint-jargon");
ok(modal.includes("resolvePass4408ChartEvidenceMode(data, candles.length)"), "ui.evidence-mode-centralized");
ok(modal.includes("surface: isPass4408ShieldCryptoAsset(data)"), "action-ledger.canonical-surface");
ok(!/assetClassLabel[^\n]{0,120}(crypto|shield)/i.test(modal.slice(modal.indexOf("pushAssetActionPass4537"), modal.indexOf("function handleDetailTabKeyDown"))), "action-ledger.localized-copy-not-authority");

console.log(JSON.stringify({
  status: "PASS_A102R30_CHART_PROVIDER_CADENCE_CANONICAL_SESSION_EVIDENCE_TRUTH_NO_PROMOTION",
  checks,
  passed: checks,
  failed: 0,
  falseDuplicateRegressionClosed: true,
  localizedSessionCopyAuthority: false,
  referenceCanClaimVerifiedSource: false,
  exactBrowserCredit: false,
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
  rows,
}, null, 2));
