import type { MarketIntegrityRow } from "./coingecko";
import type { TokenRiskResult } from "./risk-types";

export type MarketRiskSnapshot = {
  id: string;
  symbol: string;
  name: string;
  timestamp: string;
  price?: number;
  marketCap?: number;
  volume24h?: number;
  score: number;
  level: TokenRiskResult["level"];
  signalCount: number;
  dominantAgent?: string;
  confidence?: number;
};

export type MarketMemoryMeta = {
  firstSeenAt?: string;
  lastSeenAt?: string;
  observations: number;
  riskDelta1?: number;
  riskDeltaLatest?: number;
  priceDeltaLatestPercent?: number;
  volumeDeltaLatestPercent?: number;
  riskVelocityPerHour?: number;
  trend: "new" | "stable" | "rising_risk" | "cooling" | "volatile";
  lastSnapshot?: MarketRiskSnapshot;
};

export type MarketSweepInsight = {
  id: string;
  symbol: string;
  name: string;
  score: number;
  previousScore?: number;
  riskDelta?: number;
  priceDeltaPercent?: number;
  volumeDeltaPercent?: number;
  trend: MarketMemoryMeta["trend"];
  reason: string;
};

type MemoryStore = {
  snapshots: Map<string, MarketRiskSnapshot[]>;
  lastSweepAt?: string;
};

const globalKey = "__velmereMarketIntegrityMemory";

type GlobalWithMarketMemory = typeof globalThis & {
  [globalKey]?: MemoryStore;
};

function getStore(): MemoryStore {
  const g = globalThis as GlobalWithMarketMemory;
  if (!g[globalKey]) g[globalKey] = { snapshots: new Map() };
  return g[globalKey]!;
}

