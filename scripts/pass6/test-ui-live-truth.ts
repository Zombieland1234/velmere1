import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  hasServerVerifiedKlineLiveGate,
  hasServerVerifiedQuoteLiveGate,
} from "../../components/market-integrity/live-truth";

let assertions = 0;
function check(value: unknown, message: string): asserts value {
  assert.ok(value, message);
  assertions += 1;
}

const receiptRoot = "a".repeat(64);
const nowMs = Date.parse("2026-07-18T12:00:00.000Z");
const quoteGate = {
  state: "live_verified",
  serverVerified: true,
  liveClaimAllowed: true,
  exactIdentity: true,
  completenessBps: 10_000,
  sourceReceiptRoot: receiptRoot,
  receiptDigest: "b".repeat(64),
  sourceAsOf: "2026-07-18T11:59:00.000Z",
  blockers: [],
};

check(!hasServerVerifiedQuoteLiveGate(null, nowMs), "null quote fails closed");
check(!hasServerVerifiedQuoteLiveGate({ state: "live", currentPrice: 42 }, nowMs), "price plus transport-live is not a LIVE proof");
check(!hasServerVerifiedQuoteLiveGate({ delivery: { state: "live_verified", serverVerified: true, liveClaimAllowed: true } }, nowMs), "arbitrary live flags without signed receipt and time fail closed");
check(!hasServerVerifiedQuoteLiveGate({ delivery: { ...quoteGate, serverVerified: false } }, nowMs), "server verification is mandatory");
check(!hasServerVerifiedQuoteLiveGate({ delivery: { ...quoteGate, liveClaimAllowed: false } }, nowMs), "explicit live authorization is mandatory");
check(!hasServerVerifiedQuoteLiveGate({ delivery: { ...quoteGate, completenessBps: 9_999 } }, nowMs), "incomplete quote delivery cannot claim LIVE");
check(!hasServerVerifiedQuoteLiveGate({ delivery: { ...quoteGate, sourceReceiptRoot: "bad" } }, nowMs), "invalid receipt root cannot claim LIVE");
check(!hasServerVerifiedQuoteLiveGate({ delivery: { ...quoteGate, receiptDigest: "bad" } }, nowMs), "invalid receipt digest cannot claim LIVE");
check(!hasServerVerifiedQuoteLiveGate({ delivery: { ...quoteGate, sourceAsOf: "2026-07-18T11:40:00.000Z" } }, nowMs), "stale source time cannot claim LIVE");
check(!hasServerVerifiedQuoteLiveGate({ delivery: { ...quoteGate, sourceAsOf: "2026-07-18T12:01:00.000Z" } }, nowMs), "future source time beyond skew cannot claim LIVE");
check(!hasServerVerifiedQuoteLiveGate({ delivery: { ...quoteGate, blockers: ["stale"] } }, nowMs), "blocked quote cannot claim LIVE");
check(hasServerVerifiedQuoteLiveGate({ delivery: quoteGate }, nowMs), "complete signed current server quote gate authorizes LIVE");
check(hasServerVerifiedQuoteLiveGate({ delivery: { ...quoteGate, sourceReceiptRoot: `sha256:${receiptRoot}`, receiptDigest: `sha256:${"b".repeat(64)}` } }, nowMs), "canonical sha256-prefixed quote receipts authorize LIVE");

