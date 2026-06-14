import type { UniversalAssetRow } from "./universal-asset-market-matrix";

function row(input: Partial<UniversalAssetRow> & Pick<UniversalAssetRow, "id" | "rank" | "symbol" | "name" | "assetClass" | "riskPressure" | "sparkTone">): UniversalAssetRow {
  const family = input.assetClass === "fx" ? "FX" : input.assetClass === "commodity" ? "commodity" : input.assetClass === "real_estate" ? "real-estate proxy" : input.assetClass === "etf" ? "ETF" : "equity";
  return {
    sourceRhythm: input.sourceRhythm ?? `${family} provider timestamp + cache age + second-source freshness`,
    priceLane: input.priceLane ?? `${family} OHLCV candle lane`,
    volumeLane: input.volumeLane ?? `${family} volume / volatility / gap lane`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${family} disclosure or reference-method lane`,
    secondSourceLane: input.secondSourceLane ?? "provider A ↔ provider B before strong public copy",
    confidenceFloor: input.confidenceFloor ?? 52,
    adapterState: input.adapterState ?? "provider_required",
    humanCopy: input.humanCopy ?? `${input.symbol} ma działać w Real Markets jak pozycja Shield: logo, wykres świecowy, price/source state, ryzyko i Basic / Pro / Advanced bez debugowego tekstu.`,
    nextAdapterStep: input.nextAdapterStep ?? "Attach provider timestamp, fallback flag, cache age, second-source divergence and disclosure/reference calendar.",
    ...input,
  };
}

export const pass373RealMarketProviderSpine: UniversalAssetRow[] = [
  // Global bank / payment / broker exposure
  row({ id: "pass373-ms", rank: 170, symbol: "MS", name: "Morgan Stanley", assetClass: "stock", riskPressure: 36, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + bank stress lane" }),
  row({ id: "pass373-c", rank: 171, symbol: "C", name: "Citigroup", assetClass: "stock", riskPressure: 40, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + bank stress lane" }),
  row({ id: "pass373-hsbc", rank: 172, symbol: "HSBC", name: "HSBC", assetClass: "stock", riskPressure: 38, sparkTone: "flat", proofOrDisclosureLane: "issuer disclosure + global bank exposure" }),
  row({ id: "pass373-ubs", rank: 173, symbol: "UBS", name: "UBS Group", assetClass: "stock", riskPressure: 37, sparkTone: "flat", proofOrDisclosureLane: "issuer disclosure + bank exposure" }),
  row({ id: "pass373-bnp", rank: 174, symbol: "BNP.PA", name: "BNP Paribas", assetClass: "stock", riskPressure: 36, sparkTone: "flat", proofOrDisclosureLane: "EU issuer disclosure + bank exposure" }),
  row({ id: "pass373-aca", rank: 175, symbol: "ACA.PA", name: "Credit Agricole", assetClass: "stock", riskPressure: 36, sparkTone: "flat", proofOrDisclosureLane: "EU issuer disclosure + bank exposure" }),

  // Europe / industry / luxury expansion
  row({ id: "pass373-alv", rank: 176, symbol: "ALV.DE", name: "Allianz", assetClass: "stock", riskPressure: 32, sparkTone: "flat", proofOrDisclosureLane: "EU issuer disclosure + insurance exposure" }),
  row({ id: "pass373-bmw", rank: 177, symbol: "BMW.DE", name: "BMW", assetClass: "stock", riskPressure: 35, sparkTone: "flat", proofOrDisclosureLane: "EU issuer disclosure + auto basket" }),
  row({ id: "pass373-mbg", rank: 178, symbol: "MBG.DE", name: "Mercedes-Benz Group", assetClass: "stock", riskPressure: 34, sparkTone: "flat", proofOrDisclosureLane: "EU issuer disclosure + auto basket" }),
  row({ id: "pass373-vow", rank: 179, symbol: "VOW3.DE", name: "Volkswagen", assetClass: "stock", riskPressure: 39, sparkTone: "watch", proofOrDisclosureLane: "EU issuer disclosure + auto basket" }),
  row({ id: "pass373-bas", rank: 180, symbol: "BAS.DE", name: "BASF", assetClass: "stock", riskPressure: 41, sparkTone: "watch", proofOrDisclosureLane: "EU issuer disclosure + chemical / energy exposure" }),
  row({ id: "pass373-ads", rank: 181, symbol: "ADS.DE", name: "Adidas", assetClass: "stock", riskPressure: 34, sparkTone: "flat", proofOrDisclosureLane: "EU issuer disclosure + consumer brand basket" }),
  row({ id: "pass373-rhm", rank: 182, symbol: "RHM.DE", name: "Rheinmetall", assetClass: "stock", riskPressure: 45, sparkTone: "watch", proofOrDisclosureLane: "EU issuer disclosure + geopolitical event lane" }),
  row({ id: "pass373-ker", rank: 183, symbol: "KER.PA", name: "Kering", assetClass: "stock", riskPressure: 39, sparkTone: "watch", proofOrDisclosureLane: "EU issuer disclosure + luxury peer basket" }),

  // FX crosses: broad catalog, not fake live
  row({ id: "pass373-usdmxn", rank: 230, symbol: "USD/MXN", name: "Dollar / Mexican Peso", assetClass: "fx", riskPressure: 39, sparkTone: "watch", adapterState: "daily_reference" }),
  row({ id: "pass373-usdbrl", rank: 231, symbol: "USD/BRL", name: "Dollar / Brazilian Real", assetClass: "fx", riskPressure: 44, sparkTone: "watch", adapterState: "daily_reference" }),
  row({ id: "pass373-usdtry", rank: 232, symbol: "USD/TRY", name: "Dollar / Turkish Lira", assetClass: "fx", riskPressure: 55, sparkTone: "watch", adapterState: "daily_reference" }),
  row({ id: "pass373-usdzar", rank: 233, symbol: "USD/ZAR", name: "Dollar / South African Rand", assetClass: "fx", riskPressure: 43, sparkTone: "watch", adapterState: "daily_reference" }),
  row({ id: "pass373-usdsgd", rank: 234, symbol: "USD/SGD", name: "Dollar / Singapore Dollar", assetClass: "fx", riskPressure: 32, sparkTone: "flat", adapterState: "daily_reference" }),
  row({ id: "pass373-usdhkd", rank: 235, symbol: "USD/HKD", name: "Dollar / Hong Kong Dollar", assetClass: "fx", riskPressure: 34, sparkTone: "flat", adapterState: "daily_reference" }),
  row({ id: "pass373-usdinr", rank: 236, symbol: "USD/INR", name: "Dollar / Indian Rupee", assetClass: "fx", riskPressure: 37, sparkTone: "flat", adapterState: "daily_reference" }),
  row({ id: "pass373-eurczk", rank: 237, symbol: "EUR/CZK", name: "Euro / Czech Koruna", assetClass: "fx", riskPressure: 32, sparkTone: "flat", adapterState: "daily_reference" }),
  row({ id: "pass373-eurhuf", rank: 238, symbol: "EUR/HUF", name: "Euro / Hungarian Forint", assetClass: "fx", riskPressure: 41, sparkTone: "watch", adapterState: "daily_reference" }),
  row({ id: "pass373-eurdkk", rank: 239, symbol: "EUR/DKK", name: "Euro / Danish Krone", assetClass: "fx", riskPressure: 29, sparkTone: "flat", adapterState: "daily_reference" }),
  row({ id: "pass373-eurron", rank: 240, symbol: "EUR/RON", name: "Euro / Romanian Leu", assetClass: "fx", riskPressure: 35, sparkTone: "flat", adapterState: "daily_reference" }),

  // ETF / index proxy lanes
  row({ id: "pass373-eem", rank: 330, symbol: "EEM", name: "Emerging Markets ETF", assetClass: "etf", riskPressure: 42, sparkTone: "watch" }),
  row({ id: "pass373-vgk", rank: 331, symbol: "VGK", name: "Europe ETF", assetClass: "etf", riskPressure: 36, sparkTone: "flat" }),
  row({ id: "pass373-ezu", rank: 332, symbol: "EZU", name: "Eurozone ETF", assetClass: "etf", riskPressure: 36, sparkTone: "flat" }),
  row({ id: "pass373-ewz", rank: 333, symbol: "EWZ", name: "Brazil ETF", assetClass: "etf", riskPressure: 45, sparkTone: "watch" }),
  row({ id: "pass373-inda", rank: 334, symbol: "INDA", name: "India ETF", assetClass: "etf", riskPressure: 39, sparkTone: "watch" }),
  row({ id: "pass373-fxi", rank: 335, symbol: "FXI", name: "China Large-Cap ETF", assetClass: "etf", riskPressure: 46, sparkTone: "watch" }),
  row({ id: "pass373-ewg", rank: 336, symbol: "EWG", name: "Germany ETF", assetClass: "etf", riskPressure: 37, sparkTone: "flat" }),
  row({ id: "pass373-smh", rank: 337, symbol: "SMH", name: "Semiconductor ETF", assetClass: "etf", riskPressure: 47, sparkTone: "watch" }),
  row({ id: "pass373-xly", rank: 338, symbol: "XLY", name: "Consumer Discretionary ETF", assetClass: "etf", riskPressure: 38, sparkTone: "flat" }),
  row({ id: "pass373-xlp", rank: 339, symbol: "XLP", name: "Consumer Staples ETF", assetClass: "etf", riskPressure: 30, sparkTone: "flat" }),

  // Commodities / real assets
  row({ id: "pass373-coffee", rank: 430, symbol: "COFFEE", name: "Coffee", assetClass: "commodity", riskPressure: 43, sparkTone: "watch", priceLane: "soft commodity futures / spot method" }),
  row({ id: "pass373-cocoa", rank: 431, symbol: "COCOA", name: "Cocoa", assetClass: "commodity", riskPressure: 50, sparkTone: "watch", priceLane: "soft commodity futures / spot method" }),
  row({ id: "pass373-rbob", rank: 432, symbol: "RBOB", name: "Gasoline", assetClass: "commodity", riskPressure: 44, sparkTone: "watch", priceLane: "energy futures / spot method" }),
  row({ id: "pass373-heat", rank: 433, symbol: "HEATOIL", name: "Heating Oil", assetClass: "commodity", riskPressure: 45, sparkTone: "watch", priceLane: "energy futures / spot method" }),
  row({ id: "pass373-aluminum", rank: 434, symbol: "ALUMINUM", name: "Aluminium", assetClass: "commodity", riskPressure: 39, sparkTone: "flat", priceLane: "industrial metal reference method" }),
  row({ id: "pass373-ironore", rank: 435, symbol: "IRONORE", name: "Iron Ore", assetClass: "commodity", riskPressure: 42, sparkTone: "watch", priceLane: "industrial commodity reference method" }),
  row({ id: "pass373-lumber", rank: 436, symbol: "LUMBER", name: "Lumber", assetClass: "commodity", riskPressure: 44, sparkTone: "watch", priceLane: "housing-linked commodity reference method" }),

  row({ id: "pass373-rem", rank: 520, symbol: "REM", name: "Mortgage REIT ETF", assetClass: "real_estate", riskPressure: 48, sparkTone: "watch", adapterState: "slow_macro" }),
  row({ id: "pass373-schh", rank: 521, symbol: "SCHH", name: "US REIT ETF", assetClass: "real_estate", riskPressure: 40, sparkTone: "flat", adapterState: "slow_macro" }),
  row({ id: "pass373-rez", rank: 522, symbol: "REZ", name: "Residential Real Estate ETF", assetClass: "real_estate", riskPressure: 42, sparkTone: "watch", adapterState: "slow_macro" }),
];

export const pass373ProviderSpineContract = {
  version: "PASS373.provider_spine_no_fake_live",
  coverageRule: "The catalog can be wide, but live confidence unlocks only when provider timestamp, cache age, fallback state and a second-source lane agree.",
  visualRule: "Real Markets must stay Shield-like: compact table row, real/fallback logo, mini chart, full candle modal, Basic/Pro/Advanced and one human AI brief.",
  providerTargets: [
    { lane: "equities", source: "market OHLCV + issuer filings", ui: "stock candles + SEC/issuer disclosure" },
    { lane: "fx", source: "reference rate + intraday FX provider", ui: "FX candle lane + reference timestamp" },
    { lane: "commodities", source: "spot/futures method + provider timestamp", ui: "commodity candles + method label" },
    { lane: "etf", source: "OHLCV + holdings cadence", ui: "ETF candle lane + holdings date" },
    { lane: "real_estate", source: "REIT proxy + slow macro calendar", ui: "slow macro badge + proxy candles" },
    { lane: "exchange_health", source: "websocket freshness + orderbook depth + reserve context", ui: "venue health row + reconnect state" },
  ],
};

export function buildPass373RealMarketProviderSpine() {
  return pass373RealMarketProviderSpine;
}
