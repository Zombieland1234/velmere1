import { PASS481_ASSET_IDENTITIES } from "@/lib/market-integrity/asset-identity-registry";
import type { MarketIntegrityRow } from "@/lib/market-integrity/market-row-types";
import type { TokenRiskResult } from "@/lib/market-integrity/risk-types";
import { buildRiskIndicatorCustomerTruth } from "@/lib/market-integrity/risk-indicator-customer-truth";
import type { KlineAssetIdentity, KlineRequestContract } from "@/lib/market-integrity/kline-asset-identity";
import type { MarketCandle } from "@/lib/market-integrity/kline-types";

export const A102R22_LOCAL_MARKET_REFERENCE_ID =
  "a102r22-local-development-market-reference-not-live-v1" as const;

export const A102R23_LOCAL_KLINE_REFERENCE_ID =
  "a102r23-local-development-kline-reference-not-live-v1" as const;

const FIXED_REFERENCE_EPOCH = "2026-07-30T00:00:00.000Z";
const REFERENCE_VALUES: Record<string, { price: number; marketCap: number; volume: number }> = {
  BTC: { price: 64000, marketCap: 1_260_000_000_000, volume: 31_000_000_000 },
  ETH: { price: 3300, marketCap: 397_000_000_000, volume: 18_000_000_000 },
  SOL: { price: 170, marketCap: 79_000_000_000, volume: 3_800_000_000 },
  BNB: { price: 590, marketCap: 87_000_000_000, volume: 1_900_000_000 },
  USDT: { price: 1, marketCap: 112_000_000_000, volume: 48_000_000_000 },
  USDC: { price: 1, marketCap: 32_000_000_000, volume: 6_000_000_000 },
  XRP: { price: 0.55, marketCap: 30_000_000_000, volume: 1_200_000_000 },
  ADA: { price: 0.42, marketCap: 15_000_000_000, volume: 420_000_000 },
  DOGE: { price: 0.13, marketCap: 19_000_000_000, volume: 900_000_000 },
  AVAX: { price: 32, marketCap: 12_500_000_000, volume: 380_000_000 },
  LINK: { price: 14, marketCap: 8_500_000_000, volume: 410_000_000 },
  DOT: { price: 6.2, marketCap: 8_700_000_000, volume: 220_000_000 },
  POL: { price: 0.52, marketCap: 5_200_000_000, volume: 190_000_000 },
  LTC: { price: 74, marketCap: 5_500_000_000, volume: 310_000_000 },
  TRX: { price: 0.12, marketCap: 10_500_000_000, volume: 420_000_000 },
  TON: { price: 6.8, marketCap: 16_700_000_000, volume: 320_000_000 },
  SHIB: { price: 0.000017, marketCap: 10_000_000_000, volume: 360_000_000 },
  UNI: { price: 8.4, marketCap: 5_000_000_000, volume: 210_000_000 },
  ATOM: { price: 7.1, marketCap: 2_800_000_000, volume: 150_000_000 },
  NEAR: { price: 5.2, marketCap: 5_700_000_000, volume: 290_000_000 },
  APT: { price: 7.4, marketCap: 3_400_000_000, volume: 210_000_000 },
  ARB: { price: 0.75, marketCap: 2_500_000_000, volume: 310_000_000 },
  OP: { price: 1.8, marketCap: 2_000_000_000, volume: 190_000_000 },
  SUI: { price: 0.95, marketCap: 2_400_000_000, volume: 260_000_000 },
  PEPE: { price: 0.000012, marketCap: 5_000_000_000, volume: 650_000_000 },
};

function sparkline(price: number, index: number) {
  return Array.from({ length: 42 }, (_, point) => {
    const wave = Math.sin((point + index) / 4.1) * 0.018;
    const drift = ((point - 21) / 21) * (((index % 7) - 3) * 0.0012);
    return Math.max(price * 0.01, price * (1 + wave + drift));
  });
}

