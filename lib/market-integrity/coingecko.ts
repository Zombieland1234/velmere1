import { analyzeTokenRisk } from "./risk-engine";
import type { MarketMemoryMeta } from "./market-memory";
import type { TokenRiskInput, TokenRiskResult } from "./risk-types";

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

export type CoinGeckoMarketCoin = {
  id: string;
  symbol: string;
  name: string;
  image?: string;
  current_price?: number;
  market_cap?: number;
  market_cap_rank?: number;
  fully_diluted_valuation?: number | null;
  total_volume?: number;
  high_24h?: number | null;
  low_24h?: number | null;
  price_change_percentage_1h_in_currency?: number | null;
  price_change_percentage_24h?: number | null;
  price_change_percentage_24h_in_currency?: number | null;
  price_change_percentage_7d_in_currency?: number | null;
  price_change_percentage_14d_in_currency?: number | null;
  price_change_percentage_30d_in_currency?: number | null;
  circulating_supply?: number | null;
  total_supply?: number | null;
  max_supply?: number | null;
  ath?: number | null;
  ath_change_percentage?: number | null;
  ath_date?: string | null;
  last_updated?: string | null;
  sparkline_in_7d?: { price?: number[] };
};

export type MarketIntegrityRow = {
  id: string;
  rank?: number;
  symbol: string;
  name: string;
  image?: string;
  price?: number;
  priceChange1h?: number;
  priceChange24h?: number;
  priceChange7d?: number;
  priceChange14d?: number;
  priceChange30d?: number;
  marketCap?: number;
  fdv?: number;
  volume24h?: number;
  high24h?: number;
  low24h?: number;
  observedAt?: string;
  ath?: number;
  athChangePercent?: number;
  circulatingSupply?: number;
  totalSupply?: number;
  maxSupply?: number;
  sparkline7d: number[];
  result: TokenRiskResult;
  memory?: MarketMemoryMeta;
};

export type MarketChartPoint = {
  timestamp: number;
  price: number;
  volume?: number;
  marketCap?: number;
};

export type MarketChartRange = "1m" | "15m" | "1h" | "4h" | "1d" | "7d";

export type CoinSuggestion = {
  id: string;
  symbol: string;
  name: string;
  image?: string;
  rank?: number | null;
};

function cgHeaders(): HeadersInit {
  const headers: Record<string, string> = { accept: "application/json" };
  if (process.env.COINGECKO_DEMO_API_KEY)
    headers["x-cg-demo-api-key"] = process.env.COINGECKO_DEMO_API_KEY;
  if (process.env.COINGECKO_PRO_API_KEY)
    headers["x-cg-pro-api-key"] = process.env.COINGECKO_PRO_API_KEY;
  return headers;
}

function toNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function coinToRiskInput(coin: CoinGeckoMarketCoin): TokenRiskInput {
  const ath = toNumber(coin.ath ?? undefined);
  const current = toNumber(coin.current_price);
  const marketCap = toNumber(coin.market_cap);
  const volume = toNumber(coin.total_volume);
  const priceChange24h = toNumber(
    coin.price_change_percentage_24h_in_currency ??
      coin.price_change_percentage_24h ??
      undefined,
  );

  return {
    marketId: coin.id,
    symbol: coin.symbol?.toUpperCase() ?? coin.id.toUpperCase(),
    name: coin.name ?? coin.symbol?.toUpperCase() ?? coin.id,
    image: coin.image,
    rank: toNumber(coin.market_cap_rank),
    currentPrice: current,
    athPrice: ath,
    marketCap,
    fdv: toNumber(coin.fully_diluted_valuation ?? undefined),
    volume24h: volume,
    priceChange1h: toNumber(
      coin.price_change_percentage_1h_in_currency ?? undefined,
    ),
    priceChange24h,
    priceChange7d: toNumber(
      coin.price_change_percentage_7d_in_currency ?? undefined,
    ),
    priceChange14d: toNumber(
      coin.price_change_percentage_14d_in_currency ?? undefined,
    ),
    priceChange30d: toNumber(
      coin.price_change_percentage_30d_in_currency ?? undefined,
    ),
    circulatingSupply: toNumber(coin.circulating_supply ?? undefined),
    totalSupply: toNumber(coin.total_supply ?? undefined),
    maxSupply: toNumber(coin.max_supply ?? undefined),
    sparkline7d: Array.isArray(coin.sparkline_in_7d?.price)
      ? coin.sparkline_in_7d?.price
      : undefined,
    hadRebrandAfterCrash: false,
    dataSources: ["CoinGecko markets"],
  };
}

