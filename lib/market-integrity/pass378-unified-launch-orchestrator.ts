import type { UniversalAssetRow } from "./universal-asset-market-matrix";

export type Pass378Mode = "basic" | "pro" | "advanced";

function marketRow(input: Partial<UniversalAssetRow> & Pick<UniversalAssetRow, "id" | "rank" | "symbol" | "name" | "assetClass" | "riskPressure" | "sparkTone">): UniversalAssetRow {
  const family = input.assetClass === "fx" ? "FX" : input.assetClass === "commodity" ? "commodity" : input.assetClass === "real_estate" ? "real-estate proxy" : input.assetClass === "etf" ? "ETF" : input.assetClass === "exchange_token" ? "venue-linked asset" : "equity";
  return {
    sourceRhythm: input.sourceRhythm ?? `${family} provider heartbeat + timestamp + cache-age + fallback flag`,
    priceLane: input.priceLane ?? `${family} Shield-grade OHLCV candle shell`,
    volumeLane: input.volumeLane ?? `${family} volume, spread, session gap and volatility rail`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${family} issuer/reference/methodology lane`,
    secondSourceLane: input.secondSourceLane ?? "primary provider ↔ second provider before strong confidence",
    confidenceFloor: input.confidenceFloor ?? 60,
    adapterState: input.adapterState ?? "provider_required",
    humanCopy: input.humanCopy ?? `${input.symbol} is provider-ready: real logo/glyph, Shield-grade chart, Basic/Pro/Advanced brain, source freshness, second source and PDF parity. It never pretends to be live without timestamps.`,
    nextAdapterStep: input.nextAdapterStep ?? "Wire provider key, server cache, timestamp, fallback flag, OHLCV adapter, issuer/reference lane and second-source compare.",
    ...input,
  };
}

export const pass378LaunchOrchestratorContract = {
  version: "PASS378.unified_launch_orchestrator",
  publicRule: "Every Real Markets row must behave like Shield: logo, chart, timeframe, Basic/Pro/Advanced, VLM AI Brain, short readout and PDF parity. Catalog breadth is allowed; fake live confidence is not.",
  brainRule: "The VLM coin becomes a 3D-like neural audit core: intake -> provider lock -> candle field -> security bridge -> research lane -> final human readout.",
  pdfRule: "Browser preview, Real Markets modal and downloaded PDF render the same resolved report object after locale is locked. PL/EN/DE copy may change language, not facts.",
  securityRule: "Public security is simple: private key stays private, signature proves control, entropy quality matters, reports are redacted, operator rules remain hidden.",
  researchRule: "Prime/Riemann/Bajak content is framed as numerical audit, falsification and replication until independent proof/review exists.",
  providerFamilies: ["US equities", "EU equities", "Asia equities", "FX majors", "FX emerging", "ETF/factors", "commodities", "real estate proxy", "exchange health"],
  unlocks: ["timestamp", "cache-age", "fallback flag", "OHLCV source", "second source", "issuer/reference lane", "locale-locked report object"],
  tiers: [
    { id: "basic", fields: 10, seconds: 5.0, copy: "identity, logo, chart, source state, risk and one human next step" },
    { id: "pro", fields: 14, seconds: 6.8, copy: "adds issuer, liquidity, second source, macro and security boundary" },
    { id: "advanced", fields: 20, seconds: 9.4, copy: "adds provider diagnostics, entropy/ECC education, prime-lab boundary and PDF parity" },
  ],
} as const;

export const pass378ProviderDeck = [
  { id: "equities", label: "Equities", source: "SEC / issuer / exchange provider", cadence: "intraday + filings", boundary: "No live confidence without quote timestamp and filing lane." },
  { id: "fx", label: "FX", source: "ECB/reference + intraday FX provider", cadence: "reference + intraday", boundary: "Reference rates are context, not transaction prices." },
  { id: "commodities", label: "Commodities", source: "spot/futures/ETF methodology", cadence: "session/intraday", boundary: "Methodology is shown before strong commodity copy." },
  { id: "real-estate", label: "Real estate", source: "REIT/ETF + slow macro", cadence: "daily/slow macro", boundary: "Slow macro cannot become second-by-second alarm copy." },
  { id: "venues", label: "Exchange health", source: "MEXC/Binance/second venue", cadence: "live + expiry", boundary: "Heartbeat, reconnect and second venue stay visible." },
] as const;

export const pass378MarketExpansion: UniversalAssetRow[] = [
  // US megacap / semis / cyber / payment / data
  marketRow({ id: "pass378-intc2", rank: 331, symbol: "INTC", name: "Intel", assetClass: "stock", riskPressure: 57, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + semiconductor turnaround lane" }),
  marketRow({ id: "pass378-qcom2", rank: 332, symbol: "QCOM", name: "Qualcomm", assetClass: "stock", riskPressure: 39, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + mobile chipset lane" }),
  marketRow({ id: "pass378-txn", rank: 333, symbol: "TXN", name: "Texas Instruments", assetClass: "stock", riskPressure: 34, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + analog semis lane" }),
  marketRow({ id: "pass378-amat", rank: 334, symbol: "AMAT", name: "Applied Materials", assetClass: "stock", riskPressure: 40, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + semiconductor equipment lane" }),
  marketRow({ id: "pass378-klac", rank: 335, symbol: "KLAC", name: "KLA", assetClass: "stock", riskPressure: 37, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + wafer inspection lane" }),
  marketRow({ id: "pass378-mrvl", rank: 336, symbol: "MRVL", name: "Marvell", assetClass: "stock", riskPressure: 51, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + AI/network silicon lane" }),
  marketRow({ id: "pass378-smci", rank: 337, symbol: "SMCI", name: "Super Micro Computer", assetClass: "stock", riskPressure: 68, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + AI server/governance lane", confidenceFloor: 52 }),
  marketRow({ id: "pass378-okta", rank: 338, symbol: "OKTA", name: "Okta", assetClass: "stock", riskPressure: 46, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + identity security lane" }),
  marketRow({ id: "pass378-ftnt", rank: 339, symbol: "FTNT", name: "Fortinet", assetClass: "stock", riskPressure: 38, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + network security lane" }),
  marketRow({ id: "pass378-s", rank: 340, symbol: "S", name: "SentinelOne", assetClass: "stock", riskPressure: 55, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + endpoint security lane" }),
  marketRow({ id: "pass378-hon", rank: 341, symbol: "HON", name: "Honeywell", assetClass: "stock", riskPressure: 30, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + industrial automation lane" }),
  marketRow({ id: "pass378-ge", rank: 342, symbol: "GE", name: "GE Aerospace", assetClass: "stock", riskPressure: 35, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + aerospace lane" }),
  marketRow({ id: "pass378-cat", rank: 343, symbol: "CAT", name: "Caterpillar", assetClass: "stock", riskPressure: 33, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + industrial cycle lane" }),
  marketRow({ id: "pass378-de", rank: 344, symbol: "DE", name: "Deere", assetClass: "stock", riskPressure: 37, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + agriculture equipment lane" }),
  marketRow({ id: "pass378-rtx", rank: 345, symbol: "RTX", name: "RTX", assetClass: "stock", riskPressure: 32, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + aerospace/defense lane" }),
  marketRow({ id: "pass378-ba", rank: 346, symbol: "BA", name: "Boeing", assetClass: "stock", riskPressure: 62, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + delivery/safety event lane", confidenceFloor: 50 }),
  marketRow({ id: "pass378-uber2", rank: 347, symbol: "DASH", name: "DoorDash", assetClass: "stock", riskPressure: 48, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + delivery platform lane" }),
  marketRow({ id: "pass378-rblx", rank: 348, symbol: "RBLX", name: "Roblox", assetClass: "stock", riskPressure: 52, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + gaming/social platform lane" }),
  // Europe / luxury / banks / exchanges
  marketRow({ id: "pass378-air", rank: 349, symbol: "AIR.PA", name: "Airbus", assetClass: "stock", riskPressure: 34, sparkTone: "flat", proofOrDisclosureLane: "EU issuer disclosure + aerospace lane" }),
  marketRow({ id: "pass378-sie", rank: 350, symbol: "SIE.DE", name: "Siemens", assetClass: "stock", riskPressure: 31, sparkTone: "flat", proofOrDisclosureLane: "EU issuer disclosure + industrial automation lane" }),
  marketRow({ id: "pass378-dbk", rank: 351, symbol: "DBK.DE", name: "Deutsche Bank", assetClass: "stock", riskPressure: 47, sparkTone: "watch", proofOrDisclosureLane: "EU issuer disclosure + bank risk lane" }),
  marketRow({ id: "pass378-cs", rank: 352, symbol: "CS.PA", name: "AXA", assetClass: "stock", riskPressure: 29, sparkTone: "flat", proofOrDisclosureLane: "EU issuer disclosure + insurance lane" }),
  marketRow({ id: "pass378-el", rank: 353, symbol: "EL", name: "Estée Lauder", assetClass: "stock", riskPressure: 53, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + luxury beauty lane" }),
  marketRow({ id: "pass378-bur", rank: 354, symbol: "BRBY.L", name: "Burberry", assetClass: "stock", riskPressure: 58, sparkTone: "watch", proofOrDisclosureLane: "UK issuer disclosure + luxury apparel lane" }),
  marketRow({ id: "pass378-cpri", rank: 355, symbol: "CPRI", name: "Capri Holdings", assetClass: "stock", riskPressure: 55, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + luxury fashion lane" }),
  marketRow({ id: "pass378-boss", rank: 356, symbol: "BOSS.DE", name: "Hugo Boss", assetClass: "stock", riskPressure: 43, sparkTone: "watch", proofOrDisclosureLane: "EU issuer disclosure + premium apparel lane" }),
  marketRow({ id: "pass378-race", rank: 357, symbol: "RACE", name: "Ferrari", assetClass: "stock", riskPressure: 30, sparkTone: "flat", proofOrDisclosureLane: "issuer disclosure + luxury auto lane" }),
  marketRow({ id: "pass378-lse", rank: 358, symbol: "LSEG.L", name: "London Stock Exchange Group", assetClass: "stock", riskPressure: 28, sparkTone: "flat", proofOrDisclosureLane: "issuer disclosure + market infrastructure lane" }),
  marketRow({ id: "pass378-cme", rank: 359, symbol: "CME", name: "CME Group", assetClass: "stock", riskPressure: 27, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + derivatives exchange lane" }),
  marketRow({ id: "pass378-ice", rank: 360, symbol: "ICE", name: "Intercontinental Exchange", assetClass: "stock", riskPressure: 28, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + exchange/clearing lane" }),
  marketRow({ id: "pass378-nDAQ", rank: 361, symbol: "NDAQ", name: "Nasdaq", assetClass: "stock", riskPressure: 29, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + exchange technology lane" }),
  // FX / macro
  marketRow({ id: "pass378-eurnok", rank: 362, symbol: "EUR/NOK", name: "Euro / Norwegian Krone", assetClass: "fx", riskPressure: 41, sparkTone: "watch" }),
  marketRow({ id: "pass378-eursek", rank: 363, symbol: "EUR/SEK", name: "Euro / Swedish Krona", assetClass: "fx", riskPressure: 39, sparkTone: "watch" }),
  marketRow({ id: "pass378-eurdkk", rank: 364, symbol: "EUR/DKK", name: "Euro / Danish Krone", assetClass: "fx", riskPressure: 20, sparkTone: "flat" }),
  marketRow({ id: "pass378-usdils", rank: 365, symbol: "USD/ILS", name: "Dollar / Israeli Shekel", assetClass: "fx", riskPressure: 48, sparkTone: "watch" }),
  marketRow({ id: "pass378-usdsar", rank: 366, symbol: "USD/SAR", name: "Dollar / Saudi Riyal", assetClass: "fx", riskPressure: 24, sparkTone: "flat" }),
  marketRow({ id: "pass378-usdaed", rank: 367, symbol: "USD/AED", name: "Dollar / UAE Dirham", assetClass: "fx", riskPressure: 23, sparkTone: "flat" }),
  marketRow({ id: "pass378-usdngn", rank: 368, symbol: "USD/NGN", name: "Dollar / Nigerian Naira", assetClass: "fx", riskPressure: 66, sparkTone: "watch", confidenceFloor: 50 }),
  marketRow({ id: "pass378-usdegp", rank: 369, symbol: "USD/EGP", name: "Dollar / Egyptian Pound", assetClass: "fx", riskPressure: 59, sparkTone: "watch" }),
  marketRow({ id: "pass378-usdinr2", rank: 370, symbol: "USD/INR", name: "Dollar / Indian Rupee", assetClass: "fx", riskPressure: 34, sparkTone: "flat" }),
  marketRow({ id: "pass378-usdphp", rank: 371, symbol: "USD/PHP", name: "Dollar / Philippine Peso", assetClass: "fx", riskPressure: 38, sparkTone: "flat" }),
  // ETF, commodities, real estate and volatility
  marketRow({ id: "pass378-ivv", rank: 372, symbol: "IVV", name: "Core S&P 500 ETF", assetClass: "etf", riskPressure: 26, sparkTone: "flat", proofOrDisclosureLane: "ETF holdings + S&P methodology lane" }),
  marketRow({ id: "pass378-voo", rank: 373, symbol: "VOO", name: "Vanguard S&P 500 ETF", assetClass: "etf", riskPressure: 26, sparkTone: "flat", proofOrDisclosureLane: "ETF holdings + S&P methodology lane" }),
  marketRow({ id: "pass378-dia", rank: 374, symbol: "DIA", name: "Dow ETF", assetClass: "etf", riskPressure: 30, sparkTone: "flat", proofOrDisclosureLane: "ETF holdings + Dow methodology lane" }),
  marketRow({ id: "pass378-efa", rank: 375, symbol: "EFA", name: "EAFE Developed Markets ETF", assetClass: "etf", riskPressure: 34, sparkTone: "flat", proofOrDisclosureLane: "ETF holdings + developed ex-US lane" }),
  marketRow({ id: "pass378-ewg", rank: 376, symbol: "EWG", name: "Germany ETF", assetClass: "etf", riskPressure: 38, sparkTone: "watch", proofOrDisclosureLane: "ETF holdings + Germany equity lane" }),
  marketRow({ id: "pass378-ewu", rank: 377, symbol: "EWU", name: "United Kingdom ETF", assetClass: "etf", riskPressure: 36, sparkTone: "flat", proofOrDisclosureLane: "ETF holdings + UK equity lane" }),
  marketRow({ id: "pass378-ewj", rank: 378, symbol: "EWJ", name: "Japan ETF", assetClass: "etf", riskPressure: 35, sparkTone: "flat", proofOrDisclosureLane: "ETF holdings + Japan equity lane" }),
  marketRow({ id: "pass378-ewh", rank: 379, symbol: "EWH", name: "Hong Kong ETF", assetClass: "etf", riskPressure: 50, sparkTone: "watch", proofOrDisclosureLane: "ETF holdings + Hong Kong risk lane" }),
  marketRow({ id: "pass378-uso", rank: 380, symbol: "USO", name: "US Oil ETF", assetClass: "commodity", riskPressure: 46, sparkTone: "watch", proofOrDisclosureLane: "oil futures ETF methodology lane" }),
  marketRow({ id: "pass378-ung", rank: 381, symbol: "UNG", name: "Natural Gas ETF", assetClass: "commodity", riskPressure: 61, sparkTone: "watch", proofOrDisclosureLane: "gas futures ETF methodology lane", confidenceFloor: 51 }),
  marketRow({ id: "pass378-dba", rank: 382, symbol: "DBA", name: "Agriculture ETF", assetClass: "commodity", riskPressure: 44, sparkTone: "watch", proofOrDisclosureLane: "agri futures ETF methodology lane" }),
  marketRow({ id: "pass378-pdbc", rank: 383, symbol: "PDBC", name: "Broad Commodities ETF", assetClass: "commodity", riskPressure: 40, sparkTone: "flat", proofOrDisclosureLane: "commodity basket methodology lane" }),
  marketRow({ id: "pass378-ura", rank: 384, symbol: "URA", name: "Uranium ETF", assetClass: "commodity", riskPressure: 55, sparkTone: "watch", proofOrDisclosureLane: "uranium miners/spot proxy lane" }),
  marketRow({ id: "pass378-rem", rank: 385, symbol: "REM", name: "Mortgage REIT ETF", assetClass: "real_estate", riskPressure: 52, sparkTone: "watch", adapterState: "slow_macro", proofOrDisclosureLane: "mortgage REIT + rate sensitivity lane" }),
  marketRow({ id: "pass378-reet", rank: 386, symbol: "REET", name: "Global REIT ETF", assetClass: "real_estate", riskPressure: 40, sparkTone: "flat", adapterState: "slow_macro", proofOrDisclosureLane: "global real estate basket lane" }),
  marketRow({ id: "pass378-cre", rank: 387, symbol: "CRE/LOAN", name: "Commercial real estate credit proxy", assetClass: "real_estate", riskPressure: 63, sparkTone: "watch", adapterState: "slow_macro", proofOrDisclosureLane: "CRE credit spread + bank exposure lane", confidenceFloor: 50 }),
  marketRow({ id: "pass378-housing", rank: 388, symbol: "HOUSING", name: "Housing affordability proxy", assetClass: "real_estate", riskPressure: 48, sparkTone: "watch", adapterState: "slow_macro", proofOrDisclosureLane: "housing affordability + mortgage rate lane" }),
];

export const pass378AssetVisualPatch = {
  INTC: { label: "Intel", glyph: "IN", primary: "#0071c5", secondary: "#071c32" },
  QCOM: { label: "Qualcomm", glyph: "QC", primary: "#3253dc", secondary: "#0b1336" },
  TXN: { label: "Texas Instruments", glyph: "TI", primary: "#cc0000", secondary: "#240303" },
  AMAT: { label: "Applied Materials", glyph: "AM", primary: "#0f62fe", secondary: "#071a3a" },
  KLAC: { label: "KLA", glyph: "KL", primary: "#9b1c31", secondary: "#24040b" },
  MRVL: { label: "Marvell", glyph: "MV", primary: "#2f6f73", secondary: "#061f20" },
  SMCI: { label: "Supermicro", glyph: "SM", primary: "#1f7a4c", secondary: "#061f12" },
  OKTA: { label: "Okta", glyph: "OK", primary: "#00297a", secondary: "#07122c" },
  FTNT: { label: "Fortinet", glyph: "FT", primary: "#e1251b", secondary: "#250403" },
  S: { label: "SentinelOne", glyph: "S1", primary: "#5b3fd6", secondary: "#120a32" },
  HON: { label: "Honeywell", glyph: "HN", primary: "#d71920", secondary: "#250304" },
  GE: { label: "GE Aerospace", glyph: "GE", primary: "#005eb8", secondary: "#061a34" },
  CAT: { label: "Caterpillar", glyph: "CT", primary: "#ffcd11", secondary: "#111827", text: "#111" },
  DE: { label: "Deere", glyph: "DE", primary: "#367c2b", secondary: "#ffde00", text: "#111" },
  RTX: { label: "RTX", glyph: "RX", primary: "#0b1320", secondary: "#a2a7ad" },
  BA: { label: "Boeing", glyph: "BA", primary: "#0033a1", secondary: "#061438" },
  DASH: { label: "DoorDash", glyph: "DD", primary: "#ff3008", secondary: "#260603" },
  RBLX: { label: "Roblox", glyph: "RB", primary: "#111827", secondary: "#d1d5db" },
  "AIR.PA": { label: "Airbus", glyph: "AI", primary: "#00205b", secondary: "#6fb6ff" },
  "SIE.DE": { label: "Siemens", glyph: "SI", primary: "#00a0a0", secondary: "#062626" },
  "DBK.DE": { label: "Deutsche Bank", glyph: "DB", primary: "#0018a8", secondary: "#061038" },
  "CS.PA": { label: "AXA", glyph: "AX", primary: "#00008f", secondary: "#ff1721" },
  EL: { label: "Estée Lauder", glyph: "EL", primary: "#d8b36a", secondary: "#1c1207" },
  "BRBY.L": { label: "Burberry", glyph: "BB", primary: "#8d704f", secondary: "#19110a" },
  CPRI: { label: "Capri", glyph: "CP", primary: "#111827", secondary: "#d8b36a" },
  "BOSS.DE": { label: "Hugo Boss", glyph: "HB", primary: "#111827", secondary: "#c7c7c7" },
  RACE: { label: "Ferrari", glyph: "FR", primary: "#dc0000", secondary: "#fff200", text: "#111" },
  "LSEG.L": { label: "LSEG", glyph: "LS", primary: "#111827", secondary: "#00a3e0" },
  CME: { label: "CME", glyph: "CM", primary: "#005eb8", secondary: "#061a34" },
  ICE: { label: "ICE", glyph: "IC", primary: "#0067b1", secondary: "#062033" },
  NDAQ: { label: "Nasdaq", glyph: "NQ", primary: "#0090d8", secondary: "#071f31" },
  "EUR/NOK": { label: "EUR NOK", glyph: "€N", primary: "#225eea", secondary: "#ba0c2f" },
  "EUR/SEK": { label: "EUR SEK", glyph: "€S", primary: "#225eea", secondary: "#006aa7" },
  "EUR/DKK": { label: "EUR DKK", glyph: "€D", primary: "#225eea", secondary: "#c60c30" },
  "USD/ILS": { label: "USD ILS", glyph: "$₪", primary: "#0f8d61", secondary: "#0038b8" },
  "USD/SAR": { label: "USD SAR", glyph: "$R", primary: "#0f8d61", secondary: "#006c35" },
  "USD/AED": { label: "USD AED", glyph: "$A", primary: "#0f8d61", secondary: "#00732f" },
  "USD/NGN": { label: "USD NGN", glyph: "$N", primary: "#0f8d61", secondary: "#008751" },
  "USD/EGP": { label: "USD EGP", glyph: "$E", primary: "#0f8d61", secondary: "#ce1126" },
  "USD/INR": { label: "USD INR", glyph: "$₹", primary: "#0f8d61", secondary: "#ff9933", text: "#111" },
  "USD/PHP": { label: "USD PHP", glyph: "$₱", primary: "#0f8d61", secondary: "#0038a8" },
  IVV: { label: "iShares Core", glyph: "IV", primary: "#111827", secondary: "#d8b36a" },
  VOO: { label: "Vanguard 500", glyph: "VO", primary: "#9b1c31", secondary: "#24040b" },
  DIA: { label: "Dow ETF", glyph: "DJ", primary: "#315bdc", secondary: "#0b1438" },
  EFA: { label: "EAFE", glyph: "EF", primary: "#315bdc", secondary: "#0b1438" },
  EWG: { label: "Germany ETF", glyph: "DE", primary: "#111827", secondary: "#ffcc00", text: "#111" },
  EWU: { label: "UK ETF", glyph: "UK", primary: "#012169", secondary: "#c8102e" },
  EWJ: { label: "Japan ETF", glyph: "JP", primary: "#f5f5f5", secondary: "#bc002d", text: "#111" },
  EWH: { label: "Hong Kong ETF", glyph: "HK", primary: "#de2910", secondary: "#ffde00", text: "#111" },
  USO: { label: "Oil ETF", glyph: "US", primary: "#0d6b3c", secondary: "#061d12" },
  UNG: { label: "Gas ETF", glyph: "NG", primary: "#ff6b00", secondary: "#2b1203" },
  DBA: { label: "Agri ETF", glyph: "AG", primary: "#8b5a2b", secondary: "#1d1007" },
  PDBC: { label: "Commodity", glyph: "PC", primary: "#7b3f00", secondary: "#1c0e03" },
  URA: { label: "Uranium ETF", glyph: "UR", primary: "#77dd77", secondary: "#102b10", text: "#071107" },
  REM: { label: "Mortgage REIT", glyph: "RE", primary: "#9b7d52", secondary: "#211407" },
  REET: { label: "Global REIT", glyph: "RT", primary: "#b99d72", secondary: "#24170d" },
  "CRE/LOAN": { label: "CRE Credit", glyph: "CR", primary: "#9b7d52", secondary: "#211407" },
  HOUSING: { label: "Housing", glyph: "HS", primary: "#b99d72", secondary: "#24170d" },
} as const;

export const pass378PseudoPricePatch: Record<string, string> = {
  INTC: "$40.80", QCOM: "$182.40", TXN: "$183.70", AMAT: "$185.90", KLAC: "$895.20", MRVL: "$84.10", SMCI: "$44.30", OKTA: "$94.20", FTNT: "$76.50", S: "$18.40", HON: "$216.30", GE: "$272.10", CAT: "$357.50", DE: "$468.20", RTX: "$182.30", BA: "$201.20", DASH: "$250.70", RBLX: "$105.20",
  "AIR.PA": "€185.60", "SIE.DE": "€221.40", "DBK.DE": "€29.20", "CS.PA": "€42.10", EL: "$101.30", "BRBY.L": "1,160p", CPRI: "$18.60", "BOSS.DE": "€39.80", RACE: "$462.50", "LSEG.L": "10,120p", CME: "$275.10", ICE: "$169.20", NDAQ: "$82.70",
  "EUR/NOK": "11.72", "EUR/SEK": "10.95", "EUR/DKK": "7.46", "USD/ILS": "3.25", "USD/SAR": "3.75", "USD/AED": "3.67", "USD/NGN": "1,535", "USD/EGP": "47.2", "USD/INR": "89.8", "USD/PHP": "58.3",
  IVV: "$682.20", VOO: "$626.80", DIA: "$485.70", EFA: "$91.30", EWG: "$39.80", EWU: "$43.20", EWJ: "$79.40", EWH: "$18.50", USO: "$78.40", UNG: "$22.80", DBA: "$26.90", PDBC: "$15.80", URA: "$43.60", REM: "$23.10", REET: "$27.80", "CRE/LOAN": "macro", HOUSING: "macro",
};

export const pass378BrainPhases = [
  { id: "identity", label: "Identity seal", seconds: 0.7, copy: "Ticker, class, language and route are locked before any output." },
  { id: "provider", label: "Provider lock", seconds: 1.0, copy: "Timestamp, cache age, fallback and second source define confidence." },
  { id: "chart", label: "Shield chart", seconds: 1.1, copy: "The same candle shell is used for crypto, stock, FX and commodity review." },
  { id: "neural", label: "Neural flow", seconds: 1.3, copy: "VLM core pulls sources into a calm field instead of debug tiles." },
  { id: "security", label: "Security bridge", seconds: 1.2, copy: "Private keys stay private; signatures and entropy are explained safely." },
  { id: "research", label: "Prime lab", seconds: 1.4, copy: "Bajak/Riemann language stays at numerical audit and replication boundary." },
  { id: "readout", label: "Human readout", seconds: 1.5, copy: "10/14/20 fields become short human copy, not repetitive filler." },
  { id: "pdf", label: "PDF mirror", seconds: 0.9, copy: "Preview and download render the same locked report object." },
] as const;

const fields = [
  { id: "identity", label: "Identity", value: "locked", copy: "Symbol and market class are fixed before generation." },
  { id: "logo", label: "Logo", value: "real/fallback", copy: "Instrument gets a visible brand mark, not an empty circle." },
  { id: "chart", label: "Chart", value: "candle shell", copy: "Real Markets uses the Shield candle shell and timeframe logic." },
  { id: "source", label: "Source", value: "timestamp first", copy: "No provider timestamp means provider-ready, not fake live." },
  { id: "second", label: "Second source", value: "compare", copy: "Strong copy waits for another provider or venue." },
  { id: "liquidity", label: "Liquidity", value: "depth/spread", copy: "Depth, spread and volume are separated from hype." },
  { id: "issuer", label: "Issuer", value: "filing lane", copy: "Stocks need company events, filings and peer context." },
  { id: "macro", label: "Macro", value: "context", copy: "FX and macro signals explain background pressure without alarm language." },
  { id: "venue", label: "Venue health", value: "separate", copy: "Exchange health stays its own table: Binance, MEXC, Coinbase, Kraken, OKX." },
  { id: "risk", label: "Risk", value: "review", copy: "Risk is review pressure, never a buy/sell command." },
  { id: "security", label: "Security", value: "public layers", copy: "Private key, signature proof, entropy and redaction are explained simply." },
  { id: "entropy", label: "Entropy", value: "validated source", copy: "RNG is quality of a physical source and tests, not magic randomness." },
  { id: "ecc", label: "ECC/BTC", value: "education", copy: "Bitcoin signing is explained without wallet-breaking instructions." },
  { id: "prime", label: "Prime lab", value: "audit", copy: "Bajak Protocol is framed as numerical reconstruction and falsification." },
  { id: "determinism", label: "Determinism", value: "hypothesis", copy: "Noise to resonance is a research visualization, not a theorem claim." },
  { id: "locale", label: "Locale", value: "PL/EN/DE", copy: "Language is chosen once for preview and PDF." },
  { id: "pdf", label: "PDF", value: "same object", copy: "Download and preview use the same facts." },
  { id: "copy", label: "Copy", value: "human", copy: "The AI avoids random filler and explains missing evidence." },
  { id: "operator", label: "Operator", value: "hidden", copy: "Sensitive heuristics and API details never render publicly." },
  { id: "launch", label: "Launch", value: "premium", copy: "The page can sound premium while keeping legal and trust boundaries." },
] as const;

export function buildPass378UnifiedReadout(input: { symbol: string; name: string; type: string; risk: number; source: string; mode: Pass378Mode }) {
  const count = input.mode === "advanced" ? 20 : input.mode === "pro" ? 14 : 10;
  const seconds = pass378BrainPhases.reduce((sum, phase) => sum + phase.seconds, 0) + (input.mode === "advanced" ? 2.1 : input.mode === "pro" ? 0.9 : 0.1);
  const band = input.risk >= 58 ? "operator-review" : input.risk >= 42 ? "provider-watch" : "clean-readout";
  return {
    version: "PASS378.unified_launch_readout",
    count,
    seconds: Number(seconds.toFixed(1)),
    band,
    headline: `${input.symbol} uses one unified Velmère audit path: Shield chart, provider truth, security, research and PDF mirror.`,
    body: `${input.name} (${input.type}) is explained through ${count} short human fields. Source lane: ${input.source}.`,
    fields: fields.slice(0, count),
  };
}

export const pass378PdfMirrorContract = {
  title: "PASS378 · Unified PDF mirror",
  rule: "Preview, Real Markets modal and downloaded PDF must be views of the same locked report object. A second generator may style copy, but must not invent new facts.",
  sections: ["identity", "chart", "provider", "second source", "security", "entropy", "ECC/BTC", "prime lab", "missing evidence", "next action"],
} as const;

export const pass378SecurityPlainLaunch = [
  "Velmère can explain bank-grade layers simply: private key stays private, signature proves control, entropy quality matters, reports are redacted and operator rules stay hidden.",
  "Real Markets may be broad, but no row gets strong live confidence until timestamp, cache age, fallback flag, OHLCV source and second-source agreement exist.",
  "Research Lab may be ambitious, but prime/Riemann/Bajak claims stay in numerical-audit, falsification and replication language until formal proof/review exists.",
] as const;

export function buildPass378MarketCoverageUniverse() {
  return pass378MarketExpansion;
}
