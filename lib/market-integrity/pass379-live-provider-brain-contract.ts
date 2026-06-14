import type { UniversalAssetRow } from "./universal-asset-market-matrix";

export type Pass379Mode = "basic" | "pro" | "advanced";

function marketRow(input: Partial<UniversalAssetRow> & Pick<UniversalAssetRow, "id" | "rank" | "symbol" | "name" | "assetClass" | "riskPressure" | "sparkTone">): UniversalAssetRow {
  const family = input.assetClass === "fx" ? "FX" : input.assetClass === "commodity" ? "commodity" : input.assetClass === "real_estate" ? "real-estate proxy" : input.assetClass === "etf" ? "ETF" : input.assetClass === "exchange_token" ? "exchange-linked asset" : "equity";
  return {
    sourceRhythm: input.sourceRhythm ?? `${family} provider heartbeat + timestamp + cache-age + fallback flag`,
    priceLane: input.priceLane ?? `${family} OHLCV candle shell`,
    volumeLane: input.volumeLane ?? `${family} volume, spread, session gap and volatility rail`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${family} issuer/reference/methodology lane`,
    secondSourceLane: input.secondSourceLane ?? "primary provider ↔ second provider before strong confidence",
    confidenceFloor: input.confidenceFloor ?? 61,
    adapterState: input.adapterState ?? "provider_required",
    humanCopy: input.humanCopy ?? `${input.symbol} is wired for the PASS379 market brain: logo, Shield-grade candles, provider truth, Basic/Pro/Advanced readout and PDF mirror. It never pretends to be live without timestamp evidence.`,
    nextAdapterStep: input.nextAdapterStep ?? "Attach provider key, server cache, quote timestamp, fallback flag, OHLCV adapter, issuer/reference lane and second-source compare.",
    ...input,
  };
}

export const pass379LiveProviderBrainContract = {
  version: "PASS379.live_provider_brain_contract",
  publicRule: "Real Markets may list a broad global universe, but every row must clearly separate catalog coverage from live confidence.",
  chartRule: "Every stock, FX pair, ETF, commodity, real-estate proxy and exchange-health row enters the same Shield-grade modal: logo, candles, timeframe, Basic/Pro/Advanced, neural audit, short readout and PDF mirror.",
  pdfRule: "Browser preview and downloaded PDF must render the same locale-locked report object. The preview may be interactive, but the PDF must not invent different facts.",
  aiRule: "Velmère AI translates provider state into human language: what is known, what is missing, why the score is limited and what the next safe action is.",
  launchCopyRule: "Security and VLM copy can sound premium, but must avoid fake certainty, hidden investment promises and technical walls of text.",
  tiers: [
    { id: "basic", fields: 10, seconds: 5.2, copy: "identity, logo, chart, source state, risk, evidence and one next step" },
    { id: "pro", fields: 14, seconds: 7.0, copy: "adds issuer/reference lane, liquidity, second provider, macro and security explanation" },
    { id: "advanced", fields: 20, seconds: 9.7, copy: "adds provider diagnostics, entropy/ECC education, prime lab boundary, PDF parity and operator hidden layer" },
  ],
  providerFamilies: ["US equities", "EU equities", "Asia equities", "FX majors", "FX emerging", "rates/credit ETF", "commodity futures/proxies", "REIT/real estate", "exchange health"],
} as const;

export const pass379ProviderReadinessRails = [
  { id: "quote", label: "Quote timestamp", state: "required", copy: "A price without timestamp is catalog preview, not live market truth." },
  { id: "ohlcv", label: "OHLCV adapter", state: "required", copy: "The candle view must know open, high, low, close and volume or mark the lane as preview." },
  { id: "second", label: "Second source", state: "required", copy: "Strong confidence waits for a second venue/provider or reference series." },
  { id: "issuer", label: "Issuer/reference", state: "asset-specific", copy: "Stocks need filings; FX needs reference/intraday split; commodities need methodology." },
  { id: "fallback", label: "Fallback flag", state: "visible", copy: "If cache or fallback is used, the UI says so instead of pretending fresh data." },
] as const;

export const pass379AiBrainPhases = [
  { id: "intake", label: "Market intake", seconds: 0.7, copy: "Symbol, market family and locale are locked." },
  { id: "provider", label: "Provider truth", seconds: 1.1, copy: "Timestamp, cache age, fallback and second source define confidence." },
  { id: "chart", label: "Candle forge", seconds: 1.1, copy: "Shield-grade OHLCV shell is shared by crypto, stocks, FX and commodities." },
  { id: "neural", label: "VLM neural core", seconds: 1.4, copy: "Data lanes flow into one calm brain instead of public debug cards." },
  { id: "security", label: "Security bridge", seconds: 1.2, copy: "Private key, signature proof and entropy are explained without exposing secrets." },
  { id: "research", label: "Prime lab boundary", seconds: 1.4, copy: "Bajak/prime content stays at numerical audit, falsification and replication language." },
  { id: "readout", label: "Human readout", seconds: 1.6, copy: "Velmère AI writes short, asset-specific explanations and missing-evidence notes." },
  { id: "mirror", label: "PDF mirror", seconds: 1.2, copy: "Preview and download show the same facts in the selected language." },
] as const;

const pass379Fields = [
  { id: "identity", label: "Identity", value: "locked", copy: "Symbol, name and market family are fixed before the audit." },
  { id: "logo", label: "Logo", value: "resolved", copy: "Every asset gets a visible mark or premium fallback glyph." },
  { id: "chart", label: "Chart", value: "Shield shell", copy: "Candles and timeframe behave like Shield, not a separate weak table." },
  { id: "provider", label: "Provider", value: "truth first", copy: "Catalog coverage is separated from live data confidence." },
  { id: "timestamp", label: "Timestamp", value: "required", copy: "Fresh price language waits for source time and cache age." },
  { id: "fallback", label: "Fallback", value: "visible", copy: "Fallback state is shown when the adapter cannot prove freshness." },
  { id: "second", label: "Second source", value: "compare", copy: "Strong copy requires another venue, provider or reference lane." },
  { id: "liquidity", label: "Liquidity", value: "separate", copy: "Depth, spread and volume stay separate from hype or trend language." },
  { id: "issuer", label: "Issuer", value: "filings/ref", copy: "Stocks use filings; FX/commodities use reference or methodology context." },
  { id: "risk", label: "Risk", value: "review", copy: "Risk is review pressure, never a buy or sell command." },
  { id: "security", label: "Security", value: "plain", copy: "Private key, signature proof, session and redaction are explained simply." },
  { id: "entropy", label: "Entropy", value: "quality", copy: "Real RNG means tested physical entropy, not marketing randomness." },
  { id: "ecc", label: "ECC/BTC", value: "education", copy: "The page teaches key/signature basics without wallet-breaking instructions." },
  { id: "bank", label: "Bank layer", value: "analogy", copy: "Banks are shown as layered controls: limits, audit, sessions and signatures." },
  { id: "prime", label: "Prime lab", value: "audit", copy: "Prime/Riemann content is framed as reconstruction and falsification." },
  { id: "determinism", label: "Determinism", value: "research", copy: "Noise to resonance is a visual hypothesis, not a theorem claim." },
  { id: "locale", label: "Locale", value: "PL/EN/DE", copy: "Language is selected once and reused by preview and PDF." },
  { id: "pdf", label: "PDF", value: "same object", copy: "Downloaded report cannot drift away from the preview facts." },
  { id: "copy", label: "Copy", value: "human", copy: "AI avoids filler and translates missing evidence into plain language." },
  { id: "operator", label: "Operator", value: "hidden", copy: "Sensitive heuristics and API details are not exposed in public copy." },
] as const;

export function buildPass379UnifiedReadout(input: { symbol: string; name: string; type: string; risk: number; source: string; mode: Pass379Mode }) {
  const count = input.mode === "advanced" ? 20 : input.mode === "pro" ? 14 : 10;
  const seconds = pass379AiBrainPhases.reduce((sum, phase) => sum + phase.seconds, 0) + (input.mode === "advanced" ? 1.9 : input.mode === "pro" ? 0.8 : 0.2);
  const band = input.risk >= 58 ? "operator-review" : input.risk >= 42 ? "provider-watch" : "launch-ready-preview";
  return {
    version: "PASS379.live_provider_brain_readout",
    count,
    seconds: Number(seconds.toFixed(1)),
    band,
    headline: `${input.symbol} now uses the same Velmère audit path as Shield: provider truth, candle shell, security bridge, research boundary and PDF mirror.`,
    body: `${input.name} (${input.type}) shows ${count} human fields. Source lane: ${input.source}. Missing proof reduces confidence instead of creating random copy.`,
    fields: pass379Fields.slice(0, count),
  };
}

export const pass379MarketExpansion: UniversalAssetRow[] = [
  // More global equities / financial rails / market infrastructure
  marketRow({ id: "pass379-ms", rank: 401, symbol: "MS", name: "Morgan Stanley", assetClass: "stock", riskPressure: 35, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + bank capital lane" }),
  marketRow({ id: "pass379-c", rank: 402, symbol: "C", name: "Citigroup", assetClass: "stock", riskPressure: 40, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + bank exposure lane" }),
  marketRow({ id: "pass379-wfc", rank: 403, symbol: "WFC", name: "Wells Fargo", assetClass: "stock", riskPressure: 38, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + bank controls lane" }),
  marketRow({ id: "pass379-blk", rank: 404, symbol: "BLK", name: "BlackRock", assetClass: "stock", riskPressure: 28, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + asset manager lane" }),
  marketRow({ id: "pass379-bk", rank: 405, symbol: "BK", name: "BNY Mellon", assetClass: "stock", riskPressure: 27, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + custody infrastructure lane" }),
  marketRow({ id: "pass379-schw", rank: 406, symbol: "SCHW", name: "Charles Schwab", assetClass: "stock", riskPressure: 36, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + brokerage/custody lane" }),
  marketRow({ id: "pass379-msci", rank: 407, symbol: "MSCI", name: "MSCI", assetClass: "stock", riskPressure: 26, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + index infrastructure lane" }),
  marketRow({ id: "pass379-spgi", rank: 408, symbol: "SPGI", name: "S&P Global", assetClass: "stock", riskPressure: 26, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + ratings/index lane" }),
  marketRow({ id: "pass379-mco", rank: 409, symbol: "MCO", name: "Moody's", assetClass: "stock", riskPressure: 27, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + credit ratings lane" }),
  marketRow({ id: "pass379-coin2", rank: 410, symbol: "HOOD", name: "Robinhood", assetClass: "stock", riskPressure: 55, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + retail brokerage/crypto exposure lane", confidenceFloor: 54 }),
  // Europe / Asia flagship coverage
  marketRow({ id: "pass379-bnp", rank: 411, symbol: "BNP.PA", name: "BNP Paribas", assetClass: "stock", riskPressure: 34, sparkTone: "flat", proofOrDisclosureLane: "EU issuer disclosure + bank lane" }),
  marketRow({ id: "pass379-aca", rank: 412, symbol: "ACA.PA", name: "Crédit Agricole", assetClass: "stock", riskPressure: 33, sparkTone: "flat", proofOrDisclosureLane: "EU issuer disclosure + bank lane" }),
  marketRow({ id: "pass379-isp", rank: 413, symbol: "ISP.MI", name: "Intesa Sanpaolo", assetClass: "stock", riskPressure: 35, sparkTone: "flat", proofOrDisclosureLane: "EU issuer disclosure + bank lane" }),
  marketRow({ id: "pass379-san", rank: 414, symbol: "SAN.MC", name: "Banco Santander", assetClass: "stock", riskPressure: 36, sparkTone: "watch", proofOrDisclosureLane: "EU issuer disclosure + global bank lane" }),
  marketRow({ id: "pass379-hsba", rank: 415, symbol: "HSBA.L", name: "HSBC", assetClass: "stock", riskPressure: 34, sparkTone: "flat", proofOrDisclosureLane: "UK issuer disclosure + global bank lane" }),
  marketRow({ id: "pass379-barclays", rank: 416, symbol: "BARC.L", name: "Barclays", assetClass: "stock", riskPressure: 37, sparkTone: "watch", proofOrDisclosureLane: "UK issuer disclosure + investment bank lane" }),
  marketRow({ id: "pass379-toyota", rank: 417, symbol: "7203.T", name: "Toyota Motor", assetClass: "stock", riskPressure: 28, sparkTone: "flat", proofOrDisclosureLane: "JP issuer disclosure + auto lane" }),
  marketRow({ id: "pass379-sony", rank: 418, symbol: "6758.T", name: "Sony Group", assetClass: "stock", riskPressure: 31, sparkTone: "flat", proofOrDisclosureLane: "JP issuer disclosure + electronics/media lane" }),
  marketRow({ id: "pass379-samsung", rank: 419, symbol: "005930.KS", name: "Samsung Electronics", assetClass: "stock", riskPressure: 36, sparkTone: "watch", proofOrDisclosureLane: "KR issuer disclosure + semiconductors lane" }),
  marketRow({ id: "pass379-9988", rank: 420, symbol: "9988.HK", name: "Alibaba Hong Kong", assetClass: "stock", riskPressure: 48, sparkTone: "watch", proofOrDisclosureLane: "HK issuer disclosure + China internet lane" }),
  // FX / rates / credit / commodities / real estate
  marketRow({ id: "pass379-usdsek", rank: 421, symbol: "USD/SEK", name: "Dollar / Swedish Krona", assetClass: "fx", riskPressure: 37, sparkTone: "watch" }),
  marketRow({ id: "pass379-usdnok", rank: 422, symbol: "USD/NOK", name: "Dollar / Norwegian Krone", assetClass: "fx", riskPressure: 40, sparkTone: "watch" }),
  marketRow({ id: "pass379-usddkk", rank: 423, symbol: "USD/DKK", name: "Dollar / Danish Krone", assetClass: "fx", riskPressure: 29, sparkTone: "flat" }),
  marketRow({ id: "pass379-eurtry", rank: 424, symbol: "EUR/TRY", name: "Euro / Turkish Lira", assetClass: "fx", riskPressure: 61, sparkTone: "watch", confidenceFloor: 49 }),
  marketRow({ id: "pass379-usdtry", rank: 425, symbol: "USD/TRY", name: "Dollar / Turkish Lira", assetClass: "fx", riskPressure: 63, sparkTone: "watch", confidenceFloor: 48 }),
  marketRow({ id: "pass379-usdmxn", rank: 426, symbol: "USD/MXN", name: "Dollar / Mexican Peso", assetClass: "fx", riskPressure: 41, sparkTone: "watch" }),
  marketRow({ id: "pass379-usdzar", rank: 427, symbol: "USD/ZAR", name: "Dollar / South African Rand", assetClass: "fx", riskPressure: 46, sparkTone: "watch" }),
  marketRow({ id: "pass379-usdbrl", rank: 428, symbol: "USD/BRL", name: "Dollar / Brazilian Real", assetClass: "fx", riskPressure: 44, sparkTone: "watch" }),
  marketRow({ id: "pass379-bil", rank: 429, symbol: "BIL", name: "T-Bill ETF proxy", assetClass: "etf", riskPressure: 18, sparkTone: "flat", proofOrDisclosureLane: "ETF methodology + short-rate proxy lane" }),
  marketRow({ id: "pass379-shy", rank: 430, symbol: "SHY", name: "1-3 Year Treasury ETF", assetClass: "etf", riskPressure: 22, sparkTone: "flat", proofOrDisclosureLane: "ETF methodology + Treasury curve lane" }),
  marketRow({ id: "pass379-lqd", rank: 431, symbol: "LQD", name: "Investment Grade Credit ETF", assetClass: "etf", riskPressure: 34, sparkTone: "flat", proofOrDisclosureLane: "ETF methodology + credit spread lane" }),
  marketRow({ id: "pass379-junk", rank: 432, symbol: "JNK", name: "High Yield Bond ETF", assetClass: "etf", riskPressure: 45, sparkTone: "watch", proofOrDisclosureLane: "ETF methodology + credit stress lane" }),
  marketRow({ id: "pass379-vixy", rank: 433, symbol: "VIXY", name: "Volatility Futures ETF", assetClass: "etf", riskPressure: 65, sparkTone: "watch", proofOrDisclosureLane: "ETF methodology + volatility futures lane", confidenceFloor: 49 }),
  marketRow({ id: "pass379-palladium", rank: 434, symbol: "PALLADIUM", name: "Palladium", assetClass: "commodity", riskPressure: 42, sparkTone: "watch", proofOrDisclosureLane: "metal spot/futures methodology lane" }),
  marketRow({ id: "pass379-heatingoil", rank: 435, symbol: "HEATINGOIL", name: "Heating Oil", assetClass: "commodity", riskPressure: 47, sparkTone: "watch", proofOrDisclosureLane: "energy futures methodology lane" }),
  marketRow({ id: "pass379-rbob", rank: 436, symbol: "RBOB", name: "Gasoline futures proxy", assetClass: "commodity", riskPressure: 46, sparkTone: "watch", proofOrDisclosureLane: "energy futures methodology lane" }),
  marketRow({ id: "pass379-lumber", rank: 437, symbol: "LUMBER", name: "Lumber", assetClass: "commodity", riskPressure: 48, sparkTone: "watch", proofOrDisclosureLane: "building materials futures/proxy lane" }),
  marketRow({ id: "pass379-mortgage", rank: 438, symbol: "MORTGAGE", name: "Mortgage rate proxy", assetClass: "real_estate", riskPressure: 43, sparkTone: "watch", adapterState: "slow_macro", proofOrDisclosureLane: "macro release + housing credit lane" }),
  marketRow({ id: "pass379-cre", rank: 439, symbol: "CRE-STRESS", name: "Commercial real-estate stress proxy", assetClass: "real_estate", riskPressure: 55, sparkTone: "watch", adapterState: "slow_macro", proofOrDisclosureLane: "REIT/credit spread + slow macro lane", confidenceFloor: 50 }),
  marketRow({ id: "pass379-homebuilder", rank: 440, symbol: "HOMEBUILD", name: "Homebuilder sentiment proxy", assetClass: "real_estate", riskPressure: 42, sparkTone: "watch", adapterState: "slow_macro", proofOrDisclosureLane: "housing sentiment + builder ETF proxy lane" }),
];

export const pass379AssetVisualPatch: Record<string, { label: string; glyph: string; primary: string; secondary: string; text?: string }> = {
  MS: { label: "Morgan Stanley", glyph: "MS", primary: "#1f4b7a", secondary: "#081928" },
  C: { label: "Citigroup", glyph: "C", primary: "#004b93", secondary: "#d71920" },
  WFC: { label: "Wells Fargo", glyph: "WF", primary: "#d71920", secondary: "#ffcc00", text: "#111" },
  BLK: { label: "BlackRock", glyph: "BR", primary: "#111827", secondary: "#d8b36a" },
  BK: { label: "BNY Mellon", glyph: "BK", primary: "#1f4b7a", secondary: "#071728" },
  SCHW: { label: "Schwab", glyph: "SW", primary: "#005cb9", secondary: "#06223f" },
  MSCI: { label: "MSCI", glyph: "MI", primary: "#002b5c", secondary: "#3aa7ff" },
  SPGI: { label: "S&P Global", glyph: "SP", primary: "#d6001c", secondary: "#111827" },
  MCO: { label: "Moody's", glyph: "MO", primary: "#003b71", secondary: "#071728" },
  HOOD: { label: "Robinhood", glyph: "RH", primary: "#00c805", secondary: "#071407", text: "#071407" },
  "BNP.PA": { label: "BNP Paribas", glyph: "BN", primary: "#008578", secondary: "#052721" },
  "ACA.PA": { label: "Crédit Agricole", glyph: "CA", primary: "#006a4e", secondary: "#06231b" },
  "ISP.MI": { label: "Intesa", glyph: "IS", primary: "#00a3e0", secondary: "#f58220" },
  "SAN.MC": { label: "Santander", glyph: "SA", primary: "#ec0000", secondary: "#2d0303" },
  "HSBA.L": { label: "HSBC", glyph: "HS", primary: "#db0011", secondary: "#111827" },
  "BARC.L": { label: "Barclays", glyph: "BC", primary: "#00aeef", secondary: "#062433" },
  "7203.T": { label: "Toyota", glyph: "TY", primary: "#eb0a1e", secondary: "#111827" },
  "6758.T": { label: "Sony", glyph: "SN", primary: "#111827", secondary: "#5c6b80" },
  "005930.KS": { label: "Samsung", glyph: "SS", primary: "#1428a0", secondary: "#07103a" },
  "9988.HK": { label: "Alibaba HK", glyph: "HK", primary: "#ff6a00", secondary: "#2b1204" },
  "USD/SEK": { label: "USD SEK", glyph: "$S", primary: "#0f8d61", secondary: "#006aa7" },
  "USD/NOK": { label: "USD NOK", glyph: "$N", primary: "#0f8d61", secondary: "#ba0c2f" },
  "USD/DKK": { label: "USD DKK", glyph: "$D", primary: "#0f8d61", secondary: "#c60c30" },
  "EUR/TRY": { label: "EUR TRY", glyph: "€₺", primary: "#225eea", secondary: "#e30a17" },
  "USD/TRY": { label: "USD TRY", glyph: "$₺", primary: "#0f8d61", secondary: "#e30a17" },
  "USD/MXN": { label: "USD MXN", glyph: "$M", primary: "#0f8d61", secondary: "#006847" },
  "USD/ZAR": { label: "USD ZAR", glyph: "$Z", primary: "#0f8d61", secondary: "#007a4d" },
  "USD/BRL": { label: "USD BRL", glyph: "$B", primary: "#0f8d61", secondary: "#009739" },
  BIL: { label: "T-Bill", glyph: "BI", primary: "#315bdc", secondary: "#0b1438" },
  SHY: { label: "Treasury", glyph: "SH", primary: "#315bdc", secondary: "#0b1438" },
  LQD: { label: "IG Credit", glyph: "LQ", primary: "#315bdc", secondary: "#0b1438" },
  JNK: { label: "HY Credit", glyph: "HY", primary: "#d8b36a", secondary: "#271808" },
  VIXY: { label: "Volatility", glyph: "VX", primary: "#6d28d9", secondary: "#160c2d" },
  PALLADIUM: { label: "Palladium", glyph: "Pd", primary: "#d6d6d6", secondary: "#4b5563", text: "#111" },
  HEATINGOIL: { label: "Heating Oil", glyph: "HO", primary: "#0d6b3c", secondary: "#061d12" },
  RBOB: { label: "Gasoline", glyph: "RB", primary: "#ff6b00", secondary: "#2b1203" },
  LUMBER: { label: "Lumber", glyph: "Lm", primary: "#8b5a2b", secondary: "#211407" },
  MORTGAGE: { label: "Mortgage", glyph: "MR", primary: "#b99d72", secondary: "#24170d" },
  "CRE-STRESS": { label: "CRE stress", glyph: "CR", primary: "#9b7d52", secondary: "#211407" },
  HOMEBUILD: { label: "Homebuild", glyph: "HB", primary: "#b99d72", secondary: "#24170d" },
};

export const pass379PseudoPricePatch: Record<string, string> = {
  MS: "$168.20", C: "$101.40", WFC: "$82.70", BLK: "$1,185", BK: "$111.30", SCHW: "$98.40", MSCI: "$610.20", SPGI: "$574.60", MCO: "$510.30", HOOD: "$125.20",
  "BNP.PA": "€79.20", "ACA.PA": "€18.40", "ISP.MI": "€5.95", "SAN.MC": "€8.92", "HSBA.L": "985p", "BARC.L": "385p", "7203.T": "¥3,120", "6758.T": "¥4,180", "005930.KS": "₩92,400", "9988.HK": "HK$171.80",
  "USD/SEK": "9.41", "USD/NOK": "10.07", "USD/DKK": "6.41", "EUR/TRY": "57.90", "USD/TRY": "49.80", "USD/MXN": "18.20", "USD/ZAR": "17.05", "USD/BRL": "5.45",
  BIL: "$91.90", SHY: "$82.70", LQD: "$111.40", JNK: "$97.80", VIXY: "$12.40", PALLADIUM: "$1,460", HEATINGOIL: "$2.45", RBOB: "$2.05", LUMBER: "$612", MORTGAGE: "macro", "CRE-STRESS": "macro", HOMEBUILD: "macro",
};

export const pass379PdfMirror = {
  title: "PASS379 · Live provider brain mirror",
  rule: "Preview, modal and downloaded PDF render the same resolved report fields: identity, provider state, source freshness, chart status, security boundary and research boundary.",
  sections: ["identity", "provider", "timestamp", "fallback", "second source", "chart", "security", "entropy", "ECC/BTC", "prime lab", "missing evidence", "next step"],
} as const;

export const pass379SecurityPlainCopy = [
  "Velmère explains security as layers: private keys stay private, signatures prove control, sessions and rate limits reduce abuse, and reports are redacted before public display.",
  "Real-world entropy means a physical randomness source plus validation. Velmère can teach why randomness matters without generating or exposing secrets.",
  "Real Markets is broad, but live confidence only appears after timestamp, cache age, fallback state, OHLCV adapter and second-source checks are present.",
] as const;

export function buildPass379MarketCoverageUniverse() {
  return pass379MarketExpansion;
}