export function coinToMarketRow(coin: CoinGeckoMarketCoin): MarketIntegrityRow {
  const result = analyzeTokenRisk(coinToRiskInput(coin), "live");
  return {
    id: coin.id,
    rank: toNumber(coin.market_cap_rank),
    symbol: coin.symbol?.toUpperCase() ?? coin.id.toUpperCase(),
    name: coin.name ?? coin.id,
    image: coin.image,
    price: toNumber(coin.current_price),
    priceChange1h: toNumber(
      coin.price_change_percentage_1h_in_currency ?? undefined,
    ),
    priceChange24h: toNumber(
      coin.price_change_percentage_24h_in_currency ??
        coin.price_change_percentage_24h ??
        undefined,
    ),
    priceChange7d: toNumber(
      coin.price_change_percentage_7d_in_currency ?? undefined,
    ),
    priceChange14d: toNumber(
      coin.price_change_percentage_14d_in_currency ?? undefined,
    ),
    priceChange30d: toNumber(
      coin.price_change_percentage_30d_in_currency ?? undefined,
    ),
    marketCap: toNumber(coin.market_cap),
    fdv: toNumber(coin.fully_diluted_valuation ?? undefined),
    volume24h: toNumber(coin.total_volume),
    high24h: toNumber(coin.high_24h ?? undefined),
    low24h: toNumber(coin.low_24h ?? undefined),
    observedAt:
      typeof coin.last_updated === "string" && coin.last_updated.trim()
        ? coin.last_updated
        : undefined,
    ath: toNumber(coin.ath ?? undefined),
    athChangePercent: toNumber(coin.ath_change_percentage ?? undefined),
    circulatingSupply: toNumber(coin.circulating_supply ?? undefined),
    totalSupply: toNumber(coin.total_supply ?? undefined),
    maxSupply: toNumber(coin.max_supply ?? undefined),
    sparkline7d: Array.isArray(coin.sparkline_in_7d?.price)
      ? coin.sparkline_in_7d.price.filter((item) => Number.isFinite(item))
      : [],
    result,
  };
}

async function fetchJson<T>(url: string, revalidate = 90): Promise<T> {
  const response = await fetch(url, {
    headers: cgHeaders(),
    next: { revalidate },
  } as RequestInit & { next: { revalidate: number } });
  if (!response.ok)
    throw new Error(`CoinGecko request failed with status ${response.status}`);
  return (await response.json()) as T;
}

export async function fetchCoinGeckoMarkets({
  page = 1,
  perPage = 250,
  vsCurrency = "usd",
  ids,
}: {
  page?: number;
  perPage?: number;
  vsCurrency?: string;
  ids?: string[];
} = {}) {
  const params = new URLSearchParams({
    vs_currency: vsCurrency,
    order: "market_cap_desc",
    per_page: String(Math.min(Math.max(perPage, 10), 250)),
    page: String(Math.max(page, 1)),
    sparkline: "true",
    price_change_percentage: "1h,24h,7d,14d,30d",
    locale: "en",
  });
  if (ids?.length) params.set("ids", ids.join(","));
  const data = await fetchJson<CoinGeckoMarketCoin[]>(
    `${COINGECKO_BASE}/coins/markets?${params.toString()}`,
    120,
  );
  return data.map(coinToMarketRow);
}

export async function fetchCoinGeckoSuggestions(
  query: string,
): Promise<CoinSuggestion[]> {
  const clean = query.trim().toLowerCase().slice(0, 80);
  if (clean.length < 2) return [];
  const params = new URLSearchParams({ query: clean });
  const data = await fetchJson<{
    coins?: Array<{
      id: string;
      name: string;
      symbol: string;
      thumb?: string;
      large?: string;
      market_cap_rank?: number | null;
    }>;
  }>(`${COINGECKO_BASE}/search?${params.toString()}`, 300);
  const mapped = (data.coins ?? []).map((coin) => ({
    id: coin.id,
    symbol: coin.symbol?.toUpperCase() ?? coin.id.toUpperCase(),
    name: coin.name ?? coin.id,
    image: coin.large ?? coin.thumb,
    rank: coin.market_cap_rank ?? null,
  }));
  const scoreSuggestion = (coin: CoinSuggestion) => {
    const symbol = coin.symbol.toLowerCase();
    const name = coin.name.toLowerCase();
    const id = coin.id.toLowerCase();
    const words = name.split(/[^a-z0-9]+/).filter(Boolean);
    if (symbol === clean) return 0;
    if (id === clean) return 1;
    if (name === clean) return 2;
    if (symbol.startsWith(clean)) return 3;
    if (id.startsWith(clean)) return 4;
    if (words.some((word) => word.startsWith(clean))) return 5;
    if (clean.length >= 4 && name.includes(clean)) return 7;
    return Number.POSITIVE_INFINITY;
  };

  return mapped
    .map((coin) => ({ coin, score: scoreSuggestion(coin) }))
    .filter(({ score }) => Number.isFinite(score))
    .sort(
      (a, b) =>
        a.score - b.score || (a.coin.rank ?? 999999) - (b.coin.rank ?? 999999),
    )
    .map(({ coin }) => coin)
    .slice(0, 8);
}

