import type { TokenRiskResult } from "./risk-types";

export type WhaleHolder = {
  address: string;
  balance?: number;
  percentage: number;
  role: "team" | "investor" | "whale" | "liquidity" | "exchange" | "unknown";
  label?: string;
};

export type WhaleConcentration = {
  top10Pct: number;
  top20Pct: number;
  giniCoefficient: number;
  holderCount: number;
};

export type WhaleUnlockEvent = {
  date: string;
  amount: number;
  role: string;
  source: "on-chain" | "tokenomics-db" | "estimated";
};

export type WhaleSellPressure = {
  estimatedSellVolume: number;
  buyVolumeRatio: number;
  netPressure: "high" | "medium" | "low";
  source: "on-chain" | "derived" | "estimated";
};

export type WhaleCluster = {
  label: string;
  addresses: number;
  totalPct: number;
  confidence: "high" | "medium" | "low";
};

export type WhaleWatchData = {
  topHolders: WhaleHolder[];
  concentration: WhaleConcentration;
  unlockSchedule: WhaleUnlockEvent[];
  sellPressure: WhaleSellPressure;
  clusters: WhaleCluster[];
  dataSources: string[];
  dataCompleteness: number;
  warnings: string[];
};

export type WhaleWatchProviderInput = {
  tokenRiskResult: TokenRiskResult;
  symbol: string;
  chainId?: string;
  contractAddress?: string;
};

type EtherscanTokenHolder = {
  TokenHolderAddress: string;
  TokenHolderQuantity: string;
  TokenHolderPercentage: string;
};

type EtherscanResponse = {
  result?: EtherscanTokenHolder[];
  message?: string;
  status?: string;
};

function estimateGini(holders: { percentage: number }[]): number {
  if (holders.length === 0) return 0;
  const sorted = holders.map((h) => h.percentage).sort((a, b) => a - b);
  const n = sorted.length;
  let sumDiff = 0;
  let sumValues = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      sumDiff += Math.abs(sorted[i] - sorted[j]);
    }
    sumValues += sorted[i];
  }
  if (sumValues === 0) return 0;
  return Math.min(1, sumDiff / (2 * n * sumValues));
}

function classifyHolderRole(percentage: number, label?: string): WhaleHolder["role"] {
  const lower = (label ?? "").toLowerCase();
  if (lower.includes("exchange") || lower.includes("binance") || lower.includes("coinbase") || lower.includes("okx")) return "exchange";
  if (lower.includes("team") || lower.includes("treasury") || lower.includes("foundation")) return "team";
  if (lower.includes("investor") || lower.includes("vc") || lower.includes("fund")) return "investor";
  if (lower.includes("liquidity") || lower.includes("lp")) return "liquidity";
  if (percentage >= 1) return "whale";
  return "unknown";
}

function deriveSellPressure(
  buyVolume24h: number,
  sellVolume24h: number,
): WhaleSellPressure {
  const total = buyVolume24h + sellVolume24h;
  if (total === 0) {
    return { estimatedSellVolume: 0, buyVolumeRatio: 1, netPressure: "low", source: "derived" };
  }
  const buyRatio = buyVolume24h / total;
  const estimatedSell = sellVolume24h;
  const netPressure: WhaleSellPressure["netPressure"] =
    buyRatio < 0.35 ? "high" : buyRatio < 0.5 ? "medium" : "low";
  return {
    estimatedSellVolume: Math.round(estimatedSell),
    buyVolumeRatio: Math.round(buyRatio * 100) / 100,
    netPressure,
    source: "derived",
  };
}

function deriveClustersFromGoPlus(
  holders: { percent?: number; is_contract?: number }[],
): WhaleCluster[] {
  const clusters: WhaleCluster[] = [];
  let contractPct = 0;
  let unknownPct = 0;
  let contractCount = 0;

  for (const h of holders) {
    const pct = h.percent ?? 0;
    if (h.is_contract === 1) {
      contractPct += pct;
      contractCount++;
    } else {
      unknownPct += pct;
    }
  }

  if (contractCount > 0) {
    clusters.push({ label: "Exchange/contract wallets", addresses: contractCount, totalPct: Math.round(contractPct * 100) / 100, confidence: "medium" });
  }
  if (unknownPct > 0) {
    clusters.push({ label: "Individual wallets", addresses: holders.length - contractCount, totalPct: Math.round(unknownPct * 100) / 100, confidence: "low" });
  }

  return clusters;
}

