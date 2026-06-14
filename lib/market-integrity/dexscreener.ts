import { analyzeTokenRisk } from "./risk-engine";
import { fetchGoPlusTokenSecurity } from "./goplus";
import type { TokenRiskInput, TokenRiskResult } from "./risk-types";

type DexPair = {
  chainId?: string;
  dexId?: string;
  url?: string;
  pairAddress?: string;
  baseToken?: { address?: string; name?: string; symbol?: string };
  quoteToken?: { address?: string; name?: string; symbol?: string };
  priceUsd?: string;
  txns?: { h24?: { buys?: number; sells?: number } };
  volume?: { h24?: number; h6?: number; h1?: number };
  priceChange?: { h1?: number; h6?: number; h24?: number };
  liquidity?: { usd?: number; base?: number; quote?: number };
  fdv?: number;
  marketCap?: number;
  info?: { imageUrl?: string; header?: string; websites?: Array<{ url?: string }>; socials?: Array<{ type?: string; url?: string }> };
};

type DexSearchResponse = { schemaVersion?: string; pairs?: DexPair[] };

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function normalizeQuery(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 120);
}

function pairToRiskInput(pair: DexPair, security: Partial<TokenRiskInput> = {}): TokenRiskInput {
  const token = pair.baseToken ?? {};
  return {
    symbol: token.symbol?.toUpperCase() ?? "UNKNOWN",
    name: token.name ?? token.symbol ?? "Unresolved token",
    image: pair.info?.imageUrl,
    chainId: pair.chainId,
    tokenAddress: token.address,
    pairAddress: pair.pairAddress,
    dexId: pair.dexId,
    url: pair.url,
    currentPrice: toNumber(pair.priceUsd),
    marketCap: toNumber(pair.marketCap),
    fdv: toNumber(pair.fdv),
    liquidityUsd: toNumber(pair.liquidity?.usd),
    volume24h: toNumber(pair.volume?.h24),
    priceChange1h: toNumber(pair.priceChange?.h1),
    priceChange6h: toNumber(pair.priceChange?.h6),
    priceChange24h: toNumber(pair.priceChange?.h24),
    buys24h: toNumber(pair.txns?.h24?.buys),
    sells24h: toNumber(pair.txns?.h24?.sells),
    ...security,
    dataSources: Array.from(new Set(["DEX Screener", ...(security.dataSources ?? [])])),
  };
}

export async function analyzeDexScreenerToken(query: string): Promise<TokenRiskResult> {
  const normalized = normalizeQuery(query);
  if (!normalized) throw new Error("Missing token query");

  const response = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(normalized)}`, {
    headers: { accept: "application/json" },
    next: { revalidate: 60 },
  } as RequestInit & { next: { revalidate: number } });

  if (!response.ok) throw new Error(`DEX Screener request failed with status ${response.status}`);
  const data = (await response.json()) as DexSearchResponse;
  const pairs = (data.pairs ?? [])
    .filter((pair) => pair.baseToken?.symbol || pair.baseToken?.name)
    .sort((a, b) => (toNumber(b.liquidity?.usd) ?? 0) - (toNumber(a.liquidity?.usd) ?? 0));
  const bestPair = pairs[0];
  if (!bestPair) throw new Error("No DEX pairs found for this query");

  const security = await fetchGoPlusTokenSecurity(bestPair.chainId, bestPair.baseToken?.address).catch(() => ({}));
  return analyzeTokenRisk(pairToRiskInput(bestPair, security), "live");
}
