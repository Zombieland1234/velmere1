import type { UniversalAssetClass } from "@/lib/market-integrity/universal-asset-market-matrix";

export type RealMarketSearchResult = {
  id: string;
  symbol: string;
  name: string;
  assetClass: UniversalAssetClass;
  exchange: string;
  country: string;
  currency: string;
  provider: "velmere_matrix" | "twelve_data";
  providerState: "curated_reference" | "catalog_live";
};

export type TwelveDataSymbolSearchItem = {
  symbol?: string;
  instrument_name?: string;
  exchange?: string;
  mic_code?: string;
  instrument_type?: string;
  country?: string;
  currency?: string;
};

export function resolveRealMarketAssetClass(
  instrumentType: string | undefined,
  symbol = "",
): UniversalAssetClass {
  const type = (instrumentType ?? "").toLowerCase();
  const cleanSymbol = symbol.toUpperCase();

  if (type.includes("digital") || type.includes("crypto")) return "crypto";
  if (type.includes("reit") || type.includes("real estate")) return "real_estate";
  if (type.includes("etf") || type.includes("fund")) return "etf";
  if (type.includes("commodity") || /^(XAU|XAG|WTI|BRENT)/.test(cleanSymbol)) {
    return "commodity";
  }
  if (
    type.includes("currency") ||
    type.includes("forex") ||
    /^[A-Z]{3}\/[A-Z]{3}$/.test(cleanSymbol)
  ) {
    return "fx";
  }
  return "stock";
}

export function normalizeTwelveDataSearchItem(
  item: TwelveDataSymbolSearchItem,
): RealMarketSearchResult | null {
  const symbol = (item.symbol ?? "").trim().toUpperCase();
  const name = (item.instrument_name ?? "").trim();
  if (!symbol || !name) return null;

  const exchange = (item.exchange ?? item.mic_code ?? "Global market").trim();
  return {
    id: `twelve-data:${exchange}:${symbol}`.toLowerCase().replace(/\s+/g, "-"),
    symbol,
    name,
    assetClass: resolveRealMarketAssetClass(item.instrument_type, symbol),
    exchange,
    country: (item.country ?? "Global").trim(),
    currency: (item.currency ?? "").trim().toUpperCase(),
    provider: "twelve_data",
    providerState: "catalog_live",
  };
}