async function fetchEtherscanTopHolders(
  contractAddress: string,
  chainId: string,
): Promise<{ holders: WhaleHolder[]; source: string } | null> {
  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey || apiKey.length < 6) return null;

  const etherscanChainMap: Record<string, string> = {
    ethereum: "api.etherscan.io",
    bsc: "api.bscscan.com",
    polygon: "api.polygonscan.com",
    arbitrum: "api.arbiscan.io",
    optimism: "api-optimistic.etherscan.io",
    base: "api.basescan.org",
  };

  const host = etherscanChainMap[chainId];
  if (!host) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const url = `https://${host}/api?module=token&action=tokenholderlist&contractaddress=${contractAddress}&page=1&offset=50&apikey=${apiKey}`;
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    const data = (await response.json()) as EtherscanResponse;
    if (data.status !== "1" || !Array.isArray(data.result)) return null;

    const holders: WhaleHolder[] = data.result.map((h) => ({
      address: h.TokenHolderAddress,
      percentage: parseFloat(h.TokenHolderPercentage) || 0,
      role: classifyHolderRole(parseFloat(h.TokenHolderPercentage) || 0),
    }));

    return { holders, source: "Etherscan" };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchWhaleWatchData(input: WhaleWatchProviderInput): Promise<WhaleWatchData> {
  const { tokenRiskResult, symbol } = input;
  const warnings: string[] = [];
  const dataSources: string[] = ["GoPlus Token Security"];
  let completeness = 0;

  let holderCount = tokenRiskResult.metrics.holderCount ?? 0;
  let top10Pct = tokenRiskResult.metrics.top10HolderPercent ?? 0;
  let chainId = tokenRiskResult.token.chainId;
  let contractAddress = tokenRiskResult.token.tokenAddress;
  // If CoinGecko didn't provide holder data, try DexScreener for contract address + GoPlus
  if (!holderCount && !top10Pct && symbol) {
    try {
      const { analyzeDexScreenerToken } = await import("./dexscreener");
      const dexResult = await analyzeDexScreenerToken(symbol);
      holderCount = dexResult.metrics.holderCount ?? holderCount;
      top10Pct = dexResult.metrics.top10HolderPercent ?? top10Pct;
      chainId = dexResult.token.chainId ?? chainId;
      contractAddress = dexResult.token.tokenAddress ?? contractAddress;
      if (holderCount || top10Pct) {
        dataSources.push("DexScreener + GoPlus");
      }
    } catch {
      warnings.push("DexScreener fallback lookup failed");
    }
  }

  // Try Etherscan for individual holder details
  let topHolders: WhaleHolder[] = [];
  if (contractAddress && chainId) {
    const etherscanData = await fetchEtherscanTopHolders(contractAddress, chainId);
    if (etherscanData) {
      topHolders = etherscanData.holders;
      dataSources.push(etherscanData.source);
      completeness += 40;
    } else {
      warnings.push("Etherscan holder data unavailable — using aggregated metrics only");
    }
  } else {
    warnings.push("No contract address — individual holder details unavailable");
  }

  // If no Etherscan data, create representative holders from GoPlus aggregated data
  if (topHolders.length === 0 && top10Pct > 0) {
    const estimatedPerHolder = top10Pct / 10;
    topHolders = Array.from({ length: Math.min(10, Math.max(3, Math.floor(holderCount * 0.01))) }, (_, i) => ({
      address: `0x${String(i + 1).padStart(40, "0")}`,
      percentage: Math.max(0.1, estimatedPerHolder * (1 - i * 0.2)),
      role: classifyHolderRole(estimatedPerHolder * (1 - i * 0.2)),
      label: i === 0 ? "Largest holder (aggregated)" : undefined,
    }));
    warnings.push("Holder addresses are estimated from aggregated GoPlus data");
    completeness += 15;
  } else if (topHolders.length > 0) {
    completeness += 25;
  } else {
    warnings.push("No holder data available — token may be a native coin (not ERC-20) or provider returned no data");
  }

  // Concentration
  const gini = estimateGini(topHolders.length > 0 ? topHolders : [{ percentage: top10Pct / 10 }]);
  const concentration: WhaleConcentration = {
    top10Pct: Math.round(top10Pct * 100) / 100,
    top20Pct: Math.round(Math.min(100, top10Pct * 1.4) * 100) / 100,
    giniCoefficient: Math.round(gini * 1000) / 1000,
    holderCount,
  };
  completeness += 15;

  // Sell pressure from DexScreener metrics (derived from volume buy/sell counts)
  const buySellImbalance = tokenRiskResult.metrics.buySellImbalancePercent ?? 0;
  const volume24h = tokenRiskResult.metrics.volume24h ?? 0;
  const estimatedBuyVol = volume24h * (1 + buySellImbalance / 100) / 2;
  const estimatedSellVol = volume24h - estimatedBuyVol;
  const sellPressure = deriveSellPressure(Math.max(0, estimatedBuyVol), Math.max(0, estimatedSellVol));
  completeness += 10;

  // Clusters from GoPlus
  const clusters = deriveClustersFromGoPlus(
    topHolders.map((h) => ({ percent: h.percentage, is_contract: h.address.startsWith("0x") && !h.label ? 1 : 0 })),
  );
  completeness += 10;

  // Unlock schedule — requires external tokenomics data source
  const unlockSchedule: WhaleUnlockEvent[] = [];
  warnings.push("Unlock/vesting schedule requires tokenomics data source (not yet implemented)");
  completeness += 0;

  return {
    topHolders: topHolders.slice(0, 20),
    concentration,
    unlockSchedule,
    sellPressure,
    clusters,
    dataSources,
    dataCompleteness: Math.min(100, completeness),
    warnings,
  };
}
