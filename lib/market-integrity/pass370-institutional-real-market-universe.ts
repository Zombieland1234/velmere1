import type { UniversalAssetRow } from "./universal-asset-market-matrix";

function row(input: Partial<UniversalAssetRow> & Pick<UniversalAssetRow, "id" | "rank" | "symbol" | "name" | "assetClass" | "riskPressure" | "sparkTone">): UniversalAssetRow {
  const label = input.assetClass === "fx" ? "FX" : input.assetClass === "commodity" ? "commodity" : input.assetClass === "real_estate" ? "real estate" : input.assetClass === "etf" ? "ETF" : "equity";
  return {
    sourceRhythm: input.sourceRhythm ?? `${label} provider + second source`,
    priceLane: input.priceLane ?? `${label} candles / reference price`,
    volumeLane: input.volumeLane ?? `${label} volume or volatility context`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${label} provider timestamp`,
    secondSourceLane: input.secondSourceLane ?? "second source comparison required before stronger copy",
    confidenceFloor: input.confidenceFloor ?? 48,
    adapterState: input.adapterState ?? "provider_required",
    humanCopy: input.humanCopy ?? `${input.symbol} dostaje kartę Real Markets jak w Shield: logo, cena, wykres, source timestamp, ryzyko oraz Basic / Pro / Advanced bez ściany tekstu.`,
    nextAdapterStep: input.nextAdapterStep ?? "Attach live provider timestamp, chart candles and second-source divergence.",
    ...input,
  };
}

export const pass370InstitutionalRealMarketUniverse: UniversalAssetRow[] = [
  row({ id: "pass370-xom", rank: 63, symbol: "XOM", name: "Exxon Mobil", assetClass: "stock", riskPressure: 35, sparkTone: "flat", priceLane: "energy equity candles", volumeLane: "sector volume + oil beta", proofOrDisclosureLane: "SEC filing + energy event timestamp" }),
  row({ id: "pass370-shel", rank: 64, symbol: "SHEL", name: "Shell", assetClass: "stock", riskPressure: 34, sparkTone: "flat", priceLane: "EU/US energy equity candles", volumeLane: "energy peer volume", proofOrDisclosureLane: "issuer disclosure + energy event timestamp" }),
  row({ id: "pass370-baba", rank: 65, symbol: "BABA", name: "Alibaba", assetClass: "stock", riskPressure: 46, sparkTone: "watch", priceLane: "ADR/equity provider candles", volumeLane: "ADR volume + region risk lane", proofOrDisclosureLane: "issuer disclosure + ADR context" }),
  row({ id: "pass370-tcehy", rank: 66, symbol: "TCEHY", name: "Tencent", assetClass: "stock", riskPressure: 43, sparkTone: "watch", priceLane: "OTC/equity provider candles", volumeLane: "regional liquidity + tech basket", proofOrDisclosureLane: "issuer disclosure + provider timestamp" }),
  row({ id: "pass370-race", rank: 67, symbol: "RACE", name: "Ferrari", assetClass: "stock", riskPressure: 30, sparkTone: "flat", priceLane: "luxury auto equity candles", volumeLane: "luxury/auto peer basket", proofOrDisclosureLane: "issuer disclosure + event calendar" }),
  row({ id: "pass370-p911", rank: 68, symbol: "P911", name: "Porsche AG", assetClass: "stock", riskPressure: 36, sparkTone: "watch", priceLane: "EU luxury auto equity candles", volumeLane: "EU auto/luxury volume context", proofOrDisclosureLane: "issuer disclosure + event calendar" }),
  row({ id: "pass370-air", rank: 69, symbol: "AIR", name: "Airbus", assetClass: "stock", riskPressure: 32, sparkTone: "flat", priceLane: "EU industrial equity candles", volumeLane: "industrial peer basket", proofOrDisclosureLane: "issuer disclosure + order/event lane" }),
  row({ id: "pass370-sie", rank: 70, symbol: "SIE", name: "Siemens", assetClass: "stock", riskPressure: 31, sparkTone: "flat", priceLane: "EU industrial equity candles", volumeLane: "industrial peer basket", proofOrDisclosureLane: "issuer disclosure + sector lane" }),
  row({ id: "pass370-dbk", rank: 71, symbol: "DBK", name: "Deutsche Bank", assetClass: "stock", riskPressure: 41, sparkTone: "watch", priceLane: "EU bank equity candles", volumeLane: "bank sector volume + credit stress", proofOrDisclosureLane: "issuer disclosure + regulatory event lane" }),
  row({ id: "pass370-nesn", rank: 72, symbol: "NESN", name: "Nestlé", assetClass: "stock", riskPressure: 25, sparkTone: "flat", priceLane: "Swiss consumer equity candles", volumeLane: "consumer defensive context", proofOrDisclosureLane: "issuer disclosure timestamp" }),
  row({ id: "pass370-novo", rank: 73, symbol: "NOVO", name: "Novo Nordisk", assetClass: "stock", riskPressure: 33, sparkTone: "flat", priceLane: "healthcare equity candles", volumeLane: "healthcare peer basket", proofOrDisclosureLane: "issuer disclosure + trial/event context" }),
  row({ id: "pass370-usd-cad", rank: 74, symbol: "USD/CAD", name: "Dollar / Canadian Dollar", assetClass: "fx", riskPressure: 34, sparkTone: "flat", priceLane: "FX reference + intraday provider", volumeLane: "commodity dollar beta", proofOrDisclosureLane: "reference timestamp" }),
  row({ id: "pass370-nzd-usd", rank: 75, symbol: "NZD/USD", name: "New Zealand Dollar / Dollar", assetClass: "fx", riskPressure: 35, sparkTone: "flat", priceLane: "FX reference + intraday provider", volumeLane: "risk-on currency context", proofOrDisclosureLane: "reference timestamp" }),
  row({ id: "pass370-cad-pln", rank: 76, symbol: "CAD/PLN", name: "Canadian Dollar / Polish Zloty", assetClass: "fx", riskPressure: 35, sparkTone: "flat", priceLane: "FX reference + intraday provider", volumeLane: "regional FX volatility", proofOrDisclosureLane: "reference timestamp" }),
  row({ id: "pass370-nok-pln", rank: 77, symbol: "NOK/PLN", name: "Norwegian Krone / Polish Zloty", assetClass: "fx", riskPressure: 38, sparkTone: "watch", priceLane: "FX reference + intraday provider", volumeLane: "energy FX context", proofOrDisclosureLane: "reference timestamp" }),
  row({ id: "pass370-sek-pln", rank: 78, symbol: "SEK/PLN", name: "Swedish Krona / Polish Zloty", assetClass: "fx", riskPressure: 36, sparkTone: "flat", priceLane: "FX reference + intraday provider", volumeLane: "regional FX volatility", proofOrDisclosureLane: "reference timestamp" }),
  row({ id: "pass370-eur-gbp", rank: 79, symbol: "EUR/GBP", name: "Euro / Pound", assetClass: "fx", riskPressure: 32, sparkTone: "flat", priceLane: "FX reference + intraday provider", volumeLane: "Europe/UK macro context", proofOrDisclosureLane: "reference timestamp" }),
  row({ id: "pass370-eur-nok", rank: 80, symbol: "EUR/NOK", name: "Euro / Norwegian Krone", assetClass: "fx", riskPressure: 37, sparkTone: "watch", priceLane: "FX reference + intraday provider", volumeLane: "energy/macroeconomic context", proofOrDisclosureLane: "reference timestamp" }),
  row({ id: "pass370-eur-sek", rank: 81, symbol: "EUR/SEK", name: "Euro / Swedish Krona", assetClass: "fx", riskPressure: 35, sparkTone: "flat", priceLane: "FX reference + intraday provider", volumeLane: "regional FX context", proofOrDisclosureLane: "reference timestamp" }),
  row({ id: "pass370-usd-cnh", rank: 82, symbol: "USD/CNH", name: "Dollar / Offshore Yuan", assetClass: "fx", riskPressure: 43, sparkTone: "watch", priceLane: "FX reference + intraday provider", volumeLane: "Asia macro pressure", proofOrDisclosureLane: "reference timestamp" }),
  row({ id: "pass370-eem", rank: 83, symbol: "EEM", name: "Emerging Markets ETF", assetClass: "etf", riskPressure: 42, sparkTone: "watch", priceLane: "ETF candles", volumeLane: "emerging markets volume", proofOrDisclosureLane: "ETF holdings cadence" }),
  row({ id: "pass370-vgk", rank: 84, symbol: "VGK", name: "Europe ETF proxy", assetClass: "etf", riskPressure: 35, sparkTone: "flat", priceLane: "ETF candles", volumeLane: "Europe equity volume", proofOrDisclosureLane: "ETF holdings cadence" }),
  row({ id: "pass370-ewg", rank: 85, symbol: "EWG", name: "Germany ETF proxy", assetClass: "etf", riskPressure: 36, sparkTone: "flat", priceLane: "ETF candles", volumeLane: "Germany equity volume", proofOrDisclosureLane: "ETF holdings cadence" }),
  row({ id: "pass370-efa", rank: 86, symbol: "EFA", name: "Developed Markets ETF", assetClass: "etf", riskPressure: 34, sparkTone: "flat", priceLane: "ETF candles", volumeLane: "developed markets volume", proofOrDisclosureLane: "ETF holdings cadence" }),
  row({ id: "pass370-lux", rank: 87, symbol: "LUX", name: "Luxury sector proxy", assetClass: "etf", riskPressure: 36, sparkTone: "flat", priceLane: "luxury sector basket proxy", volumeLane: "luxury peer basket", proofOrDisclosureLane: "basket methodology + provider timestamp" }),
  row({ id: "pass370-cocoa", rank: 88, symbol: "COCOA", name: "Cocoa", assetClass: "commodity", riskPressure: 50, sparkTone: "watch", priceLane: "agricultural commodity reference", volumeLane: "commodity volatility context", proofOrDisclosureLane: "provider timestamp" }),
  row({ id: "pass370-coffee", rank: 89, symbol: "COFFEE", name: "Coffee", assetClass: "commodity", riskPressure: 44, sparkTone: "watch", priceLane: "agricultural commodity reference", volumeLane: "commodity volatility context", proofOrDisclosureLane: "provider timestamp" }),
  row({ id: "pass370-soybeans", rank: 90, symbol: "SOY", name: "Soybeans", assetClass: "commodity", riskPressure: 40, sparkTone: "flat", priceLane: "agricultural commodity reference", volumeLane: "commodity volatility context", proofOrDisclosureLane: "provider timestamp" }),
  row({ id: "pass370-uranium", rank: 91, symbol: "URA", name: "Uranium ETF proxy", assetClass: "commodity", riskPressure: 49, sparkTone: "watch", priceLane: "commodity ETF proxy candles", volumeLane: "energy metals proxy", proofOrDisclosureLane: "ETF holdings/provider timestamp" }),
  row({ id: "pass370-housing-us", rank: 92, symbol: "USHOME", name: "US housing pressure", assetClass: "real_estate", riskPressure: 42, sparkTone: "watch", adapterState: "slow_macro", priceLane: "housing macro series", volumeLane: "slow macro cadence", proofOrDisclosureLane: "release calendar timestamp" }),
  row({ id: "pass370-housing-eu", rank: 93, symbol: "EUHOME", name: "EU housing pressure", assetClass: "real_estate", riskPressure: 39, sparkTone: "flat", adapterState: "slow_macro", priceLane: "EU housing macro proxy", volumeLane: "slow macro cadence", proofOrDisclosureLane: "release calendar timestamp" }),
];

export function buildPass370InstitutionalRealMarketUniverse() {
  return pass370InstitutionalRealMarketUniverse;
}
