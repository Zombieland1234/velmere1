import type { UniversalAssetRow } from "./universal-asset-market-matrix";

function row(input: Partial<UniversalAssetRow> & Pick<UniversalAssetRow, "id" | "rank" | "symbol" | "name" | "assetClass" | "riskPressure" | "sparkTone">): UniversalAssetRow {
  const kind = input.assetClass === "fx" ? "FX" : input.assetClass === "commodity" ? "commodity" : input.assetClass === "real_estate" ? "real estate" : input.assetClass === "etf" ? "ETF" : "equity";
  return {
    sourceRhythm: input.sourceRhythm ?? `${kind} provider timestamp + second-source freshness`,
    priceLane: input.priceLane ?? `${kind} OHLC candle lane`,
    volumeLane: input.volumeLane ?? `${kind} volume / volatility lane`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${kind} issuer/provider disclosure lane`,
    secondSourceLane: input.secondSourceLane ?? "second-source confirmation before premium AI copy",
    confidenceFloor: input.confidenceFloor ?? 50,
    adapterState: input.adapterState ?? "provider_required",
    humanCopy: input.humanCopy ?? `${input.symbol} ma wejść do Real Markets jak karta Shield: logo, cena, świece, źródło, ryzyko i Basic / Pro / Advanced bez ściany tekstu.`,
    nextAdapterStep: input.nextAdapterStep ?? "Wire provider timestamp, cache age, fallback flag and second-source divergence before calling it live.",
    ...input,
  };
}

export const pass372RealMarketInstitutionalSpine: UniversalAssetRow[] = [
  // more US / global equities
  row({ id: "pass372-uber", rank: 148, symbol: "UBER", name: "Uber", assetClass: "stock", riskPressure: 41, sparkTone: "watch" }),
  row({ id: "pass372-shop", rank: 149, symbol: "SHOP", name: "Shopify", assetClass: "stock", riskPressure: 46, sparkTone: "watch" }),
  row({ id: "pass372-sony", rank: 150, symbol: "SONY", name: "Sony", assetClass: "stock", riskPressure: 33, sparkTone: "flat" }),
  row({ id: "pass372-tm", rank: 151, symbol: "TM", name: "Toyota", assetClass: "stock", riskPressure: 31, sparkTone: "flat" }),
  row({ id: "pass372-bhp", rank: 152, symbol: "BHP", name: "BHP Group", assetClass: "stock", riskPressure: 38, sparkTone: "flat", proofOrDisclosureLane: "issuer disclosure + commodity exposure" }),
  row({ id: "pass372-rio", rank: 153, symbol: "RIO", name: "Rio Tinto", assetClass: "stock", riskPressure: 39, sparkTone: "flat", proofOrDisclosureLane: "issuer disclosure + commodity exposure" }),
  row({ id: "pass372-lly", rank: 154, symbol: "LLY", name: "Eli Lilly", assetClass: "stock", riskPressure: 34, sparkTone: "flat" }),
  row({ id: "pass372-unh", rank: 155, symbol: "UNH", name: "UnitedHealth", assetClass: "stock", riskPressure: 37, sparkTone: "watch" }),
  row({ id: "pass372-nesn", rank: 156, symbol: "NESN", name: "Nestle", assetClass: "stock", riskPressure: 27, sparkTone: "flat", proofOrDisclosureLane: "EU issuer disclosure + consumer defensive basket" }),
  row({ id: "pass372-novo", rank: 157, symbol: "NOVO", name: "Novo Nordisk", assetClass: "stock", riskPressure: 35, sparkTone: "flat" }),

  // FX extension
  row({ id: "pass372-eurjpy", rank: 214, symbol: "EUR/JPY", name: "Euro / Yen", assetClass: "fx", riskPressure: 39, sparkTone: "watch", adapterState: "daily_reference" }),
  row({ id: "pass372-usdcad", rank: 215, symbol: "USD/CAD", name: "Dollar / Canadian Dollar", assetClass: "fx", riskPressure: 34, sparkTone: "flat", adapterState: "daily_reference" }),
  row({ id: "pass372-nzdusd", rank: 216, symbol: "NZD/USD", name: "New Zealand Dollar / Dollar", assetClass: "fx", riskPressure: 36, sparkTone: "flat", adapterState: "daily_reference" }),
  row({ id: "pass372-eurnok", rank: 217, symbol: "EUR/NOK", name: "Euro / Norwegian Krone", assetClass: "fx", riskPressure: 37, sparkTone: "flat", adapterState: "daily_reference" }),
  row({ id: "pass372-eursek", rank: 218, symbol: "EUR/SEK", name: "Euro / Swedish Krona", assetClass: "fx", riskPressure: 35, sparkTone: "flat", adapterState: "daily_reference" }),
  row({ id: "pass372-cadpln", rank: 219, symbol: "CAD/PLN", name: "Canadian Dollar / Polish Zloty", assetClass: "fx", riskPressure: 35, sparkTone: "flat", adapterState: "daily_reference" }),
  row({ id: "pass372-nokpln", rank: 220, symbol: "NOK/PLN", name: "Norwegian Krone / Polish Zloty", assetClass: "fx", riskPressure: 36, sparkTone: "flat", adapterState: "daily_reference" }),
  row({ id: "pass372-sekpln", rank: 221, symbol: "SEK/PLN", name: "Swedish Krona / Polish Zloty", assetClass: "fx", riskPressure: 35, sparkTone: "flat", adapterState: "daily_reference" }),

  // ETF and sector proxy extension
  row({ id: "pass372-xlk", rank: 311, symbol: "XLK", name: "Technology Select Sector", assetClass: "etf", riskPressure: 39, sparkTone: "watch" }),
  row({ id: "pass372-xlf", rank: 312, symbol: "XLF", name: "Financials Select Sector", assetClass: "etf", riskPressure: 37, sparkTone: "flat" }),
  row({ id: "pass372-xle", rank: 313, symbol: "XLE", name: "Energy Select Sector", assetClass: "etf", riskPressure: 42, sparkTone: "watch" }),
  row({ id: "pass372-efa", rank: 314, symbol: "EFA", name: "Developed Markets ETF", assetClass: "etf", riskPressure: 36, sparkTone: "flat" }),
  row({ id: "pass372-fez", rank: 315, symbol: "FEZ", name: "Euro Stoxx 50 ETF", assetClass: "etf", riskPressure: 37, sparkTone: "flat" }),
  row({ id: "pass372-ewj", rank: 316, symbol: "EWJ", name: "Japan ETF", assetClass: "etf", riskPressure: 36, sparkTone: "flat" }),
  row({ id: "pass372-ewu", rank: 317, symbol: "EWU", name: "United Kingdom ETF", assetClass: "etf", riskPressure: 36, sparkTone: "flat" }),

  // commodities / real assets extension
  row({ id: "pass372-corn", rank: 411, symbol: "CORN", name: "Corn", assetClass: "commodity", riskPressure: 41, sparkTone: "watch" }),
  row({ id: "pass372-soybean", rank: 412, symbol: "SOYBEAN", name: "Soybean", assetClass: "commodity", riskPressure: 40, sparkTone: "watch" }),
  row({ id: "pass372-sugar", rank: 413, symbol: "SUGAR", name: "Sugar", assetClass: "commodity", riskPressure: 43, sparkTone: "watch" }),
  row({ id: "pass372-cotton", rank: 414, symbol: "COTTON", name: "Cotton", assetClass: "commodity", riskPressure: 39, sparkTone: "flat" }),
  row({ id: "pass372-palladium", rank: 415, symbol: "PALLADIUM", name: "Palladium", assetClass: "commodity", riskPressure: 46, sparkTone: "watch" }),

  row({ id: "pass372-rwo", rank: 506, symbol: "RWO", name: "Global Real Estate ETF", assetClass: "real_estate", riskPressure: 41, sparkTone: "watch", adapterState: "slow_macro" }),
  row({ id: "pass372-vnqi", rank: 507, symbol: "VNQI", name: "Global ex-US Real Estate", assetClass: "real_estate", riskPressure: 42, sparkTone: "watch", adapterState: "slow_macro" }),
  row({ id: "pass372-xhb", rank: 508, symbol: "XHB", name: "US Homebuilders ETF", assetClass: "real_estate", riskPressure: 44, sparkTone: "watch", adapterState: "slow_macro" }),
  row({ id: "pass372-itb", rank: 509, symbol: "ITB", name: "US Home Construction ETF", assetClass: "real_estate", riskPressure: 44, sparkTone: "watch", adapterState: "slow_macro" }),
];

export const pass372CoverageUpgrade = {
  version: "PASS372.real_market_institutional_spine",
  promiseBoundary: "Broad searchable registry is not the same as live coverage. Live confidence unlocks only with provider timestamp, cache age, fallback flag and second-source divergence.",
  visualRule: "Every instrument must render like Shield: logo/fallback, row chart, full modal chart, Basic/Pro/Advanced and a human AI brief.",
  providerLanes: ["equity OHLC + issuer disclosure", "intraday FX + reference fallback", "commodity spot/futures method", "ETF holdings cadence", "real-estate proxy + slow macro", "exchange websocket freshness"],
};

export function buildPass372RealMarketInstitutionalSpine() {
  return pass372RealMarketInstitutionalSpine;
}
