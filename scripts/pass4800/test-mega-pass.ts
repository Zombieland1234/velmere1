import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  aggregateCandles,
  assessKlineSeriesQuality,
  buildKlineBarConsensus,
  klineRangeProfile,
  normalizeClosedCandles,
  rankKlineProviders,
} from "../../lib/market-integrity/verified-kline-quality";
import { fetchBinanceKlines, type MarketCandle } from "../../lib/market-integrity/binance-klines";
import { fetchVerifiedKlines } from "../../lib/market-integrity/verified-kline-providers";
import { canonicalKlineIdentityDigest } from "../../lib/market-integrity/kline-asset-identity";
import {
  appendProviderEvidencePacket,
  digestProviderEvidencePacket,
  readProviderEvidencePacketLedger,
  verifyProviderEvidencePacketLedger,
} from "../../lib/market-integrity/provider-evidence-packet-ledger";
import { AUDIT_TIER_CONTRACTS } from "../../lib/security/audit-tier-contract";
import { buildVelmereAccountCookie, buildVelmereAccountSession, hashVelmereAccountBinding } from "../../lib/auth/account-session";
import { upsertVlmPaidEntitlementFromDemoReceipt } from "../../lib/commerce/vlm-entitlement-ledger";
import { buildPass4420AdvancedPaidContext } from "../../lib/security/audit-watch-server-helpers";
import {
  pass4824AuditProviderRuntimeClientDependencies,
  resetPass4824AuditProviderRuntimeCacheForTests,
} from "../../lib/security/audit-provider-runtime-client";
import { GET as auditReportGet } from "@/lib/server/security-route-modules/audit-report-assembler";

const PASS_ID = "PASS4800";
let assertions = 0;
const check = (condition: unknown, message: string) => {
  assertions += 1;
  assert.ok(condition, message);
};

function candle(timestamp: number, close: number, intervalMs: number): MarketCandle {
  return {
    timestamp,
    open: close * 0.999,
    high: close * 1.003,
    low: close * 0.997,
    close,
    volume: 1_000 + (timestamp / intervalMs) % 100,
    quoteVolume: close * 1_000,
    trades: 100,
  };
}

function series(args: { start: number; count: number; intervalMs: number; base?: number; drift?: number }) {
  const base = args.base ?? 100;
  const drift = args.drift ?? 0.01;
  return Array.from({ length: args.count }, (_, index) => candle(args.start + index * args.intervalMs, base + index * drift, args.intervalMs));
}

function binanceRow(row: MarketCandle) {
  return [
    row.timestamp,
    String(row.open),
    String(row.high),
    String(row.low),
    String(row.close),
    String(row.volume),
    row.timestamp + 60_000 - 1,
    String(row.quoteVolume ?? 0),
    row.trades ?? 0,
    "0",
    "0",
    "0",
  ];
}

function responseJson(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
}

