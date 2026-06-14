export const REAL_MARKETS_DATA_CONTRACT_VERSION =
  "velmere.real_markets.instrument.v1" as const;

export type RealMarketsAssetClass =
  | "crypto"
  | "equity"
  | "index"
  | "fx"
  | "etf"
  | "commodity"
  | "reit"
  | "exchange"
  | "unknown";

export type RealMarketsFreshness =
  | "fresh"
  | "aging"
  | "stale"
  | "unknown";

export type CanonicalRealMarketInstrument = {
  schemaVersion: typeof REAL_MARKETS_DATA_CONTRACT_VERSION;
  id: string;
  symbol: string;
  assetClass: RealMarketsAssetClass;
  state: "available" | "unavailable";
  price: number | null;
  currency: string | null;
  changes: {
    oneHour: number | null;
    oneDay: number | null;
    sevenDays: number | null;
    thirtyDays: number | null;
  };
  marketCap: number | null;
  volume24h: number | null;
  source: {
    provider: string;
    observedAt: string | null;
    freshness: RealMarketsFreshness;
    exchange: string | null;
  };
  missingData: string[];
};

type ProviderQuoteLike = {
  id?: unknown;
  symbol?: unknown;
  assetClass?: unknown;
  state?: unknown;
  source?: unknown;
  sourceTimestamp?: unknown;
  exchange?: unknown;
  currency?: unknown;
  currentPrice?: unknown;
  changePercent?: unknown;
  priceChange1h?: unknown;
  priceChange24h?: unknown;
  priceChange7d?: unknown;
  priceChange30d?: unknown;
  marketCap?: unknown;
  volume24h?: unknown;
};

const finite = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

function normalizeAssetClass(value: unknown): RealMarketsAssetClass {
  switch (value) {
    case "crypto":
      return "crypto";
    case "stock":
    case "exchange_equity":
      return "equity";
    case "index":
      return "index";
    case "fx":
      return "fx";
    case "etf":
      return "etf";
    case "commodity":
      return "commodity";
    case "real_estate":
      return "reit";
    case "venue_health":
      return "exchange";
    default:
      return "unknown";
  }
}

function normalizeObservedAt(value: unknown): string | null {
  const timestamp = finite(value);
  if (timestamp === null || timestamp <= 0) return null;
  const milliseconds = timestamp > 10_000_000_000 ? timestamp : timestamp * 1000;
  const date = new Date(milliseconds);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function resolveFreshness(
  observedAt: string | null,
  nowMs: number,
): RealMarketsFreshness {
  if (!observedAt) return "unknown";
  const ageMs = Math.max(0, nowMs - new Date(observedAt).getTime());
  if (ageMs <= 15 * 60 * 1000) return "fresh";
  if (ageMs <= 24 * 60 * 60 * 1000) return "aging";
  return "stale";
}

export function toCanonicalRealMarketInstrument(
  input: ProviderQuoteLike,
  nowMs = Date.now(),
): CanonicalRealMarketInstrument {
  const id = text(input.id) ?? text(input.symbol) ?? "unknown";
  const symbol = text(input.symbol) ?? id.toUpperCase();
  const observedAt = normalizeObservedAt(input.sourceTimestamp);
  const price = finite(input.currentPrice);
  const oneDay = finite(input.priceChange24h) ?? finite(input.changePercent);
  const state = input.state === "live" && price !== null ? "available" : "unavailable";
  const missingData = [
    price === null ? "price" : null,
    observedAt === null ? "source_timestamp" : null,
    text(input.source) === null ? "source_provider" : null,
  ].filter((value): value is string => Boolean(value));

  return {
    schemaVersion: REAL_MARKETS_DATA_CONTRACT_VERSION,
    id,
    symbol,
    assetClass: normalizeAssetClass(input.assetClass),
    state,
    price,
    currency: text(input.currency),
    changes: {
      oneHour: finite(input.priceChange1h),
      oneDay,
      sevenDays: finite(input.priceChange7d),
      thirtyDays: finite(input.priceChange30d),
    },
    marketCap: finite(input.marketCap),
    volume24h: finite(input.volume24h),
    source: {
      provider: text(input.source) ?? "source unavailable",
      observedAt,
      freshness: resolveFreshness(observedAt, nowMs),
      exchange: text(input.exchange),
    },
    missingData,
  };
}

export const realMarketsDataContract = {
  schemaVersion: REAL_MARKETS_DATA_CONTRACT_VERSION,
  assetClasses: [
    "crypto",
    "equity",
    "index",
    "fx",
    "etf",
    "commodity",
    "reit",
    "exchange",
    "unknown",
  ] as const,
  sourceRules: {
    timestampRequiredForLiveLabel: true,
    unavailableValuesRemainNull: true,
    providerNameRequired: true,
    staleDataCannotBePresentedAsLive: true,
  },
} as const;