export function buildLocalDevelopmentMarketReferenceRows(args: { page: number; perPage: number }): MarketIntegrityRow[] {
  if (process.env.NODE_ENV === "production") return [];
  const identities = PASS481_ASSET_IDENTITIES.filter((row) =>
    (row.assetClass === "crypto" || row.assetClass === "exchange_token") && REFERENCE_VALUES[row.symbol],
  );
  const start = (args.page - 1) * args.perPage;
  return identities.slice(start, start + args.perPage).map((identity, index) => {
    const reference = REFERENCE_VALUES[identity.symbol]!;
    const globalIndex = start + index;
    const priceChange1h = ((globalIndex % 9) - 4) * 0.18;
    const priceChange24h = ((globalIndex % 11) - 5) * 0.72;
    const priceChange7d = ((globalIndex % 13) - 6) * 1.35;
    const priceChange30d = ((globalIndex % 15) - 7) * 2.1;
    const series = sparkline(reference.price, globalIndex);
    const riskInput = {
      marketId: `local-reference-${identity.symbol.toLowerCase()}`,
      symbol: identity.symbol,
      name: identity.label,
      assetClass: "crypto" as const,
      dataSources: [A102R22_LOCAL_MARKET_REFERENCE_ID],
    };
    const baseResult: Omit<TokenRiskResult, "customerTruth"> = {
      token: {
        marketId: `local-reference-${identity.symbol.toLowerCase()}`,
        symbol: identity.symbol,
        name: identity.label,
        image: `/market-logos/${identity.symbol.toLowerCase()}.svg`,
        rank: globalIndex + 1,
        assetClass: "crypto",
      },
      score: 0,
      confidence: 0,
      level: "low",
      badge: "low_detected_risk",
      signals: [],
      metrics: {
        currentPrice: reference.price,
        marketCap: reference.marketCap,
        volume24h: reference.volume,
        priceChange1h,
        priceChange24h,
        priceChange7d,
        priceChange30d,
      },
      dataQuality: "demo",
      chart: { sevenDay: series },
      dataSources: [A102R22_LOCAL_MARKET_REFERENCE_ID],
      limitations: [
        "Local development reference only.",
        "Values are fixed illustrative fixtures and are not current market data.",
        "Risk, confidence, LIVE and paid delivery claims are withheld.",
      ],
      providerRiskDelivery: {
        schemaVersion: "pass6_provider_risk_delivery_v1",
        state: "withheld",
        scorePublished: false,
        canonicalIdentity: `local-reference-${identity.symbol.toLowerCase()}`,
        sourceReceiptRoot: "withheld_local_reference",
        receiptDigest: "withheld_local_reference",
        completenessBps: 0,
        sourceAsOf: null,
        blockers: ["local_reference_not_live", "provider_rights_not_verified"],
      },
      generatedAt: FIXED_REFERENCE_EPOCH,
    };
    const result: TokenRiskResult = {
      ...baseResult,
      customerTruth: buildRiskIndicatorCustomerTruth({
        input: riskInput,
        result: baseResult,
        reportContextDepth: null,
      }),
    };
    return {
      id: `local-reference-${identity.symbol.toLowerCase()}`,
      rank: globalIndex + 1,
      symbol: identity.symbol,
      name: identity.label,
      image: `/market-logos/${identity.symbol.toLowerCase()}.svg`,
      price: reference.price,
      priceChange1h,
      priceChange24h,
      priceChange7d,
      priceChange30d,
      marketCap: reference.marketCap,
      volume24h: reference.volume,
      observedAt: FIXED_REFERENCE_EPOCH,
      sparkline7d: series,
      result,
    };
  });
}


const KLINE_INTERVAL_MS: Record<KlineRequestContract["range"], number> = {
  "1m": 60_000,
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "4h": 4 * 60 * 60_000,
  "1d": 24 * 60 * 60_000,
  "7d": 7 * 24 * 60 * 60_000,
  "1mo": 24 * 60 * 60_000,
};

const FIXED_REFERENCE_END_MS = Date.parse(FIXED_REFERENCE_EPOCH);

function exactLocalReferenceValue(identity: KlineAssetIdentity) {
  const expectedMarketId = `local-reference-${identity.symbol.toLowerCase()}`;
  if (identity.marketId !== expectedMarketId || identity.quote !== "USD" || identity.chainId !== null || identity.address !== null) {
    return null;
  }
  return REFERENCE_VALUES[identity.symbol] ?? null;
}

function localReferenceCandle(args: {
  basePrice: number;
  index: number;
  timestamp: number;
  symbolSeed: number;
}): MarketCandle {
  const cycle = Math.sin((args.index + args.symbolSeed) / 7.5) * 0.012;
  const micro = Math.cos((args.index * 1.7 + args.symbolSeed) / 5.2) * 0.0045;
  const drift = ((args.index - 90) / 90) * (((args.symbolSeed % 7) - 3) * 0.0008);
  const open = args.basePrice * (1 + cycle + drift);
  const close = args.basePrice * (1 + cycle + micro + drift);
  const spread = Math.max(args.basePrice * 0.0018, Math.abs(close - open) * 0.85);
  return {
    timestamp: args.timestamp,
    open,
    high: Math.max(open, close) + spread,
    low: Math.max(args.basePrice * 0.01, Math.min(open, close) - spread),
    close,
    volume: Math.max(1, (args.symbolSeed + 11) * 1_000 + args.index * 37),
  };
}

export function buildLocalDevelopmentKlineReference(args: {
  identity: KlineAssetIdentity;
  range: KlineRequestContract["range"];
}) {
  if (process.env.NODE_ENV === "production") return null;
  const reference = exactLocalReferenceValue(args.identity);
  if (!reference) return null;
  const intervalMs = KLINE_INTERVAL_MS[args.range];
  const bars = args.range === "1m" ? 240 : 180;
  const symbolSeed = Array.from(args.identity.symbol).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const firstTimestamp = FIXED_REFERENCE_END_MS - intervalMs * bars;
  const candles = Array.from({ length: bars }, (_, index) => localReferenceCandle({
    basePrice: reference.price,
    index,
    timestamp: firstTimestamp + intervalMs * index,
    symbolSeed,
  }));
  return {
    mode: "local_reference" as const,
    freshness: "local_reference_not_live" as const,
    source: "Velmère local development OHLC reference · illustrative fixed series · not current market data",
    identity: args.identity,
    pair: `${args.identity.symbol}/USD`,
    range: args.range,
    candles,
    generatedAt: FIXED_REFERENCE_EPOCH,
    receivedAt: FIXED_REFERENCE_EPOCH,
    sourceObservations: [],
    providerErrors: ["provider_rights_not_verified"],
    verification: {
      state: "withheld" as const,
      successfulProviders: [],
      providerCount: 0,
      selectedProvider: null,
      exactIdentity: true,
      liveClaimAllowed: false,
    },
    delivery: {
      state: "withheld" as const,
      scorePublished: false,
      blockers: ["local_reference_not_live", "provider_rights_not_verified"],
    },
    referenceProfile: A102R23_LOCAL_KLINE_REFERENCE_ID,
    liveProven: false,
    saleEnabled: false,
  };
}