async function main() {
  const nowMs = Date.UTC(2026, 6, 15, 12, 0, 0);
  const profile15m = klineRangeProfile("15m");
  check(profile15m.targetBars >= 1_000, "15m profile must request deep history");
  check(profile15m.maximumBars <= 1_400, "15m profile stays inside snapshot contract");

  const clean = series({ start: nowMs - 1_201 * profile15m.intervalMs, count: 1_200, intervalMs: profile15m.intervalMs });
  const noisy = [...clean];
  noisy.push({ ...clean[50] });
  noisy.push({ ...clean[70], high: 0 });
  noisy.splice(400, 3);
  noisy.push(candle(nowMs, 150, profile15m.intervalMs));
  const quality = assessKlineSeriesQuality({ rawCandles: noisy, range: "15m", nowMs });
  check(quality.candles.length === 1_197, "quality normalizer removes gap rows, duplicate, invalid and open bar");
  check(quality.quality.duplicateBars === 1, "duplicate bar is counted");
  check(quality.quality.invalidBars === 1, "invalid bar is counted");
  check(quality.quality.gapCount === 1 && quality.quality.missingBars === 3, "history gap is measured precisely");
  check(quality.quality.seriesDigest.startsWith("sha256:"), "series receives SHA-256 digest");
  check(quality.quality.qualityScore > 70, "mostly complete deep series remains usable");

  const providerA = assessKlineSeriesQuality({ rawCandles: clean, range: "15m", nowMs });
  const providerB = assessKlineSeriesQuality({ rawCandles: clean.map((row) => ({ ...row, close: row.close * 1.001, open: row.open * 1.001, high: row.high * 1.001, low: row.low * 1.001 })), range: "15m", nowMs });
  const providerC = assessKlineSeriesQuality({ rawCandles: clean.map((row, index) => ({ ...row, close: row.close * (index > 1_150 ? 1.08 : 1.002), open: row.open * (index > 1_150 ? 1.08 : 1.002), high: row.high * (index > 1_150 ? 1.08 : 1.002), low: row.low * (index > 1_150 ? 1.08 : 1.002) })), range: "15m", nowMs });
  const consensus = buildKlineBarConsensus({
    range: "15m",
    series: [
      { provider: "a", ...providerA },
      { provider: "b", ...providerB },
      { provider: "c", ...providerC },
    ],
  });
  check(consensus.comparedBars === 1_200, "consensus compares all shared bars");
  check(consensus.divergentBars > 0, "consensus detects provider divergence across historical bars");
  check(consensus.consensusDigest.startsWith("sha256:"), "consensus receives SHA-256 digest");
  const ranked = rankKlineProviders({
    series: [
      { provider: "a", ...providerA },
      { provider: "b", ...providerB },
      { provider: "c", ...providerC },
    ],
    consensus,
    priority: ["a", "b", "c"] as const,
  });
  check(ranked[0].provider !== "c", "divergent provider cannot win only by priority");

  const hour = 60 * 60_000;
  const hourly = series({ start: nowMs - 16 * hour, count: 16, intervalMs: hour });
  const fourHour = aggregateCandles({ candles: hourly, sourceIntervalMs: hour, targetIntervalMs: 4 * hour });
  check(fourHour.length === 4, "Coinbase-style 1h history aggregates to 4h bars");
  check(fourHour[0].volume === hourly.slice(0, 4).reduce((sum, row) => sum + row.volume, 0), "aggregation preserves volume sum");
  const deepHourly = series({ start: nowMs - 3_000 * hour, count: 3_000, intervalMs: hour, drift: 0 });
  const normalizedDeepHourly = normalizeClosedCandles({ candles: deepHourly, range: "1h", nowMs, maximumBars: 3_000 });
  const deepFourHour = aggregateCandles({ candles: normalizedDeepHourly.candles, sourceIntervalMs: hour, targetIntervalMs: 4 * hour });
  check(normalizedDeepHourly.candles.length === 3_000, "deep source normalization preserves the requested pre-aggregation history");
  check(deepFourHour.length === 750, "deep 4h aggregation is not truncated before building target candles");

  const binanceHistory = series({ start: nowMs - 1_300 * profile15m.intervalMs, count: 1_300, intervalMs: profile15m.intervalMs, drift: 0 });
  let binanceCalls = 0;
  const binanceFetch: typeof fetch = async (input) => {
    binanceCalls += 1;
    const url = new URL(String(input));
    const endTime = Number(url.searchParams.get("endTime") ?? nowMs);
    const limit = Number(url.searchParams.get("limit") ?? 1_000);
    const rows = binanceHistory.filter((row) => row.timestamp <= endTime).slice(-limit).map(binanceRow);
    return responseJson(rows);
  };
  const pagedBinance = await fetchBinanceKlines("BTC", "15m", { fetchImpl: binanceFetch, nowMs, bases: ["https://api.binance.test"] });
  check(binanceCalls >= 2, "Binance deep history uses pagination");
  check(pagedBinance.candles.length === 1_200, "Binance pagination returns target deep history");
  check(pagedBinance.pages >= 2, "Binance receipt exposes page count");

  const krakenHistory = series({ start: nowMs - 721 * profile15m.intervalMs, count: 721, intervalMs: profile15m.intervalMs, base: 100.05, drift: 0 });
  const coinbaseHistory = series({ start: nowMs - 1_300 * profile15m.intervalMs, count: 1_300, intervalMs: profile15m.intervalMs, base: 99.98, drift: 0 });
  const multiFetch: typeof fetch = async (input) => {
    const url = new URL(String(input));
    if (url.hostname.includes("binance")) {
      const endTime = Number(url.searchParams.get("endTime") ?? nowMs);
      const limit = Number(url.searchParams.get("limit") ?? 1_000);
      return responseJson(binanceHistory.filter((row) => row.timestamp <= endTime).slice(-limit).map(binanceRow));
    }
    if (url.hostname.includes("kraken")) {
      const rows = krakenHistory.map((row) => [row.timestamp / 1_000, String(row.open), String(row.high), String(row.low), String(row.close), String(row.close), String(row.volume), row.trades ?? 0]);
      rows.push([nowMs / 1_000, "101", "102", "100", "101", "101", "1000", 100]);
      return responseJson({ error: [], result: { XXBTZUSD: rows, last: String(nowMs / 1_000) } });
    }
    if (url.hostname.includes("coinbase")) {
      const start = Date.parse(url.searchParams.get("start") ?? "");
      const end = Date.parse(url.searchParams.get("end") ?? "");
      const rows = coinbaseHistory
        .filter((row) => row.timestamp >= start && row.timestamp <= end)
        .slice(-300)
        .reverse()
        .map((row) => [row.timestamp / 1_000, row.low, row.high, row.open, row.close, row.volume]);
      return responseJson(rows);
    }
    throw new Error(`unexpected provider ${url.href}`);
  };
  const verifiedIdentityBase = {
    assetClass: "crypto" as const,
    marketId: "bitcoin",
    symbol: "BTC",
    quote: "USD" as const,
    chainId: null,
    address: null,
  };
  const verifiedIdentity = {
    ...verifiedIdentityBase,
    schemaVersion: "pass6-kline-asset-identity-v1" as const,
    exactMatch: true as const,
    resolver: "coingecko_coin_id_and_server_venue_registry" as const,
    providerObservedAt: new Date(nowMs - 60_000).toISOString(),
    receivedAt: new Date(nowMs).toISOString(),
    identityDigest: canonicalKlineIdentityDigest(verifiedIdentityBase),
  };
  const verified = await fetchVerifiedKlines(verifiedIdentity, "15m", { fetchImpl: multiFetch, nowMs });
  check(verified.providerReceipts.filter((row) => row.ok && row.identityMatched).length === 2, "two exact-USD kline providers produce identity-bound receipts");
  check(verified.providerReceipts.some((row) => row.provider === "binance" && !row.identityMatched), "USDT-only Binance is excluded from exact USD quorum");
  check(verified.consensus.comparedBars >= 700, "verified flow compares hundreds of bars, not one close");
  check(verified.consensus.state === "corroborated" || verified.consensus.state === "partial", "small venue differences remain corroborated/partial");
  check(verified.quality.qualityScore >= 70, "selected provider passes quality threshold");
  check(verified.consensus.selectedProvider.length > 0, "selected provider is explicit");
  check(verified.delivery.state === "live_verified", "exact identity plus two fresh, corroborated, good providers is live_verified");

  const payloadDigest = digestProviderEvidencePacket({ hello: "world", value: 1 });
  const ledgerAsset = `pass4800-${Date.now()}`;
  const first = await appendProviderEvidencePacket({
    domain: "canonical_evidence",
    assetKey: ledgerAsset,
    scope: "test",
    packetId: "packet-1",
    payloadDigest,
    metadata: { tier: "pro", count: 1 },
    observedAt: new Date(nowMs).toISOString(),
  });
  const second = await appendProviderEvidencePacket({
    domain: "canonical_evidence",
    assetKey: ledgerAsset,
    scope: "test",
    packetId: "packet-2",
    payloadDigest: digestProviderEvidencePacket({ hello: "world", value: 2 }),
    metadata: { tier: "advanced", count: 2 },
    observedAt: new Date(nowMs + 1).toISOString(),
  });
  check(first.ok && second.ok, "packet ledger appends valid entries");
  check(second.sequence === 2, "packet ledger sequence is monotonic");
  const idempotent = await appendProviderEvidencePacket({ domain: "canonical_evidence", assetKey: ledgerAsset, scope: "test", packetId: "packet-1", payloadDigest, metadata: { ignored: true } });
  check(idempotent.ok && idempotent.idempotent && idempotent.sequence === 1, "same packet digest is idempotent");
  const conflict = await appendProviderEvidencePacket({ domain: "canonical_evidence", assetKey: ledgerAsset, scope: "test", packetId: "packet-1", payloadDigest: digestProviderEvidencePacket({ changed: true }) });
  check(!conflict.ok && conflict.blockers.includes("packet_digest_conflict"), "same packet ID with different digest is rejected");
  const ledger = readProviderEvidencePacketLedger({ domain: "canonical_evidence", assetKey: ledgerAsset, scope: "test" });
  check(verifyProviderEvidencePacketLedger(ledger).valid, "packet ledger hash chain verifies");
  const tampered = structuredClone(ledger);
  tampered.entries[0].payloadDigest = digestProviderEvidencePacket({ tampered: true });
  check(!verifyProviderEvidencePacketLedger(tampered).valid, "packet ledger detects tampering");

  const compactAsset = `pass4800-compact-${Date.now()}`;
  for (let index = 0; index < 2_005; index += 1) {
    const receipt = await appendProviderEvidencePacket({
      domain: "kline_series",
      assetKey: compactAsset,
      scope: "15m",
      packetId: `packet-${index}`,
      payloadDigest: digestProviderEvidencePacket({ index }),
    });
    if (!receipt.ok) throw new Error(`compaction append failed at ${index}: ${receipt.blockers.join(",")}`);
  }
  const compacted = readProviderEvidencePacketLedger({ domain: "kline_series", assetKey: compactAsset, scope: "15m" });
  check(compacted.entryCount === 2_000, "ledger compacts to bounded in-memory window");
  check(compacted.anchorSequence === 5 && compacted.entries[0].sequence === 6, "compaction preserves original sequence and anchor hash");
  check(compacted.nextSequence === 2_006, "compaction never renumbers the signed chain");
  check(verifyProviderEvidencePacketLedger(compacted).valid, "compacted ledger remains cryptographically valid");

  check(AUDIT_TIER_CONTRACTS.basic.price.amountCents === 0, "Basic audit remains free");
  check(!AUDIT_TIER_CONTRACTS.pro.humanReviewRequired, "Pro audit does not falsely claim human review");
  check(AUDIT_TIER_CONTRACTS.advanced.humanReviewRequired, "Advanced audit requires human review");
  check(AUDIT_TIER_CONTRACTS.pro.productId === "vlm_pro_audit_review", "Pro audit has exact entitlement product");
  check(AUDIT_TIER_CONTRACTS.advanced.productId === "vlm_advanced_audit_human_review", "Advanced audit has exact entitlement product");

  const originalFetch = globalThis.fetch;
  const originalAuditProviderFetch = pass4824AuditProviderRuntimeClientDependencies.brokeredEgressFetch;
  const originalEtherscan = process.env.ETHERSCAN_API_KEY;
  const originalPaidDemo = process.env.VELMERE_LOCAL_PAID_ACCESS_DEMO;
  const previewSession = buildVelmereAccountSession({ provider: "preview", displayName: "Velmère Preview" });
  const previewCookie = buildVelmereAccountCookie(previewSession).split(";", 1)[0] ?? "";
  const previewAccountIdHash = hashVelmereAccountBinding(previewSession.accountId);
  const originalPaidSecret = process.env.VELMERE_PAID_ACCESS_SECRET;
  process.env.ETHERSCAN_API_KEY = "test-key";
  process.env.VELMERE_LOCAL_PAID_ACCESS_DEMO = "true";
  process.env.VELMERE_PAID_ACCESS_SECRET = "pass4800-paid-access-secret-32-bytes-minimum";
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    const address = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    if (url.hostname === "api.etherscan.io") {
      if (url.searchParams.get("action") === "getcontractcreation") {
        return responseJson({ status: "1", result: [{ contractAddress: address, contractCreator: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" }] });
      }
      return responseJson({ status: "1", result: [{ SourceCode: "contract Test {}", ABI: "[]", ContractName: "Test", CompilerVersion: "v0.8.20", Proxy: "0" }] });
    }
    if (url.hostname === "api.dexscreener.com") return responseJson({
      pairs: [{
        chainId: "ethereum",
        dexId: "uniswap",
        pairAddress: "0xcccccccccccccccccccccccccccccccccccccccc",
        baseToken: { address, symbol: "TST" },
        quoteToken: { address: "0xdddddddddddddddddddddddddddddddddddddddd", symbol: "USDC" },
        liquidity: { usd: 1_000_000 },
      }],
    });
    if (url.hostname === "api.gopluslabs.io") {
      return responseJson({ result: { [address]: { buy_tax: "0", sell_tax: "0", is_honeypot: "1" } } });
    }
    if (url.hostname === "api.honeypot.is") return responseJson({
      token: { address, symbol: "TST" },
      summary: { risk: "high" },
      simulationResult: { tokenAddress: address, buyTax: 0, sellTax: 0 },
      honeypotResult: { isHoneypot: true },
    });
    if (url.hostname === "api.coingecko.com") return responseJson({ coins: [{ name: "Test", symbol: "TST" }] });
    throw new Error(`unexpected audit provider ${url.href}`);
  };
  pass4824AuditProviderRuntimeClientDependencies.brokeredEgressFetch = async (input) => globalThis.fetch(input);
  resetPass4824AuditProviderRuntimeCacheForTests();
  try {
    const basicResponse = await auditReportGet(new Request("http://localhost/api/security/audit-report-assembler?tier=basic&locale=en&chain=ethereum&target=0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", {
      headers: { cookie: previewCookie },
    }));
    const basicPayload = await basicResponse.json() as {
      ok?: boolean;
      error?: string;
      releaseState?: string;
      requestedTier?: string;
      deliveredTier?: string | null;
      evidencePacket?: unknown;
      customerProjection?: unknown;
      finalVerdict?: unknown;
    };
    check(
      basicResponse.status === 422 && basicPayload.ok === false && basicPayload.error === "audit_customer_report_not_delivery_ready",
      `Synthetic provider responses cannot authorize Basic delivery (status=${basicResponse.status}; payload=${JSON.stringify(basicPayload).slice(0, 500)})`,
    );
    check(
      basicPayload.releaseState === "blocked" && basicPayload.requestedTier === "basic" && basicPayload.deliveredTier === null,
      "Basic delivery remains explicitly blocked without canonical source-bound readiness",
    );
    check(
      basicPayload.evidencePacket === undefined &&
        basicPayload.customerProjection === undefined &&
        basicPayload.finalVerdict === undefined,
      "Blocked Basic response releases no evidence packet, customer projection or verdict",
    );

    const proResponse = await auditReportGet(new Request("http://localhost/api/security/audit-report-assembler?tier=pro&locale=en&chain=ethereum&target=0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", {
      headers: { cookie: previewCookie },
    }));
    const proPayload = await proResponse.json() as { productId?: string };
    check(proResponse.status === 402, "Pro audit assembler is server-entitlement gated");
    check(proPayload.productId === "vlm_pro_audit_review", "Pro payment response names exact product");

    const advancedResponse = await auditReportGet(new Request("http://localhost/api/security/audit-report-assembler?tier=advanced&locale=en&chain=ethereum&target=0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", {
      headers: { cookie: previewCookie },
    }));
    const advancedPayload = await advancedResponse.json() as { productId?: string };
    check(advancedResponse.status === 402, "Advanced audit assembler is server-entitlement gated");
    check(advancedPayload.productId === "vlm_advanced_audit_human_review", "Advanced payment response names exact product");

    const paidTarget = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    for (const paidTier of ["pro", "advanced"] as const) {
      const productId = paidTier === "pro" ? "vlm_pro_audit_review" : "vlm_advanced_audit_human_review";
      const context = buildPass4420AdvancedPaidContext({
        locale: "en",
        depth: paidTier,
        contractAddress: paidTarget,
        accountIdHash: previewAccountIdHash,
      });
      const sessionId = `vlm_demo_pass4800_${paidTier}`;
      const entitlement = await upsertVlmPaidEntitlementFromDemoReceipt({ sessionId, productId, context });
      check(entitlement.ok === true && entitlement.mode === "memory", `${paidTier} audit receives a server-side entitlement record`);
      check(context.accountIdHash === previewAccountIdHash, `${paidTier} entitlement is bound to the signed account session`);
      const response = await auditReportGet(new Request(`http://localhost/api/security/audit-report-assembler?tier=${paidTier}&locale=en&chain=ethereum&target=${paidTarget}`, {
        headers: { cookie: previewCookie },
      }));
      const payload = await response.json() as {
        ok?: boolean;
        error?: string;
        releaseState?: string;
        requestedTier?: string;
        deliveredTier?: string | null;
        evidencePacket?: unknown;
        customerProjection?: unknown;
        finalVerdict?: unknown;
      };
      check(
        response.status === 422 && payload.ok === false && payload.error === "audit_customer_report_not_delivery_ready",
        `${paidTier} entitlement alone cannot authorize a report from synthetic provider responses`,
      );
      check(
        payload.releaseState === "blocked" && payload.requestedTier === paidTier && payload.deliveredTier === null,
        `${paidTier} delivery remains explicitly blocked at the canonical renderer boundary`,
      );
      check(
        payload.evidencePacket === undefined && payload.customerProjection === undefined && payload.finalVerdict === undefined,
        `${paidTier} blocked response releases no paid projection, evidence packet or verdict`,
      );
    }
  } finally {
    pass4824AuditProviderRuntimeClientDependencies.brokeredEgressFetch = originalAuditProviderFetch;
    resetPass4824AuditProviderRuntimeCacheForTests();
    globalThis.fetch = originalFetch;
    if (originalEtherscan === undefined) delete process.env.ETHERSCAN_API_KEY;
    else process.env.ETHERSCAN_API_KEY = originalEtherscan;
    if (originalPaidDemo === undefined) delete process.env.VELMERE_LOCAL_PAID_ACCESS_DEMO;
    else process.env.VELMERE_LOCAL_PAID_ACCESS_DEMO = originalPaidDemo;
    if (originalPaidSecret === undefined) delete process.env.VELMERE_PAID_ACCESS_SECRET;
    else process.env.VELMERE_PAID_ACCESS_SECRET = originalPaidSecret;
  }

  const sql = await readFile(path.join(process.cwd(), "db/market_integrity_provider_evidence_packet_ledger_pass4799.sql"), "utf8");
  check(sql.includes("pg_advisory_xact_lock"), "durable ledger SQL serializes concurrent appends");
  check(sql.includes("security definer") && sql.includes("service_role"), "durable ledger RPC is service-role only");
  check(sql.includes("ledger_chain_conflict"), "durable ledger fails closed on chain conflict");

  const summary = {
    passId: PASS_ID,
    ok: true,
    assertions,
    exactRuntimeRequired: { node: "24.18.0", npm: "11.16.0" },
    implemented: [
      "deep paginated Binance and Coinbase history",
      "closed-bar quality scoring, gaps, duplicates, freshness and SHA-256 series digest",
      "cross-provider consensus across hundreds of candles",
      "quality/divergence-based provider selection",
      "Coinbase 1h-to-4h and daily-to-weekly aggregation",
      "append-only digest ledger for klines, Market Impact, Whale Watch, canonical evidence and audits",
      "Basic/Pro/Advanced audit assembler entitlement and evidence thresholds",
    ],
  };
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
