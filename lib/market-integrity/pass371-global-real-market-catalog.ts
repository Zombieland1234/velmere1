import type { UniversalAssetRow } from "./universal-asset-market-matrix";

export type Pass371ProviderKind = "equity" | "fx" | "etf" | "commodity" | "real_estate" | "exchange";

function row(input: Partial<UniversalAssetRow> & Pick<UniversalAssetRow, "id" | "rank" | "symbol" | "name" | "assetClass" | "riskPressure" | "sparkTone">): UniversalAssetRow {
  const classLabel = input.assetClass === "fx" ? "FX" : input.assetClass === "commodity" ? "commodity" : input.assetClass === "real_estate" ? "real estate" : input.assetClass === "etf" ? "ETF" : "equity";
  return {
    sourceRhythm: input.sourceRhythm ?? `${classLabel} provider + second source`,
    priceLane: input.priceLane ?? `${classLabel} OHLC candles after provider`,
    volumeLane: input.volumeLane ?? `${classLabel} volume / volatility context`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${classLabel} provider timestamp + disclosure method`,
    secondSourceLane: input.secondSourceLane ?? "second-source confirmation before stronger AI copy",
    confidenceFloor: input.confidenceFloor ?? 50,
    adapterState: input.adapterState ?? "provider_required",
    humanCopy: input.humanCopy ?? `${input.symbol} ma zachowywać się jak wiersz Shield: logo, cena, wykres, source freshness, risk lane i Basic / Pro / Advanced bez długiej ściany tekstu.`,
    nextAdapterStep: input.nextAdapterStep ?? "Attach live provider, timestamp cache and second-source divergence before customer confidence.",
    ...input,
  };
}

export const pass371GlobalRealMarketCatalog: UniversalAssetRow[] = [
  // US mega / AI / infrastructure
  row({ id: "pass371-aapl", rank: 101, symbol: "AAPL", name: "Apple", assetClass: "stock", riskPressure: 28, sparkTone: "flat", proofOrDisclosureLane: "SEC company facts + earnings calendar", priceLane: "equity OHLC provider" }),
  row({ id: "pass371-nvda", rank: 102, symbol: "NVDA", name: "Nvidia", assetClass: "stock", riskPressure: 44, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + AI sector event lane", priceLane: "equity OHLC provider" }),
  row({ id: "pass371-msft", rank: 103, symbol: "MSFT", name: "Microsoft", assetClass: "stock", riskPressure: 29, sparkTone: "flat" }),
  row({ id: "pass371-googl", rank: 104, symbol: "GOOGL", name: "Alphabet", assetClass: "stock", riskPressure: 32, sparkTone: "flat" }),
  row({ id: "pass371-amzn", rank: 105, symbol: "AMZN", name: "Amazon", assetClass: "stock", riskPressure: 34, sparkTone: "flat" }),
  row({ id: "pass371-meta", rank: 106, symbol: "META", name: "Meta Platforms", assetClass: "stock", riskPressure: 38, sparkTone: "watch" }),
  row({ id: "pass371-tsla", rank: 107, symbol: "TSLA", name: "Tesla", assetClass: "stock", riskPressure: 52, sparkTone: "watch" }),
  row({ id: "pass371-amd", rank: 108, symbol: "AMD", name: "AMD", assetClass: "stock", riskPressure: 43, sparkTone: "watch" }),
  row({ id: "pass371-avgo", rank: 109, symbol: "AVGO", name: "Broadcom", assetClass: "stock", riskPressure: 39, sparkTone: "watch" }),
  row({ id: "pass371-asml", rank: 110, symbol: "ASML", name: "ASML Holding", assetClass: "stock", riskPressure: 36, sparkTone: "flat" }),
  row({ id: "pass371-tsm", rank: 111, symbol: "TSM", name: "Taiwan Semiconductor", assetClass: "stock", riskPressure: 40, sparkTone: "watch" }),
  row({ id: "pass371-orcl", rank: 112, symbol: "ORCL", name: "Oracle", assetClass: "stock", riskPressure: 33, sparkTone: "flat" }),
  row({ id: "pass371-pltr", rank: 113, symbol: "PLTR", name: "Palantir", assetClass: "stock", riskPressure: 50, sparkTone: "watch" }),
  row({ id: "pass371-arm", rank: 114, symbol: "ARM", name: "Arm Holdings", assetClass: "stock", riskPressure: 47, sparkTone: "watch" }),
  row({ id: "pass371-smci", rank: 115, symbol: "SMCI", name: "Super Micro Computer", assetClass: "stock", riskPressure: 58, sparkTone: "watch" }),

  // Europe / luxury / industrials
  row({ id: "pass371-mcpa", rank: 121, symbol: "MC.PA", name: "LVMH", assetClass: "stock", riskPressure: 31, sparkTone: "flat", proofOrDisclosureLane: "EU issuer disclosure + luxury sector basket" }),
  row({ id: "pass371-rms", rank: 122, symbol: "RMS.PA", name: "Hermes", assetClass: "stock", riskPressure: 29, sparkTone: "flat", proofOrDisclosureLane: "EU issuer disclosure + luxury sector basket" }),
  row({ id: "pass371-ker", rank: 123, symbol: "KER.PA", name: "Kering", assetClass: "stock", riskPressure: 42, sparkTone: "watch", proofOrDisclosureLane: "EU issuer disclosure + luxury sector basket" }),
  row({ id: "pass371-sap", rank: 124, symbol: "SAP", name: "SAP", assetClass: "stock", riskPressure: 30, sparkTone: "flat" }),
  row({ id: "pass371-sie", rank: 125, symbol: "SIE", name: "Siemens", assetClass: "stock", riskPressure: 31, sparkTone: "flat" }),
  row({ id: "pass371-air", rank: 126, symbol: "AIR", name: "Airbus", assetClass: "stock", riskPressure: 33, sparkTone: "flat" }),
  row({ id: "pass371-p911", rank: 127, symbol: "P911", name: "Porsche AG", assetClass: "stock", riskPressure: 36, sparkTone: "watch" }),
  row({ id: "pass371-race", rank: 128, symbol: "RACE", name: "Ferrari", assetClass: "stock", riskPressure: 30, sparkTone: "flat" }),
  row({ id: "pass371-dbk", rank: 129, symbol: "DBK", name: "Deutsche Bank", assetClass: "stock", riskPressure: 42, sparkTone: "watch" }),
  row({ id: "pass371-bnpa", rank: 130, symbol: "BNP.PA", name: "BNP Paribas", assetClass: "stock", riskPressure: 39, sparkTone: "watch" }),

  // Payments / banks / crypto equities
  row({ id: "pass371-coin", rank: 141, symbol: "COIN", name: "Coinbase Global", assetClass: "stock", riskPressure: 48, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + crypto venue exposure" }),
  row({ id: "pass371-mstr", rank: 142, symbol: "MSTR", name: "MicroStrategy", assetClass: "stock", riskPressure: 61, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + BTC treasury exposure" }),
  row({ id: "pass371-v", rank: 143, symbol: "V", name: "Visa", assetClass: "stock", riskPressure: 27, sparkTone: "flat" }),
  row({ id: "pass371-ma", rank: 144, symbol: "MA", name: "Mastercard", assetClass: "stock", riskPressure: 28, sparkTone: "flat" }),
  row({ id: "pass371-jpm", rank: 145, symbol: "JPM", name: "JPMorgan Chase", assetClass: "stock", riskPressure: 34, sparkTone: "flat", proofOrDisclosureLane: "SEC/bank disclosure + credit stress" }),
  row({ id: "pass371-gs", rank: 146, symbol: "GS", name: "Goldman Sachs", assetClass: "stock", riskPressure: 35, sparkTone: "flat" }),
  row({ id: "pass371-bac", rank: 147, symbol: "BAC", name: "Bank of America", assetClass: "stock", riskPressure: 36, sparkTone: "flat" }),

  // FX majors and PLN user context
  row({ id: "pass371-eurusd", rank: 201, symbol: "EUR/USD", name: "Euro / US Dollar", assetClass: "fx", riskPressure: 30, sparkTone: "flat", adapterState: "daily_reference", priceLane: "reference + intraday FX provider" }),
  row({ id: "pass371-usdpln", rank: 202, symbol: "USD/PLN", name: "Dollar / Polish Zloty", assetClass: "fx", riskPressure: 37, sparkTone: "watch", adapterState: "daily_reference" }),
  row({ id: "pass371-eurpln", rank: 203, symbol: "EUR/PLN", name: "Euro / Polish Zloty", assetClass: "fx", riskPressure: 31, sparkTone: "flat", adapterState: "daily_reference" }),
  row({ id: "pass371-chfpln", rank: 204, symbol: "CHF/PLN", name: "Swiss Franc / Polish Zloty", assetClass: "fx", riskPressure: 36, sparkTone: "flat", adapterState: "daily_reference" }),
  row({ id: "pass371-gbppln", rank: 205, symbol: "GBP/PLN", name: "Pound / Polish Zloty", assetClass: "fx", riskPressure: 37, sparkTone: "flat", adapterState: "daily_reference" }),
  row({ id: "pass371-usdjpy", rank: 206, symbol: "USD/JPY", name: "Dollar / Yen", assetClass: "fx", riskPressure: 41, sparkTone: "watch", adapterState: "daily_reference" }),
  row({ id: "pass371-gbpusd", rank: 207, symbol: "GBP/USD", name: "Pound / Dollar", assetClass: "fx", riskPressure: 33, sparkTone: "flat", adapterState: "daily_reference" }),
  row({ id: "pass371-audusd", rank: 208, symbol: "AUD/USD", name: "Australian Dollar / Dollar", assetClass: "fx", riskPressure: 35, sparkTone: "flat", adapterState: "daily_reference" }),
  row({ id: "pass371-usdchf", rank: 209, symbol: "USD/CHF", name: "Dollar / Swiss Franc", assetClass: "fx", riskPressure: 34, sparkTone: "flat", adapterState: "daily_reference" }),
  row({ id: "pass371-usdcnh", rank: 210, symbol: "USD/CNH", name: "Dollar / Offshore Yuan", assetClass: "fx", riskPressure: 44, sparkTone: "watch", adapterState: "daily_reference" }),
  row({ id: "pass371-eurgbp", rank: 211, symbol: "EUR/GBP", name: "Euro / Pound", assetClass: "fx", riskPressure: 32, sparkTone: "flat", adapterState: "daily_reference" }),
  row({ id: "pass371-eurchf", rank: 212, symbol: "EUR/CHF", name: "Euro / Swiss Franc", assetClass: "fx", riskPressure: 33, sparkTone: "flat", adapterState: "daily_reference" }),
  row({ id: "pass371-dxy", rank: 213, symbol: "DXY", name: "US Dollar Index", assetClass: "fx", riskPressure: 39, sparkTone: "watch", adapterState: "provider_required" }),

  // ETFs / broad market
  row({ id: "pass371-spy", rank: 301, symbol: "SPY", name: "S&P 500 ETF", assetClass: "etf", riskPressure: 35, sparkTone: "flat" }),
  row({ id: "pass371-qqq", rank: 302, symbol: "QQQ", name: "Nasdaq 100 ETF", assetClass: "etf", riskPressure: 40, sparkTone: "watch" }),
  row({ id: "pass371-voo", rank: 303, symbol: "VOO", name: "Vanguard S&P 500 ETF", assetClass: "etf", riskPressure: 35, sparkTone: "flat" }),
  row({ id: "pass371-vti", rank: 304, symbol: "VTI", name: "Total US Market ETF", assetClass: "etf", riskPressure: 34, sparkTone: "flat" }),
  row({ id: "pass371-dia", rank: 305, symbol: "DIA", name: "Dow Jones ETF", assetClass: "etf", riskPressure: 34, sparkTone: "flat" }),
  row({ id: "pass371-iwm", rank: 306, symbol: "IWM", name: "Russell 2000 ETF", assetClass: "etf", riskPressure: 44, sparkTone: "watch" }),
  row({ id: "pass371-tlt", rank: 307, symbol: "TLT", name: "20+ Year Treasury ETF", assetClass: "etf", riskPressure: 43, sparkTone: "watch" }),
  row({ id: "pass371-hyg", rank: 308, symbol: "HYG", name: "High Yield Corporate Bond ETF", assetClass: "etf", riskPressure: 45, sparkTone: "watch" }),
  row({ id: "pass371-eem", rank: 309, symbol: "EEM", name: "Emerging Markets ETF", assetClass: "etf", riskPressure: 42, sparkTone: "watch" }),
  row({ id: "pass371-ewg", rank: 310, symbol: "EWG", name: "Germany ETF", assetClass: "etf", riskPressure: 36, sparkTone: "flat" }),

  // Commodities / real assets
  row({ id: "pass371-xau", rank: 401, symbol: "XAU/USD", name: "Gold spot", assetClass: "commodity", riskPressure: 34, sparkTone: "flat", priceLane: "spot/futures method must be visible" }),
  row({ id: "pass371-xag", rank: 402, symbol: "XAG/USD", name: "Silver spot", assetClass: "commodity", riskPressure: 38, sparkTone: "watch", priceLane: "spot/futures method must be visible" }),
  row({ id: "pass371-wti", rank: 403, symbol: "WTI", name: "WTI crude oil", assetClass: "commodity", riskPressure: 42, sparkTone: "watch" }),
  row({ id: "pass371-brent", rank: 404, symbol: "BRENT", name: "Brent crude oil", assetClass: "commodity", riskPressure: 41, sparkTone: "watch" }),
  row({ id: "pass371-natgas", rank: 405, symbol: "NATGAS", name: "Natural Gas", assetClass: "commodity", riskPressure: 49, sparkTone: "watch" }),
  row({ id: "pass371-copper", rank: 406, symbol: "COPPER", name: "Copper", assetClass: "commodity", riskPressure: 39, sparkTone: "flat" }),
  row({ id: "pass371-platinum", rank: 407, symbol: "PLATINUM", name: "Platinum", assetClass: "commodity", riskPressure: 37, sparkTone: "flat" }),
  row({ id: "pass371-cocoa", rank: 408, symbol: "COCOA", name: "Cocoa", assetClass: "commodity", riskPressure: 52, sparkTone: "watch" }),
  row({ id: "pass371-coffee", rank: 409, symbol: "COFFEE", name: "Coffee", assetClass: "commodity", riskPressure: 45, sparkTone: "watch" }),
  row({ id: "pass371-wheat", rank: 410, symbol: "WHEAT", name: "Wheat", assetClass: "commodity", riskPressure: 42, sparkTone: "watch" }),

  // Real estate / proxies
  row({ id: "pass371-vnq", rank: 501, symbol: "VNQ", name: "US REIT ETF", assetClass: "real_estate", riskPressure: 42, sparkTone: "watch", adapterState: "slow_macro", priceLane: "ETF proxy + housing macro" }),
  row({ id: "pass371-iyr", rank: 502, symbol: "IYR", name: "US Real Estate ETF", assetClass: "real_estate", riskPressure: 43, sparkTone: "watch", adapterState: "slow_macro" }),
  row({ id: "pass371-xlre", rank: 503, symbol: "XLRE", name: "Real Estate Select Sector", assetClass: "real_estate", riskPressure: 41, sparkTone: "watch", adapterState: "slow_macro" }),
  row({ id: "pass371-euhome", rank: 504, symbol: "EUHOME", name: "EU housing pressure", assetClass: "real_estate", riskPressure: 39, sparkTone: "flat", adapterState: "slow_macro" }),
  row({ id: "pass371-plhome", rank: 505, symbol: "PLHOME", name: "Poland housing pressure", assetClass: "real_estate", riskPressure: 40, sparkTone: "flat", adapterState: "slow_macro" }),
];

export const pass371CoverageContract = {
  version: "PASS371.global_real_market_catalog",
  coveragePolicy: "Registry-first: UI can search broad stock/FX/ETF/commodity/real-estate/exchange coverage, but live price confidence unlocks only when a provider timestamp and second-source rule exist.",
  providerRequired: ["equity OHLC", "intraday FX", "commodity spot/futures method", "ETF holdings cadence", "SEC/issuer disclosure", "exchange websocket freshness"],
  noFakeLiveRule: "Never show a preview row as live. If no provider key/timestamp exists, the UI says provider required and still keeps chart/AI layout stable.",
};

export function buildPass371GlobalRealMarketCatalog() {
  return pass371GlobalRealMarketCatalog;
}
