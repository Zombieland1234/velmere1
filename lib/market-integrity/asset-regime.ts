import type { TokenRiskResult } from "./risk-types";

export type TokenAssetRegimeId =
  | "stable_or_pegged"
  | "commodity_backed"
  | "major_asset"
  | "alt_market"
  | "unknown_asset";

export type TokenAssetRegimeRail = {
  id: "asset" | "proof" | "gate" | "focus";
  label: string;
  value: string;
  tone: "gold" | "cyan" | "amber" | "neutral";
};

export type TokenAssetRegime = {
  version: "velmere_asset_regime_v1_pass269";
  id: TokenAssetRegimeId;
  displayName: string;
  proofBadge: string;
  reviewFocus: string;
  exportGate: string;
  rails: TokenAssetRegimeRail[];
  missingProof: string[];
};

const STABLE_SYMBOLS = new Set([
  "USDT",
  "USDC",
  "DAI",
  "BUSD",
  "FDUSD",
  "TUSD",
  "USDE",
  "USDS",
  "PYUSD",
  "FRAX",
  "USDD",
  "GUSD",
  "LUSD",
]);

const COMMODITY_SYMBOLS = new Set(["XAUT", "PAXG", "DGX", "CACHE", "GLD"]);
const MAJOR_SYMBOLS = new Set(["BTC", "WBTC", "ETH", "WETH", "BNB", "SOL", "XRP"]);

function normalize(value?: string) {
  return (value ?? "").trim().toUpperCase();
}

function includesAny(text: string, fragments: string[]) {
  return fragments.some((fragment) => text.includes(fragment));
}

function compactName(symbol: string, name: string) {
  if (symbol && name) return `${symbol} · ${name}`;
  return symbol || name || "unresolved asset";
}

export function buildTokenAssetRegime(result: TokenRiskResult): TokenAssetRegime {
  const symbol = normalize(result.token.symbol);
  const name = result.token.name ?? "";
  const text = `${symbol} ${name} ${result.token.marketId ?? ""}`.toUpperCase();

  const isCommodity = COMMODITY_SYMBOLS.has(symbol) || includesAny(text, ["TETHER GOLD", "PAX GOLD", "GOLD", "COMMODITY"]);
  const isStable = !isCommodity && (STABLE_SYMBOLS.has(symbol) || includesAny(text, ["STABLE", "USD COIN", "DOLLAR", "PEGGED"]));
  const isMajor = !isCommodity && !isStable && MAJOR_SYMBOLS.has(symbol);

  if (isCommodity) {
    return {
      version: "velmere_asset_regime_v1_pass269",
      id: "commodity_backed",
      displayName: compactName(symbol, "commodity-backed token"),
      proofBadge: "custody proof required",
      reviewFocus: "reserve custody, redemption terms, issuer source, spread/depth",
      exportGate: "reserve + redemption gate",
      missingProof: ["custody attestation", "redemption policy", "issuer source", "market-depth pair"],
      rails: [
        { id: "asset", label: "asset", value: "commodity", tone: "gold" },
        { id: "proof", label: "proof", value: "custody", tone: "amber" },
        { id: "gate", label: "gate", value: "reserve", tone: "cyan" },
        { id: "focus", label: "focus", value: "spread", tone: "neutral" },
      ],
    };
  }

  if (isStable) {
    return {
      version: "velmere_asset_regime_v1_pass269",
      id: "stable_or_pegged",
      displayName: compactName(symbol, "stable / pegged asset"),
      proofBadge: "peg proof required",
      reviewFocus: "peg deviation, reserve source, redemption path, issuer transparency",
      exportGate: "reserve + depeg gate",
      missingProof: ["reserve attestation", "depeg monitor", "redemption path", "issuer disclosure"],
      rails: [
        { id: "asset", label: "asset", value: "peg", tone: "cyan" },
        { id: "proof", label: "proof", value: "reserve", tone: "amber" },
        { id: "gate", label: "gate", value: "depeg", tone: "gold" },
        { id: "focus", label: "focus", value: "issuer", tone: "neutral" },
      ],
    };
  }

  if (isMajor) {
    return {
      version: "velmere_asset_regime_v1_pass269",
      id: "major_asset",
      displayName: compactName(symbol, "major market asset"),
      proofBadge: "depth proof required",
      reviewFocus: "market depth, exchange flow, volatility regime, holder/liquidity pressure",
      exportGate: "depth + volatility gate",
      missingProof: ["orderbook depth", "exchange flow", "volatility regime"],
      rails: [
        { id: "asset", label: "asset", value: "major", tone: "gold" },
        { id: "proof", label: "proof", value: "depth", tone: "cyan" },
        { id: "gate", label: "gate", value: "volatility", tone: "amber" },
        { id: "focus", label: "focus", value: "flow", tone: "neutral" },
      ],
    };
  }

  const hasContract = Boolean(result.token.tokenAddress || result.token.pairAddress || result.token.chainId);
  return {
    version: "velmere_asset_regime_v1_pass269",
    id: hasContract ? "alt_market" : "unknown_asset",
    displayName: compactName(symbol, hasContract ? "token market" : "unresolved market asset"),
    proofBadge: hasContract ? "contract proof required" : "source proof required",
    reviewFocus: hasContract
      ? "contract control, holders, liquidity, unlocks, OSINT trail"
      : "identity source, liquidity source, holder data, market pair mapping",
    exportGate: hasContract ? "contract + liquidity gate" : "identity + source gate",
    missingProof: hasContract
      ? ["contract privileges", "holder distribution", "liquidity lock", "unlock schedule"]
      : ["market identity", "pair mapping", "source freshness", "holder source"],
    rails: [
      { id: "asset", label: "asset", value: hasContract ? "token" : "unresolved", tone: "neutral" },
      { id: "proof", label: "proof", value: hasContract ? "contract" : "source", tone: "amber" },
      { id: "gate", label: "gate", value: hasContract ? "liquidity" : "identity", tone: "cyan" },
      { id: "focus", label: "focus", value: hasContract ? "holders" : "mapping", tone: "gold" },
    ],
  };
}
