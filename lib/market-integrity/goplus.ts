import type { TokenRiskInput } from "./risk-types";

const GO_PLUS_CHAIN_BY_DEX: Record<string, string> = {
  ethereum: "1",
  bsc: "56",
  polygon: "137",
  arbitrum: "42161",
  optimism: "10",
  base: "8453",
  avalanche: "43114",
  linea: "59144",
  scroll: "534352",
  mantle: "5000",
  opbnb: "204",
};

type GoPlusTokenPayload = Record<string, unknown>;

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function toBool(value: unknown): boolean | undefined {
  if (value === true || value === "1" || value === 1 || value === "true") return true;
  if (value === false || value === "0" || value === 0 || value === "false") return false;
  return undefined;
}

export function mapDexChainToGoPlus(chainId?: string) {
  if (!chainId) return undefined;
  return GO_PLUS_CHAIN_BY_DEX[chainId.toLowerCase()];
}

export async function fetchGoPlusTokenSecurity(chainId: string | undefined, tokenAddress: string | undefined): Promise<Partial<TokenRiskInput>> {
  const goPlusChainId = mapDexChainToGoPlus(chainId);
  if (!goPlusChainId || !tokenAddress) return {};

  const params = new URLSearchParams({ contract_addresses: tokenAddress });
  const response = await fetch(`https://api.gopluslabs.io/api/v1/token_security/${goPlusChainId}?${params.toString()}`, {
    headers: { accept: "application/json" },
    next: { revalidate: 300 },
  } as RequestInit & { next: { revalidate: number } });

  if (!response.ok) return {};
  const data = (await response.json()) as { result?: Record<string, GoPlusTokenPayload> };
  const payload = data.result?.[tokenAddress.toLowerCase()] ?? data.result?.[tokenAddress] ?? Object.values(data.result ?? {})[0];
  if (!payload) return {};

  const buyTax = toNumber(payload.buy_tax);
  const sellTax = toNumber(payload.sell_tax);
  const holderCount = toNumber(payload.holder_count);
  const holders = Array.isArray(payload.holders) ? payload.holders : [];
  const top10 = holders.slice(0, 10).reduce((sum, holder) => {
    if (holder && typeof holder === "object") {
      const pct = toNumber((holder as Record<string, unknown>).percent);
      return sum + (pct ?? 0);
    }
    return sum;
  }, 0);

  return {
    buyTaxPercentage: buyTax !== undefined ? buyTax * 100 : undefined,
    sellTaxPercentage: sellTax !== undefined ? sellTax * 100 : undefined,
    isHoneypot: toBool(payload.is_honeypot),
    canMintNewTokens: toBool(payload.is_mintable),
    canBlacklist: toBool(payload.is_blacklisted) || toBool(payload.is_whitelisted),
    canPauseTrading: toBool(payload.trading_cooldown),
    holderCount,
    top10HolderPercent: top10 > 0 ? top10 * 100 : undefined,
    suspiciousContractPrivileges: toBool(payload.is_proxy) || toBool(payload.external_call),
    dataSources: ["DEX Screener", "GoPlus Token Security"],
  };
}
