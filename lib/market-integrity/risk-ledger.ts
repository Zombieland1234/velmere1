import type { MarketIntegrityRow } from "./coingecko";
import type { MarketRiskSnapshot } from "./market-memory";
import { getPass423RetentionPolicy, pass423PruneRiskHistory, pass423SelectAnalysisWindow } from "./pass423-long-term-memory-spine";

export type LedgerMode = "supabase" | "memory";

export type LedgerWriteResult = {
  mode: LedgerMode;
  attempted: number;
  stored: number;
  skipped: number;
  error?: string;
};

type LedgerStore = {
  snapshots: Map<string, MarketRiskSnapshot[]>;
  lastPersistAt?: string;
  lastError?: string;
};

const globalKey = "__velmereMarketIntegrityPersistentLedger";

type GlobalWithLedger = typeof globalThis & {
  [globalKey]?: LedgerStore;
};

function getStore(): LedgerStore {
  const g = globalThis as GlobalWithLedger;
  if (!g[globalKey]) g[globalKey] = { snapshots: new Map() };
  return g[globalKey]!;
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

function uniqueSnapshots(snapshots: MarketRiskSnapshot[]) {
  const seen = new Set<string>();
  return snapshots.filter((snapshot) => {
    const key = `${snapshot.id}:${snapshot.timestamp}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function rowsToSnapshots(rows: Array<MarketIntegrityRow & { memory?: { lastSnapshot?: MarketRiskSnapshot } }>) {
  return rows
    .map((row) => row.memory?.lastSnapshot)
    .filter((snapshot): snapshot is MarketRiskSnapshot => Boolean(snapshot));
}

function persistToMemory(snapshots: MarketRiskSnapshot[]): LedgerWriteResult {
  const store = getStore();
  const now = new Date().toISOString();
  const unique = uniqueSnapshots(snapshots);
  let stored = 0;

  for (const snapshot of unique) {
    const history = store.snapshots.get(snapshot.id) ?? [];
    const alreadyExists = history.some((item) => item.timestamp === snapshot.timestamp);
    if (alreadyExists) continue;
    store.snapshots.set(snapshot.id, pass423PruneRiskHistory([...history, snapshot]));
    stored += 1;
  }

  store.lastPersistAt = now;
  store.lastError = undefined;

  return {
    mode: "memory",
    attempted: snapshots.length,
    stored,
    skipped: Math.max(0, snapshots.length - stored),
  };
}

async function persistToSupabase(snapshots: MarketRiskSnapshot[]): Promise<LedgerWriteResult> {
  const config = getSupabaseConfig();
  if (!config) return persistToMemory(snapshots);

  const unique = uniqueSnapshots(snapshots);
  if (!unique.length) return { mode: "supabase", attempted: 0, stored: 0, skipped: 0 };

  const payload = unique.map((snapshot) => ({
    asset_id: snapshot.id,
    symbol: snapshot.symbol,
    name: snapshot.name,
    observed_at: snapshot.timestamp,
    price: snapshot.price ?? null,
    market_cap: snapshot.marketCap ?? null,
    volume_24h: snapshot.volume24h ?? null,
    risk_score: snapshot.score,
    risk_level: snapshot.level,
    signal_count: snapshot.signalCount,
    dominant_agent: snapshot.dominantAgent ?? null,
    confidence: snapshot.confidence ?? null,
    raw_snapshot: snapshot,
  }));

  try {
    const response = await fetch(`${config.url}/rest/v1/market_integrity_snapshots`, {
      method: "POST",
      headers: {
        apikey: config.key,
        authorization: `Bearer ${config.key}`,
        "content-type": "application/json",
        prefer: "resolution=ignore-duplicates,return=minimal",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      const fallback = persistToMemory(unique);
      const store = getStore();
      store.lastError = `Supabase ${response.status}: ${text.slice(0, 180)}`;
      return {
        ...fallback,
        mode: "memory",
        error: store.lastError,
      };
    }

    // Keep a small in-process mirror too, so dev UI remains instant.
    persistToMemory(unique);
    return {
      mode: "supabase",
      attempted: snapshots.length,
      stored: unique.length,
      skipped: Math.max(0, snapshots.length - unique.length),
    };
  } catch (error) {
    const fallback = persistToMemory(unique);
    const store = getStore();
    store.lastError = error instanceof Error ? error.message : "Supabase write failed";
    return { ...fallback, mode: "memory", error: store.lastError };
  }
}

export async function persistMarketRows(
  rows: Array<MarketIntegrityRow & { memory?: { lastSnapshot?: MarketRiskSnapshot } }>,
): Promise<LedgerWriteResult> {
  return persistRiskSnapshots(rowsToSnapshots(rows));
}

export async function persistRiskSnapshots(snapshots: MarketRiskSnapshot[]): Promise<LedgerWriteResult> {
  if (!snapshots.length) return { mode: getSupabaseConfig() ? "supabase" : "memory", attempted: 0, stored: 0, skipped: 0 };
  return persistToSupabase(snapshots);
}

export async function getPersistentRiskHistory(id: string, limit = getPass423RetentionPolicy().analysisWindowSnapshots): Promise<MarketRiskSnapshot[]> {
  const clean = id.trim();
  if (!clean) return [];
  const config = getSupabaseConfig();

  if (config) {
    try {
      const params = new URLSearchParams({
        asset_id: `eq.${clean}`,
        order: "observed_at.desc",
        limit: String(Math.min(Math.max(limit, 1), getPass423RetentionPolicy().maxSnapshotsPerAsset)),
      });
      const response = await fetch(`${config.url}/rest/v1/market_integrity_snapshots?${params.toString()}`, {
        headers: {
          apikey: config.key,
          authorization: `Bearer ${config.key}`,
          accept: "application/json",
        },
        next: { revalidate: 20 },
      } as RequestInit & { next: { revalidate: number } });
      if (response.ok) {
        const rows = (await response.json()) as Array<{
          raw_snapshot?: MarketRiskSnapshot | null;
          asset_id: string;
          symbol: string;
          name: string;
          observed_at: string;
          price?: number | null;
          market_cap?: number | null;
          volume_24h?: number | null;
          risk_score: number;
          risk_level: MarketRiskSnapshot["level"];
          signal_count?: number | null;
          dominant_agent?: string | null;
          confidence?: number | null;
        }>;
        return pass423SelectAnalysisWindow(rows.map((row) => row.raw_snapshot ?? {
          id: row.asset_id,
          symbol: row.symbol,
          name: row.name,
          timestamp: row.observed_at,
          price: row.price ?? undefined,
          marketCap: row.market_cap ?? undefined,
          volume24h: row.volume_24h ?? undefined,
          score: row.risk_score,
          level: row.risk_level,
          signalCount: row.signal_count ?? 0,
          dominantAgent: row.dominant_agent ?? undefined,
          confidence: row.confidence ?? undefined,
        }), getPass423RetentionPolicy()).sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
      }
    } catch {
      // Fall back to memory below.
    }
  }

  const store = getStore();
  return pass423SelectAnalysisWindow((store.snapshots.get(clean) ?? []).slice(-limit), getPass423RetentionPolicy());
}

export async function getRiskLedgerStatus() {
  const store = getStore();
  const histories = Array.from(store.snapshots.values());
  const allSnapshots = histories.flat();
  const latest = histories
    .map((history) => history.at(-1))
    .filter((item): item is MarketRiskSnapshot => Boolean(item))
    .sort((a, b) => b.score - a.score)[0];

  return {
    mode: getSupabaseConfig() ? "supabase" as const : "memory" as const,
    pass423Retention: getPass423RetentionPolicy(),
    longTermStorage: getSupabaseConfig() ? "durable_years_ready" as const : "runtime_mirror_only" as const,
    lastPersistAt: store.lastPersistAt,
    lastError: store.lastError,
    trackedAssets: histories.length,
    storedSnapshots: allSnapshots.length,
    highestStoredRisk: latest,
  };
}