async function resolveCoinId(query: string) {
  const clean = query.trim().toLowerCase().slice(0, 80);
  if (!clean) return null;
  const suggestions = await fetchCoinGeckoSuggestions(clean);
  const exact = suggestions.find(
    (coin) =>
      coin.id.toLowerCase() === clean ||
      coin.symbol.toLowerCase() === clean ||
      coin.name.toLowerCase() === clean,
  );
  return (exact ?? suggestions[0])?.id ?? null;
}

export async function searchCoinGeckoMarket(query: string) {
  const clean = query.trim().toLowerCase().slice(0, 80);
  if (!clean) return null;
  const id = await resolveCoinId(clean);
  if (!id) return null;
  const rows = await fetchCoinGeckoMarkets({ ids: [id], perPage: 10 });
  return rows[0] ?? null;
}

type ChartRangeProfile = {
  days: string;
  intervalMinutes: number;
  targetPoints: number;
};

function chartRangeProfile(range: MarketChartRange): ChartRangeProfile {
  // PASS 57: chart buttons now act like exchange intervals. CoinGecko is a
  // fallback source, so we request enough history and resample toward the same
  // target density used by Binance klines.
  if (range === "1m")
    return { days: "1", intervalMinutes: 1, targetPoints: 180 };
  if (range === "15m")
    return { days: "3", intervalMinutes: 15, targetPoints: 180 };
  if (range === "1h")
    return { days: "14", intervalMinutes: 60, targetPoints: 180 };
  if (range === "4h")
    return { days: "90", intervalMinutes: 240, targetPoints: 180 };
  if (range === "1d")
    return { days: "365", intervalMinutes: 1440, targetPoints: 180 };
  return { days: "max", intervalMinutes: 10080, targetPoints: 104 };
}

function resampleMarketChartPoints(
  points: MarketChartPoint[],
  range: MarketChartRange,
) {
  const profile = chartRangeProfile(range);
  if (points.length <= profile.targetPoints) return points;
  const intervalMs = profile.intervalMinutes * 60 * 1000;
  const sorted = [...points].sort((a, b) => a.timestamp - b.timestamp);
  const sampled: MarketChartPoint[] = [];
  let nextAllowed = Number.POSITIVE_INFINITY;
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const point = sorted[index];
    if (point.timestamp <= nextAllowed) {
      sampled.push(point);
      nextAllowed = point.timestamp - intervalMs;
    }
    if (sampled.length >= profile.targetPoints) break;
  }
  const normalized = sampled.reverse();
  return normalized.length >= 2
    ? normalized
    : sorted.slice(-Math.min(sorted.length, profile.targetPoints));
}

export async function fetchCoinGeckoMarketChart(
  id: string,
  range: MarketChartRange = "7d",
) {
  const clean = id.trim().toLowerCase().slice(0, 120);
  if (!clean) throw new Error("Missing CoinGecko coin id");
  const profile = chartRangeProfile(range);
  const params = new URLSearchParams({
    vs_currency: "usd",
    days: profile.days,
  });
  const data = await fetchJson<{
    prices?: [number, number][];
    market_caps?: [number, number][];
    total_volumes?: [number, number][];
  }>(
    `${COINGECKO_BASE}/coins/${encodeURIComponent(clean)}/market_chart?${params.toString()}`,
    range === "1m" || range === "15m" ? 90 : 240,
  );
  const prices = (data.prices ?? []).filter(
    ([timestamp, price]) =>
      Number.isFinite(timestamp) && Number.isFinite(price),
  );
  const volumes = new Map(
    (data.total_volumes ?? []).map(([timestamp, volume]) => [
      timestamp,
      volume,
    ]),
  );
  const marketCaps = new Map(
    (data.market_caps ?? []).map(([timestamp, cap]) => [timestamp, cap]),
  );
  const allPoints: MarketChartPoint[] = prices.map(([timestamp, price]) => ({
    timestamp,
    price,
    volume: volumes.get(timestamp),
    marketCap: marketCaps.get(timestamp),
  }));
  return resampleMarketChartPoints(allPoints, range);
}
