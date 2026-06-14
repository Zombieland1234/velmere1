import type { UniversalAssetRow } from "./universal-asset-market-matrix";

export type Pass376Mode = "basic" | "pro" | "advanced";

function marketRow(input: Partial<UniversalAssetRow> & Pick<UniversalAssetRow, "id" | "rank" | "symbol" | "name" | "assetClass" | "riskPressure" | "sparkTone">): UniversalAssetRow {
  const family = input.assetClass === "fx" ? "FX" : input.assetClass === "commodity" ? "commodity" : input.assetClass === "real_estate" ? "real-estate proxy" : input.assetClass === "etf" ? "ETF" : "equity";
  return {
    sourceRhythm: input.sourceRhythm ?? `${family} provider heartbeat + timestamp + cache-age + fallback flag`,
    priceLane: input.priceLane ?? `${family} OHLCV candle shell shared with Shield`,
    volumeLane: input.volumeLane ?? `${family} volume, spread, gap and volatility rail`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${family} filing/reference/methodology lane`,
    secondSourceLane: input.secondSourceLane ?? "primary provider ↔ second provider before strong confidence",
    confidenceFloor: input.confidenceFloor ?? 56,
    adapterState: input.adapterState ?? "provider_required",
    humanCopy: input.humanCopy ?? `${input.symbol} jest provider-ready: logo, świecowy wykres, source state, risk, Basic/Pro/Advanced, AI Brain i PDF parity bez udawania live danych.`,
    nextAdapterStep: input.nextAdapterStep ?? "Attach provider key, server cache, timestamp, fallback flag, OHLCV adapter, second source and issuer/reference calendar.",
    ...input,
  };
}

export const pass376ProviderLaunchFidelity = {
  version: "PASS376.provider_launch_fidelity_spine",
  publicRule: "A wide global catalog is allowed, but the public UI must say provider-ready until timestamp, cache age, fallback flag and second-source confirmation exist.",
  shieldParityRule: "Every stock, FX pair, ETF, commodity, real-estate proxy and exchange-health venue must open the same Shield-grade modal: logo, candle chart, timeframe, Basic/Pro/Advanced, AI Brain and PDF parity.",
  browserParityRule: "Lens preview, HTML A4 and binary PDF resolve one report object before rendering; copy may be translated, but facts may not be regenerated randomly.",
  noFakeLiveUnlocks: ["provider timestamp", "cache age", "fallback flag", "OHLCV source", "second source", "issuer/reference event lane", "locale-resolved report"],
  providerFamilies: [
    { id: "equities", source: "market-data OHLCV + SEC/issuer disclosure", rhythm: "intraday chart + filing event cadence", ui: "Shield row, logo, candle modal, issuer event strip" },
    { id: "fx", source: "reference rates + intraday FX provider", rhythm: "reference timestamp + volatility band", ui: "FX row, flag/glyph logo, no transaction-price claim" },
    { id: "commodities", source: "spot/futures/ETF methodology bridge", rhythm: "venue/methodology dependent", ui: "XAU/XAG/OIL/agri/metal candle modal" },
    { id: "real_estate", source: "REIT ETF + macro release calendar", rhythm: "slow macro + market proxy", ui: "real-estate proxy row with slow-context badge" },
    { id: "exchange_health", source: "Binance/MEXC/Coinbase/Kraken/OKX/Bybit adapters", rhythm: "API heartbeat + reserve/social lanes", ui: "venue health card, not a solvency certificate" },
  ],
} as const;

export const pass376RealMarketExpansion: UniversalAssetRow[] = [
  // Global equities / brands / banks / infrastructure
  marketRow({ id: "pass376-pg", rank: 224, symbol: "PG", name: "Procter & Gamble", assetClass: "stock", riskPressure: 25, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + consumer defensive basket" }),
  marketRow({ id: "pass376-jj", rank: 225, symbol: "JNJ", name: "Johnson & Johnson", assetClass: "stock", riskPressure: 28, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + healthcare defensive basket" }),
  marketRow({ id: "pass376-pfe", rank: 226, symbol: "PFE", name: "Pfizer", assetClass: "stock", riskPressure: 37, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + pharma event lane" }),
  marketRow({ id: "pass376-mrk", rank: 227, symbol: "MRK", name: "Merck", assetClass: "stock", riskPressure: 31, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + healthcare peer lane" }),
  marketRow({ id: "pass376-abbv", rank: 228, symbol: "ABBV", name: "AbbVie", assetClass: "stock", riskPressure: 33, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + drug pipeline event lane" }),
  marketRow({ id: "pass376-hd", rank: 229, symbol: "HD", name: "Home Depot", assetClass: "stock", riskPressure: 34, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + housing/consumer lane" }),
  marketRow({ id: "pass376-mcd", rank: 230, symbol: "MCD", name: "McDonald's", assetClass: "stock", riskPressure: 29, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + consumer brand lane" }),
  marketRow({ id: "pass376-sbux", rank: 231, symbol: "SBUX", name: "Starbucks", assetClass: "stock", riskPressure: 42, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + consumer traffic lane" }),
  marketRow({ id: "pass376-abnb", rank: 232, symbol: "ABNB", name: "Airbnb", assetClass: "stock", riskPressure: 45, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + travel/housing exposure" }),
  marketRow({ id: "pass376-book", rank: 233, symbol: "BKNG", name: "Booking Holdings", assetClass: "stock", riskPressure: 34, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + travel demand lane" }),
  marketRow({ id: "pass376-adyen", rank: 234, symbol: "ADYEN.AS", name: "Adyen", assetClass: "stock", riskPressure: 39, sparkTone: "watch", proofOrDisclosureLane: "EU issuer disclosure + payments lane" }),
  marketRow({ id: "pass376-spot", rank: 235, symbol: "SPOT", name: "Spotify", assetClass: "stock", riskPressure: 40, sparkTone: "watch", proofOrDisclosureLane: "issuer disclosure + media subscription lane" }),
  marketRow({ id: "pass376-arm", rank: 236, symbol: "ARM", name: "Arm Holdings", assetClass: "stock", riskPressure: 46, sparkTone: "watch", proofOrDisclosureLane: "issuer disclosure + semiconductor IP lane" }),
  marketRow({ id: "pass376-mu", rank: 237, symbol: "MU", name: "Micron", assetClass: "stock", riskPressure: 49, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + memory cycle lane" }),
  marketRow({ id: "pass376-lrcx", rank: 238, symbol: "LRCX", name: "Lam Research", assetClass: "stock", riskPressure: 39, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + semiconductor equipment lane" }),
  marketRow({ id: "pass376-amd-eu", rank: 239, symbol: "IFX.DE", name: "Infineon", assetClass: "stock", riskPressure: 38, sparkTone: "watch", proofOrDisclosureLane: "EU issuer disclosure + semiconductor lane" }),
  marketRow({ id: "pass376-stm", rank: 240, symbol: "STM", name: "STMicroelectronics", assetClass: "stock", riskPressure: 41, sparkTone: "watch", proofOrDisclosureLane: "issuer disclosure + industrial semiconductor lane" }),
  marketRow({ id: "pass376-alu", rank: 241, symbol: "ALV.DE", name: "Allianz", assetClass: "stock", riskPressure: 32, sparkTone: "flat", proofOrDisclosureLane: "EU issuer disclosure + insurance/rates lane" }),
  marketRow({ id: "pass376-muv2", rank: 242, symbol: "MUV2.DE", name: "Munich Re", assetClass: "stock", riskPressure: 31, sparkTone: "flat", proofOrDisclosureLane: "EU issuer disclosure + reinsurance risk lane" }),
  marketRow({ id: "pass376-rms", rank: 243, symbol: "RMS.PA", name: "Hermès", assetClass: "stock", riskPressure: 27, sparkTone: "flat", proofOrDisclosureLane: "EU issuer disclosure + luxury sector lane" }),
  marketRow({ id: "pass376-cfr", rank: 244, symbol: "CFR.SW", name: "Richemont", assetClass: "stock", riskPressure: 34, sparkTone: "flat", proofOrDisclosureLane: "issuer disclosure + luxury watch/jewelry lane" }),
  marketRow({ id: "pass376-kering", rank: 245, symbol: "KER.PA", name: "Kering", assetClass: "stock", riskPressure: 47, sparkTone: "watch", proofOrDisclosureLane: "EU issuer disclosure + luxury turnaround lane" }),
  marketRow({ id: "pass376-prada", rank: 246, symbol: "1913.HK", name: "Prada", assetClass: "stock", riskPressure: 36, sparkTone: "flat", proofOrDisclosureLane: "issuer disclosure + luxury Asia lane" }),
  marketRow({ id: "pass376-loreal", rank: 247, symbol: "OR.PA", name: "L'Oréal", assetClass: "stock", riskPressure: 29, sparkTone: "flat", proofOrDisclosureLane: "EU issuer disclosure + beauty/luxury lane" }),
  // FX and currencies
  marketRow({ id: "pass376-pln-basket", rank: 263, symbol: "PLN/BASKET", name: "Polish Zloty basket", assetClass: "fx", riskPressure: 37, sparkTone: "flat", adapterState: "provider_required" }),
  marketRow({ id: "pass376-eurhuf", rank: 264, symbol: "EUR/HUF", name: "Euro / Hungarian Forint", assetClass: "fx", riskPressure: 46, sparkTone: "watch", adapterState: "provider_required" }),
  marketRow({ id: "pass376-usdtry", rank: 265, symbol: "USD/TRY", name: "Dollar / Turkish Lira", assetClass: "fx", riskPressure: 64, sparkTone: "watch", adapterState: "provider_required" }),
  marketRow({ id: "pass376-usdkrw", rank: 266, symbol: "USD/KRW", name: "Dollar / Korean Won", assetClass: "fx", riskPressure: 42, sparkTone: "watch", adapterState: "provider_required" }),
  marketRow({ id: "pass376-usdtwd", rank: 267, symbol: "USD/TWD", name: "Dollar / Taiwan Dollar", assetClass: "fx", riskPressure: 41, sparkTone: "watch", adapterState: "provider_required" }),
  marketRow({ id: "pass376-usdidr", rank: 268, symbol: "USD/IDR", name: "Dollar / Indonesian Rupiah", assetClass: "fx", riskPressure: 44, sparkTone: "watch", adapterState: "provider_required" }),
  marketRow({ id: "pass376-usdthb", rank: 269, symbol: "USD/THB", name: "Dollar / Thai Baht", assetClass: "fx", riskPressure: 39, sparkTone: "flat", adapterState: "provider_required" }),
  marketRow({ id: "pass376-eurcad", rank: 270, symbol: "EUR/CAD", name: "Euro / Canadian Dollar", assetClass: "fx", riskPressure: 34, sparkTone: "flat", adapterState: "provider_required" }),
  marketRow({ id: "pass376-euraud", rank: 271, symbol: "EUR/AUD", name: "Euro / Australian Dollar", assetClass: "fx", riskPressure: 36, sparkTone: "flat", adapterState: "provider_required" }),
  marketRow({ id: "pass376-audjpy", rank: 272, symbol: "AUD/JPY", name: "Australian Dollar / Yen", assetClass: "fx", riskPressure: 43, sparkTone: "watch", adapterState: "provider_required" }),
  // ETFs / factors / rates
  marketRow({ id: "pass376-vxx", rank: 377, symbol: "VXX", name: "Volatility ETN proxy", assetClass: "etf", riskPressure: 67, sparkTone: "watch", proofOrDisclosureLane: "ETN methodology + volatility futures bridge" }),
  marketRow({ id: "pass376-shy", rank: 378, symbol: "SHY", name: "1-3Y Treasury ETF", assetClass: "etf", riskPressure: 23, sparkTone: "flat", proofOrDisclosureLane: "ETF holdings + short-rate lane" }),
  marketRow({ id: "pass376-ief", rank: 379, symbol: "IEF", name: "7-10Y Treasury ETF", assetClass: "etf", riskPressure: 33, sparkTone: "flat", proofOrDisclosureLane: "ETF holdings + duration lane" }),
  marketRow({ id: "pass376-bnd", rank: 380, symbol: "BND", name: "Total Bond Market ETF", assetClass: "etf", riskPressure: 32, sparkTone: "flat", proofOrDisclosureLane: "ETF holdings + credit/rate lane" }),
  marketRow({ id: "pass376-lqd", rank: 381, symbol: "LQD", name: "Investment Grade Credit ETF", assetClass: "etf", riskPressure: 36, sparkTone: "flat", proofOrDisclosureLane: "ETF holdings + credit spread lane" }),
  marketRow({ id: "pass376-xlf", rank: 382, symbol: "XLF", name: "Financial Sector ETF", assetClass: "etf", riskPressure: 39, sparkTone: "watch", proofOrDisclosureLane: "ETF holdings + bank stress proxy" }),
  marketRow({ id: "pass376-xle", rank: 383, symbol: "XLE", name: "Energy Sector ETF", assetClass: "etf", riskPressure: 42, sparkTone: "watch", proofOrDisclosureLane: "ETF holdings + oil/energy lane" }),
  marketRow({ id: "pass376-xly", rank: 384, symbol: "XLY", name: "Consumer Discretionary ETF", assetClass: "etf", riskPressure: 38, sparkTone: "watch", proofOrDisclosureLane: "ETF holdings + consumer cycle lane" }),
  marketRow({ id: "pass376-xlp", rank: 385, symbol: "XLP", name: "Consumer Staples ETF", assetClass: "etf", riskPressure: 24, sparkTone: "flat", proofOrDisclosureLane: "ETF holdings + defensive sector lane" }),
  marketRow({ id: "pass376-vgt", rank: 386, symbol: "VGT", name: "Information Technology ETF", assetClass: "etf", riskPressure: 37, sparkTone: "watch", proofOrDisclosureLane: "ETF holdings + tech sector lane" }),
  marketRow({ id: "pass376-vea", rank: 387, symbol: "VEA", name: "Developed Markets ETF", assetClass: "etf", riskPressure: 34, sparkTone: "flat", proofOrDisclosureLane: "ETF holdings + developed equity lane" }),
  // commodities and real assets
  marketRow({ id: "pass376-cocoa", rank: 565, symbol: "CC=F", name: "Cocoa futures proxy", assetClass: "commodity", riskPressure: 59, sparkTone: "watch", proofOrDisclosureLane: "soft commodity futures + weather/supply calendar" }),
  marketRow({ id: "pass376-sugar", rank: 566, symbol: "SB=F", name: "Sugar futures proxy", assetClass: "commodity", riskPressure: 43, sparkTone: "watch", proofOrDisclosureLane: "soft commodity futures + agri calendar" }),
  marketRow({ id: "pass376-cotton", rank: 567, symbol: "CT=F", name: "Cotton futures proxy", assetClass: "commodity", riskPressure: 39, sparkTone: "flat", proofOrDisclosureLane: "soft commodity futures + textile supply lane" }),
  marketRow({ id: "pass376-rbob", rank: 568, symbol: "RB=F", name: "Gasoline futures proxy", assetClass: "commodity", riskPressure: 49, sparkTone: "watch", proofOrDisclosureLane: "energy futures + refinery spread lane" }),
  marketRow({ id: "pass376-uranium", rank: 569, symbol: "UX1", name: "Uranium reference proxy", assetClass: "commodity", riskPressure: 53, sparkTone: "watch", proofOrDisclosureLane: "specialty commodity reference + ETF bridge" }),
  marketRow({ id: "pass376-cem", rank: 570, symbol: "CEMENT", name: "Cement cost proxy", assetClass: "commodity", riskPressure: 35, sparkTone: "flat", proofOrDisclosureLane: "construction input proxy + regional source lane" }),
  marketRow({ id: "pass376-lumber", rank: 571, symbol: "LUMBER", name: "Lumber futures proxy", assetClass: "commodity", riskPressure: 48, sparkTone: "watch", proofOrDisclosureLane: "housing input + futures methodology" }),
  marketRow({ id: "pass376-rwx", rank: 464, symbol: "RWX", name: "International Real Estate ETF", assetClass: "real_estate", riskPressure: 44, sparkTone: "watch", adapterState: "slow_macro", proofOrDisclosureLane: "global REIT proxy + FX context" }),
  marketRow({ id: "pass376-rez", rank: 465, symbol: "REZ", name: "Residential Real Estate ETF", assetClass: "real_estate", riskPressure: 43, sparkTone: "watch", adapterState: "slow_macro", proofOrDisclosureLane: "residential REIT + rate sensitivity lane" }),
  marketRow({ id: "pass376-vnq", rank: 466, symbol: "VNQ", name: "Vanguard Real Estate ETF", assetClass: "real_estate", riskPressure: 41, sparkTone: "watch", adapterState: "slow_macro", proofOrDisclosureLane: "REIT ETF + macro calendar" }),
  marketRow({ id: "pass376-mortgage", rank: 467, symbol: "MORTGAGE", name: "Mortgage rate proxy", assetClass: "real_estate", riskPressure: 52, sparkTone: "watch", adapterState: "slow_macro", proofOrDisclosureLane: "rate calendar + mortgage spread proxy" }),
] as const;

export const pass376AssetVisualPatch = {
  PG: { label: "Procter & Gamble", glyph: "PG", primary: "#003da5", secondary: "#d8b36a" },
  JNJ: { label: "Johnson & Johnson", glyph: "JJ", primary: "#d71920", secondary: "#2a0505" },
  PFE: { label: "Pfizer", glyph: "PF", primary: "#0093d0", secondary: "#052536" },
  MRK: { label: "Merck", glyph: "MR", primary: "#007a73", secondary: "#062421" },
  ABBV: { label: "AbbVie", glyph: "AB", primary: "#0b4ea2", secondary: "#061a34" },
  HD: { label: "Home Depot", glyph: "HD", primary: "#f96302", secondary: "#2b1004" },
  MCD: { label: "McDonald's", glyph: "M", primary: "#ffbc0d", secondary: "#db0007", text: "#111" },
  SBUX: { label: "Starbucks", glyph: "SB", primary: "#006241", secondary: "#062016" },
  ABNB: { label: "Airbnb", glyph: "AB", primary: "#ff385c", secondary: "#2b050d" },
  BKNG: { label: "Booking", glyph: "BK", primary: "#003580", secondary: "#009fe3" },
  "ADYEN.AS": { label: "Adyen", glyph: "AY", primary: "#0abf53", secondary: "#05240f" },
  SPOT: { label: "Spotify", glyph: "SP", primary: "#1db954", secondary: "#06200e", text: "#061107" },
  ARM: { label: "Arm", glyph: "AR", primary: "#0091bd", secondary: "#061f2a" },
  MU: { label: "Micron", glyph: "MU", primary: "#253746", secondary: "#74d3ff" },
  LRCX: { label: "Lam Research", glyph: "LX", primary: "#004b8d", secondary: "#061a30" },
  "IFX.DE": { label: "Infineon", glyph: "IF", primary: "#0a8276", secondary: "#052622" },
  STM: { label: "STMicro", glyph: "ST", primary: "#03234b", secondary: "#39a9dc" },
  "ALV.DE": { label: "Allianz", glyph: "AL", primary: "#003781", secondary: "#061a35" },
  "MUV2.DE": { label: "Munich Re", glyph: "MR", primary: "#0b4f8a", secondary: "#071d33" },
  "RMS.PA": { label: "Hermès", glyph: "HE", primary: "#f37021", secondary: "#2b1005" },
  "CFR.SW": { label: "Richemont", glyph: "RC", primary: "#d8b36a", secondary: "#24170a" },
  "KER.PA": { label: "Kering", glyph: "KE", primary: "#111827", secondary: "#d8b36a" },
  "1913.HK": { label: "Prada", glyph: "PR", primary: "#111827", secondary: "#f2f2f2" },
  "OR.PA": { label: "L'Oréal", glyph: "OR", primary: "#d8b36a", secondary: "#111827" },
  "PLN/BASKET": { label: "PLN Basket", glyph: "Zł", primary: "#d4213d", secondary: "#f5f5f5", text: "#111" },
  "EUR/HUF": { label: "Euro Forint", glyph: "€F", primary: "#225eea", secondary: "#1c8b4d" },
  "USD/TRY": { label: "Dollar Lira", glyph: "$T", primary: "#0f8d61", secondary: "#e30a17" },
  "USD/KRW": { label: "Dollar Won", glyph: "$W", primary: "#0f8d61", secondary: "#0047a0" },
  "USD/TWD": { label: "Dollar TWD", glyph: "$T", primary: "#0f8d61", secondary: "#003f87" },
  "USD/IDR": { label: "Dollar Rupiah", glyph: "$I", primary: "#0f8d61", secondary: "#ce1126" },
  "USD/THB": { label: "Dollar Baht", glyph: "$B", primary: "#0f8d61", secondary: "#2d2a4a" },
  VXX: { label: "Volatility", glyph: "VX", primary: "#6b21a8", secondary: "#19072a" },
  SHY: { label: "Short Treasury", glyph: "SH", primary: "#315a7d", secondary: "#071b2d" },
  IEF: { label: "Treasury", glyph: "IE", primary: "#3f627a", secondary: "#071d2b" },
  BND: { label: "Bond ETF", glyph: "BD", primary: "#506b84", secondary: "#091a28" },
  LQD: { label: "Credit", glyph: "LQ", primary: "#4d6475", secondary: "#081923" },
  XLF: { label: "Financials", glyph: "XF", primary: "#1f4b7a", secondary: "#071728" },
  XLE: { label: "Energy", glyph: "XE", primary: "#0d6b3c", secondary: "#061d12" },
  XLY: { label: "Discretionary", glyph: "XY", primary: "#bf6a02", secondary: "#241303" },
  XLP: { label: "Staples", glyph: "XP", primary: "#0b6b4d", secondary: "#062018" },
  VGT: { label: "Tech ETF", glyph: "VG", primary: "#0f62fe", secondary: "#071a3a" },
  VEA: { label: "Developed ETF", glyph: "VE", primary: "#315bdc", secondary: "#0b1438" },
  "CC=F": { label: "Cocoa", glyph: "CC", primary: "#7b3f00", secondary: "#1c0e03" },
  "SB=F": { label: "Sugar", glyph: "SU", primary: "#e8e2d0", secondary: "#5c4a2f", text: "#111" },
  "CT=F": { label: "Cotton", glyph: "CT", primary: "#f5f1e7", secondary: "#7a6b55", text: "#111" },
  "RB=F": { label: "Gasoline", glyph: "RB", primary: "#ff6b00", secondary: "#2b1203" },
  UX1: { label: "Uranium", glyph: "UX", primary: "#77dd77", secondary: "#102b10", text: "#071107" },
  CEMENT: { label: "Cement", glyph: "CE", primary: "#9aa0a6", secondary: "#25272a" },
  LUMBER: { label: "Lumber", glyph: "LB", primary: "#8b5a2b", secondary: "#1d1007" },
  RWX: { label: "Intl Real Estate", glyph: "RW", primary: "#c9a66b", secondary: "#2b1a0d" },
  REZ: { label: "Residential RE", glyph: "RZ", primary: "#b99d72", secondary: "#24170d" },
  MORTGAGE: { label: "Mortgage", glyph: "MG", primary: "#9b7d52", secondary: "#211407" },
} as const;

export const pass376PseudoPricePatch: Record<string, string> = {
  PG: "$152.40", JNJ: "$184.10", PFE: "$26.80", MRK: "$94.20", ABBV: "$228.30", HD: "$370.60", MCD: "$303.70", SBUX: "$84.20", ABNB: "$126.40", BKNG: "$5,260", "ADYEN.AS": "€1,450", SPOT: "$735.20", ARM: "$151.30", MU: "$249.10", LRCX: "$178.40", "IFX.DE": "€36.20", STM: "$28.70", "ALV.DE": "€381.30", "MUV2.DE": "€565.20", "RMS.PA": "€2,310", "CFR.SW": "CHF 152.40", "KER.PA": "€276.90", "1913.HK": "HK$68.40", "OR.PA": "€367.20",
  "PLN/BASKET": "100.0", "EUR/HUF": "392.4", "USD/TRY": "47.10", "USD/KRW": "1,418", "USD/TWD": "31.2", "USD/IDR": "16,290", "USD/THB": "32.1", "EUR/CAD": "1.600", "EUR/AUD": "1.765", "AUD/JPY": "103.1",
  VXX: "$43.80", SHY: "$82.60", IEF: "$93.90", BND: "$74.50", LQD: "$111.20", XLF: "$55.80", XLE: "$91.40", XLY: "$258.20", XLP: "$82.40", VGT: "$792.10", VEA: "$61.30",
  "CC=F": "$12,800", "SB=F": "$16.10", "CT=F": "$65.20", "RB=F": "$1.94", UX1: "$82.50", CEMENT: "index", LUMBER: "$620", RWX: "$26.70", REZ: "$83.40", MORTGAGE: "macro",
};

export const pass376BrainCollapsePhases = [
  { id: "identity", label: "Identity lock", seconds: 0.6, copy: "Symbol, rynek, język strony i provider route są zamrożone przed animacją." },
  { id: "provider", label: "Provider proof", seconds: 1.0, copy: "Timestamp, cache age, fallback flag i second source decydują o sile copy." },
  { id: "chart", label: "Shield-grade chart", seconds: 1.2, copy: "Ten sam shell świecowy obsługuje crypto, stocki, FX, ETF, surowce i venue health." },
  { id: "neuron", label: "Neural audit flow", seconds: 1.6, copy: "Niebieskie ścieżki łączą price, depth, issuer, macro, security i Research Lab." },
  { id: "collapse", label: "Field collapse", seconds: 1.4, copy: "Mózg zamienia się w 10/14/20 krótkich pól, bez losowych kafelków i filler copy." },
  { id: "pdf", label: "PDF parity seal", seconds: 0.8, copy: "Preview, modal i download renderują te same fakty z jednego report object." },
] as const;

const pass376Fields = [
  { id: "identity", label: "Identity", value: "locked", copy: "Ticker, nazwa, rynek i provider route są jednoznaczne." },
  { id: "logo", label: "Logo", value: "visual-first", copy: "Każdy instrument ma ikonę albo deterministyczny brand fallback." },
  { id: "chart", label: "Chart", value: "Shield shell", copy: "Świece, wolumen, MA i timeframe działają identycznie jak w Shield." },
  { id: "source", label: "Source", value: "timestamp", copy: "Bez timestampu UI pokazuje provider-ready, a nie fake live." },
  { id: "cache", label: "Cache age", value: "visible", copy: "Stare dane obniżają pewność zamiast wzmacniać opis." },
  { id: "fallback", label: "Fallback", value: "flagged", copy: "Tryb awaryjny jest widoczny dla użytkownika i operatora." },
  { id: "risk", label: "Risk", value: "review pressure", copy: "0–100 oznacza presję review, nie komendę tradingową." },
  { id: "second", label: "Second source", value: "required", copy: "Silne wnioski wymagają porównania z drugim źródłem." },
  { id: "issuer", label: "Issuer", value: "filing/event", copy: "Spółki potrzebują filingów i eventów, nie samego wykresu." },
  { id: "macro", label: "Macro", value: "context", copy: "FX, stopy, surowce i sektor tłumaczą tło rynku." },
  { id: "liquidity", label: "Liquidity", value: "depth/spread", copy: "Dla krypto liczy się orderbook, dla real markets spread i płynność." },
  { id: "venue", label: "Exchange health", value: "separate", copy: "Binance/MEXC/Coinbase/OKX są venue-health, nie zwykłym stockiem." },
  { id: "security", label: "Security", value: "redacted", copy: "Raport pokazuje wynik, ale ukrywa reguły operatorowe i sekrety." },
  { id: "entropy", label: "Entropy", value: "quality", copy: "RNG opisujemy jako jakość źródła entropii, bez instrukcji sekretów." },
  { id: "ecc", label: "ECC/BTC", value: "education", copy: "Krzywa eliptyczna jest edukacją o podpisach, bez nadużyć." },
  { id: "prime", label: "Prime lab", value: "audit", copy: "Bajak Protocol to numerical audit, falsyfikacja i replikacja." },
  { id: "locale", label: "Locale", value: "PL/EN/DE", copy: "Język wybierany jest przed generacją raportu." },
  { id: "pdf", label: "PDF parity", value: "same object", copy: "HTML preview i pobrany PDF mają te same fakty." },
  { id: "next", label: "Next step", value: "one action", copy: "Użytkownik dostaje jeden konkretny kolejny krok." },
  { id: "operator", label: "Operator", value: "hidden", copy: "Progi, heurystyki i raw logi zostają poza publiczną stroną." },
] as const;

export function buildPass376LaunchFidelityDeck(input: { symbol: string; name: string; type: string; risk: number; source: string; mode: Pass376Mode }) {
  const count = input.mode === "advanced" ? 20 : input.mode === "pro" ? 14 : 10;
  const seconds = pass376BrainCollapsePhases.reduce((sum, phase) => sum + phase.seconds, 0) + (input.mode === "advanced" ? 2.6 : input.mode === "pro" ? 1.2 : 0.4);
  const band = input.risk >= 58 ? "operator-review" : input.risk >= 42 ? "source-watch" : "launch-clean";
  return {
    version: "PASS376.launch_fidelity_ai_brain",
    count,
    seconds: Number(seconds.toFixed(1)),
    band,
    headline: `${input.symbol} przechodzi przez launch-fidelity brain: logo, wykres, provider, security, Research Lab i PDF bez rozjazdu treści.`,
    body: `${input.name} (${input.type}) używa źródła ${input.source}. Jeśli provider nie ma timestampu, UI pokazuje stan provider-ready zamiast udawać live.` ,
    fields: pass376Fields.slice(0, count),
  };
}

export const pass376PdfParitySeal = {
  title: "PASS376 · Launch fidelity seal",
  rule: "Browser preview, modal, Real Markets modal and binary PDF must share one resolved report object, selected locale and the same human facts; layout can change, content cannot be random.",
  sections: ["logo/identity", "Shield-grade chart", "provider timestamp", "cache age", "fallback flag", "second source", "10/14/20 AI Brain fields", "security boundary", "prime-lab audit", "PDF parity"],
} as const;

export const pass376SecurityPlainLaunch = [
  "Security page should read like a simple public architecture: session, signature, entropy, redaction, source freshness and operator review.",
  "Velmère can explain private/public key logic and ECC signatures, but never asks for seed phrases, private keys or raw secrets.",
  "Entropy/RNG is described as quality control for randomness, not as a public recipe for creating wallet secrets.",
  "Research Lab explains prime numbers, cryptography and Bajak Protocol as numerical audit, falsification and replication path.",
] as const;

export function buildPass376MarketCoverageUniverse() {
  return pass376RealMarketExpansion;
}