const klineGate = {
  mode: "live_verified",
  freshness: "source_timestamped",
  delivery: {
    state: "live_verified",
    withholdCandles: false,
    exactIdentity: true,
    independentProviderCount: 2,
    goodProviderCount: 2,
    freshProviderCount: 2,
    blockers: [],
  },
};
check(!hasServerVerifiedKlineLiveGate({ ...klineGate, mode: "live_partial" }), "partial klines are NOT LIVE");
check(!hasServerVerifiedKlineLiveGate({ ...klineGate, freshness: "partial_not_live" }), "non-timestamped klines are NOT LIVE");
check(!hasServerVerifiedKlineLiveGate({ ...klineGate, delivery: { ...klineGate.delivery, exactIdentity: false } }), "identity mismatch fails kline LIVE gate");
check(!hasServerVerifiedKlineLiveGate({ ...klineGate, delivery: { ...klineGate.delivery, independentProviderCount: 1 } }), "single provider fails kline LIVE gate");
check(!hasServerVerifiedKlineLiveGate({ ...klineGate, delivery: { ...klineGate.delivery, blockers: ["provider_stale"] } }), "blocked kline gate fails closed");
check(hasServerVerifiedKlineLiveGate(klineGate), "explicit two-provider kline gate authorizes LIVE");

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const analysis = source("components/market-integrity/asset-detail/analysis-model.ts");
check(analysis.includes('data.marketDataState === "live_verified"'), "analysis binds LIVE to explicit marketDataState");
check(!analysis.includes("Live price is available and separated"), "analysis removed price-present LIVE claim");
check(!analysis.includes('badge: hasPrice ? "Live"'), "analysis removed price-present LIVE badge");

const chartProvider = source("components/market-integrity/asset-detail/chart-provider.ts");
check(chartProvider.includes("hasServerVerifiedKlineLiveGate(payload)"), "chart adapter uses the server gate");
check(chartProvider.includes('"partial_not_live" as const'), "chart adapter explicitly maps nonverified data to NOT LIVE");

const modal = source("components/market-integrity/AssetDetailModal.tsx");
check(modal.includes('remote.liveVerified'), "asset modal consumes server-gated kline status");
check(modal.includes('"PARTIAL · NOT LIVE"'), "asset modal exposes partial NOT LIVE state");
check(!modal.includes('aria-label="Live market source"'), "asset modal removed unconditional LIVE aria label");
check(!modal.includes('data.sourceTimeLabel ?? "Just now"'), "missing source time is no longer presented as now");

const realMarkets = source("components/market-integrity/CrossAssetCollapseRadarPanel.tsx");
check(realMarkets.includes("hasServerVerifiedQuoteLiveGate(selectedQuote)"), "Real Markets verification status uses explicit gate");
check(realMarkets.includes("pass6PublicQuoteState(selectedQuote, safeLocale)"), "Real Markets never renders provider transport state as customer LIVE state");
check(realMarkets.includes("pass6PublicSourceQuality(selectedQuote, selected, safeLocale)"), "Real Markets sanitizes legacy live source-quality copy");
check(!realMarkets.includes("Data supplied in real time by Velmère Real Markets."), "Real Markets removed unconditional real-time footer");
check(!realMarkets.includes("Live prices, liquidity and risk in real time."), "Real Markets removed unconditional real-time subtitle");
check(realMarkets.includes('"SOURCE DATA · NOT LIVE"'), "transport data gets an explicit NOT LIVE customer state");

const vlm = source("components/market-integrity/VlmBrainWorkspace.tsx");
check(!vlm.includes('live: "Gemini live"'), "VLM removed provider-name-as-LIVE claim");
check(!vlm.includes("Live VLM did not return"), "VLM fallback copy no longer calls an unverified provider live");
check(vlm.includes("serverLiveVerified"), "VLM label preserves the server LIVE decision");

const shield = source("components/market-integrity/ShieldRealMarketsParityClient.tsx");
check(shield.includes('if (feedMode === "live")'), "Shield LIVE label remains conditional on server mode");
check(shield.includes('"LIVE · VERIFIED"'), "Shield exposes verified wording for the passed server gate");
check(shield.includes('"PARTIAL · NOT LIVE"'), "Shield preserves the partial NOT LIVE state");

console.log(JSON.stringify({
  suite: "pass6_ui_live_truth",
  assertions,
  liveClaimed: false,
  externalCalls: 0,
  status: "PASS_OFFLINE",
}, null, 2));