function toFinite(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function percentChange(current?: number, previous?: number) {
  if (current === undefined || previous === undefined || previous === 0) return undefined;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function rounded(value?: number, digits = 2) {
  return value === undefined ? undefined : Number(value.toFixed(digits));
}

function snapshotFromRow(row: MarketIntegrityRow): MarketRiskSnapshot {
  return {
    id: row.id,
    symbol: row.symbol,
    name: row.name,
    timestamp: new Date().toISOString(),
    price: toFinite(row.price),
    marketCap: toFinite(row.marketCap),
    volume24h: toFinite(row.volume24h),
    score: row.result.score,
    level: row.result.level,
    signalCount: row.result.signals.length,
    dominantAgent: row.result.metaModel?.dominantAgent,
    confidence: row.result.confidence,
  };
}

function trendFromDeltas(riskDelta?: number, priceDelta?: number, volumeDelta?: number): MarketMemoryMeta["trend"] {
  const absRisk = Math.abs(riskDelta ?? 0);
  const absPrice = Math.abs(priceDelta ?? 0);
  const absVolume = Math.abs(volumeDelta ?? 0);
  if (riskDelta === undefined && priceDelta === undefined && volumeDelta === undefined) return "new";
  if ((riskDelta ?? 0) >= 12) return "rising_risk";
  if ((riskDelta ?? 0) <= -10) return "cooling";
  if (absRisk >= 8 || absPrice >= 12 || absVolume >= 60) return "volatile";
  return "stable";
}

export function recordMarketRows(rows: MarketIntegrityRow[]) {
  const store = getStore();
  const now = new Date().toISOString();
  store.lastSweepAt = now;

  return rows.map((row) => {
    const snapshot = snapshotFromRow(row);
    const history = store.snapshots.get(row.id) ?? [];
    const previous = history.at(-1);
    const first = history[0] ?? snapshot;
    const nextHistory = [...history, snapshot].slice(-96);
    store.snapshots.set(row.id, nextHistory);

    const riskDeltaLatest = previous ? snapshot.score - previous.score : undefined;
    const riskDelta1 = previous ? snapshot.score - first.score : undefined;
    const priceDeltaLatestPercent = rounded(percentChange(snapshot.price, previous?.price));
    const volumeDeltaLatestPercent = rounded(percentChange(snapshot.volume24h, previous?.volume24h));
    const hours = previous
      ? Math.max(1 / 60, (Date.parse(snapshot.timestamp) - Date.parse(previous.timestamp)) / 3_600_000)
      : undefined;
    const riskVelocityPerHour = hours ? rounded((riskDeltaLatest ?? 0) / hours, 2) : undefined;
    const trend = trendFromDeltas(riskDeltaLatest, priceDeltaLatestPercent, volumeDeltaLatestPercent);

    return {
      ...row,
      memory: {
        firstSeenAt: first.timestamp,
        lastSeenAt: snapshot.timestamp,
        observations: nextHistory.length,
        riskDelta1: rounded(riskDelta1),
        riskDeltaLatest: rounded(riskDeltaLatest),
        priceDeltaLatestPercent,
        volumeDeltaLatestPercent,
        riskVelocityPerHour,
        trend,
        lastSnapshot: snapshot,
      } satisfies MarketMemoryMeta,
    };
  });
}

export function recordSingleResult(result: TokenRiskResult) {
  const row: MarketIntegrityRow = {
    id: result.token.marketId ?? result.token.tokenAddress ?? result.token.symbol,
    rank: result.token.rank,
    symbol: result.token.symbol,
    name: result.token.name,
    image: result.token.image,
    price: result.metrics.currentPrice,
    priceChange1h: result.metrics.priceChange1h,
    priceChange24h: result.metrics.priceChange24h,
    priceChange7d: result.metrics.priceChange7d,
    priceChange14d: result.metrics.priceChange14d,
    priceChange30d: result.metrics.priceChange30d,
    marketCap: result.metrics.marketCap,
    fdv: result.metrics.fdv,
    volume24h: result.metrics.volume24h,
    ath: result.metrics.athPrice,
    circulatingSupply: undefined,
    totalSupply: undefined,
    maxSupply: undefined,
    sparkline7d: result.chart?.sevenDay ?? [],
    result,
  };
  return recordMarketRows([row])[0]?.memory;
}

export function getMarketHistory(id: string) {
  const store = getStore();
  return store.snapshots.get(id) ?? [];
}

export function getMarketMemoryStatus() {
  const store = getStore();
  const histories = Array.from(store.snapshots.values());
  const allSnapshots = histories.flat();
  const lastById = histories
    .map((history) => history.at(-1))
    .filter((item): item is MarketRiskSnapshot => Boolean(item));
  return {
    lastSweepAt: store.lastSweepAt,
    trackedAssets: histories.length,
    storedSnapshots: allSnapshots.length,
    highestStoredRisk: lastById.sort((a, b) => b.score - a.score)[0],
  };
}

export function buildSweepInsights(rows: Array<MarketIntegrityRow & { memory?: MarketMemoryMeta }>): MarketSweepInsight[] {
  return rows
    .map((row) => {
      const memory = row.memory;
      const delta = memory?.riskDeltaLatest ?? 0;
      const priceDelta = memory?.priceDeltaLatestPercent;
      const volumeDelta = memory?.volumeDeltaLatestPercent;
      const reasons = [
        row.result.score >= 85 ? "critical score" : undefined,
        delta >= 12 ? `risk delta +${delta}` : undefined,
        Math.abs(priceDelta ?? 0) >= 18 ? `price move ${rounded(priceDelta)}%` : undefined,
        Math.abs(volumeDelta ?? 0) >= 80 ? `volume shift ${rounded(volumeDelta)}%` : undefined,
        row.result.signals[0] ? row.result.signals[0].id.replaceAll("_", " ") : undefined,
      ].filter(Boolean);
      return {
        id: row.id,
        symbol: row.symbol,
        name: row.name,
        score: row.result.score,
        previousScore: memory?.lastSnapshot ? row.result.score - (memory.riskDeltaLatest ?? 0) : undefined,
        riskDelta: memory?.riskDeltaLatest,
        priceDeltaPercent: priceDelta,
        volumeDeltaPercent: volumeDelta,
        trend: memory?.trend ?? "new",
        reason: reasons.join(" · ") || "no major anomaly in current sweep",
      } satisfies MarketSweepInsight;
    })
    .sort((a, b) => {
      const aRank = a.score + Math.max(0, a.riskDelta ?? 0) * 2 + Math.abs(a.priceDeltaPercent ?? 0) / 2;
      const bRank = b.score + Math.max(0, b.riskDelta ?? 0) * 2 + Math.abs(b.priceDeltaPercent ?? 0) / 2;
      return bRank - aRank;
    })
    .slice(0, 12);
}
