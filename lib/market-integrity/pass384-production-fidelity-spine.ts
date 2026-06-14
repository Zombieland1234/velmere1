import type { UniversalAssetRow } from "./universal-asset-market-matrix";

export type Pass384Mode = "basic" | "pro" | "advanced";
type VisualPatch = { label: string; glyph: string; primary: string; secondary: string; text?: string; logoUrl?: string };

function row(input: Partial<UniversalAssetRow> & Pick<UniversalAssetRow, "id" | "rank" | "symbol" | "name" | "assetClass" | "riskPressure" | "sparkTone">): UniversalAssetRow {
  const family = input.assetClass === "fx" ? "FX" : input.assetClass === "commodity" ? "commodity" : input.assetClass === "real_estate" ? "real-estate proxy" : input.assetClass === "etf" ? "ETF" : input.assetClass === "exchange_token" ? "exchange-linked" : "equity";
  return {
    sourceRhythm: input.sourceRhythm ?? `${family} provider lane · quote timestamp · OHLCV cache · fallback flag · second source`,
    priceLane: input.priceLane ?? `${family} Shield-grade candle contract: 1H / 4H / 1D / 1W with provider OHLCV once attached`,
    volumeLane: input.volumeLane ?? `${family} volume, spread, session gap, volatility and missing-data boundary`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${family} issuer/reference/methodology disclosure lane`,
    secondSourceLane: input.secondSourceLane ?? "primary provider ↔ independent reference before high confidence",
    confidenceFloor: input.confidenceFloor ?? 68,
    adapterState: input.adapterState ?? "provider_required",
    humanCopy: input.humanCopy ?? `${input.symbol} is mapped into the PASS384 production Real Markets surface: logo, candles, source truth, VLM Brain and exact PDF mirror. No fake live confidence is shown without provider evidence.`,
    nextAdapterStep: input.nextAdapterStep ?? "Attach provider key, quote time, OHLCV cache, fallback flag, issuer/reference disclosure, second-source comparison and locale-locked report object.",
    ...input,
  };
}

export const pass384ProductionFidelityContract = {
  version: "PASS384.production_fidelity_spine",
  publicRule: "One customer surface only: search, chart, AI Brain and PDF mirror. Historical PASS debug panels stay hidden as compatibility markers.",
  marketRule: "Every stock, FX pair, ETF, commodity, real-estate proxy and exchange-health row uses the same Shield grammar: logo, candle chart, timeframe, source truth, Basic/Pro/Advanced and PDF mirror.",
  aiRule: "The VLM Brain runs an animated collection path first, then returns 10/14/20 concise fields. It must not show repeated filler, raw operator thresholds or random AI copy.",
  pdfRule: "Browser preview, modal preview and downloaded PDF share the same resolved report object, locale and field order.",
  securityRule: "Public security copy explains private key boundaries, signatures, entropy quality and redacted reports without revealing operator rules or wallet-generation instructions.",
  researchRule: "Prime/Riemann material is framed as numerical audit, falsification and independent replication path until a formal proof exists.",
} as const;

export const pass384ProviderChecklist = [
  { id: "quote", label: "Quote timestamp", state: "required", copy: "Live wording appears only when the quote time and cache age are known." },
  { id: "ohlcv", label: "OHLCV candles", state: "required", copy: "Open, high, low, close and volume drive the same candle shell as Shield." },
  { id: "fallback", label: "Fallback flag", state: "visible", copy: "Preview, cache and provider outage states are visible instead of disguised as live." },
  { id: "issuer", label: "Issuer/reference", state: "mapped", copy: "Stocks use filings/company facts; FX and commodities use reference/provider methodology." },
  { id: "second", label: "Second source", state: "compare", copy: "Confidence increases only after an independent source or reference agrees." },
  { id: "pdf", label: "PDF mirror", state: "same object", copy: "The downloaded PDF cannot invent a second version of the report." },
] as const;

export const pass384BrainStages = [
  { id: "seal", label: "Identity seal", seconds: 0.8, copy: "Asset, market family, locale and visual mark are locked." },
  { id: "provider", label: "Provider lock", seconds: 1.0, copy: "Timestamp, OHLCV, cache age and fallback are checked first." },
  { id: "chart", label: "Candle forge", seconds: 1.1, copy: "The same Shield candle shell is used for crypto, stock, FX and commodities." },
  { id: "flow", label: "Neural flow", seconds: 1.6, copy: "Source, liquidity, issuer, macro and second-source lanes pass through the VLM core." },
  { id: "security", label: "Security bridge", seconds: 1.0, copy: "Signature, private-key boundary, entropy quality and redaction are translated into human copy." },
  { id: "research", label: "Prime Lab", seconds: 1.2, copy: "Bajak Protocol remains audit/falsification/replication until formal proof exists." },
  { id: "output", label: "Readout field", seconds: 1.3, copy: "Basic, Pro and Advanced return 10, 14 or 20 concise fields." },
  { id: "mirror", label: "PDF mirror", seconds: 0.8, copy: "Preview and download render the same locale-locked report object." },
] as const;

const fields = [
  { id: "identity", label: "Identity", value: "locked", copy: "Symbol, asset class and visual mark are resolved once." },
  { id: "chart", label: "Chart", value: "Shield 1:1", copy: "All markets use the same candle shell and timeframe selector." },
  { id: "provider", label: "Provider", value: "truth-first", copy: "No live confidence without timestamp, cache age and fallback state." },
  { id: "ohlcv", label: "OHLCV", value: "required", copy: "Price candles stay separate from AI wording." },
  { id: "second", label: "Second source", value: "compare", copy: "One provider is not enough for stronger conclusions." },
  { id: "risk", label: "Risk", value: "human", copy: "Risk is phrased as uncertainty and review, not a trade command." },
  { id: "issuer", label: "Issuer/ref", value: "mapped", copy: "Equities, FX, ETF, commodities and proxies use the correct reference lane." },
  { id: "security", label: "Security", value: "plain", copy: "Private keys, signatures, entropy and redaction are explained safely." },
  { id: "pdf", label: "PDF", value: "same object", copy: "Preview and download use identical logic and language." },
  { id: "copy", label: "AI copy", value: "deduped", copy: "Repeated generic text is treated as a quality blocker." },
  { id: "liquidity", label: "Liquidity", value: "separate", copy: "Depth, spread and volume do not get mixed with social hype." },
  { id: "session", label: "Session", value: "calendar", copy: "Market hours and reference dates are visible before confidence." },
  { id: "fallback", label: "Fallback", value: "visible", copy: "Fallback states reduce confidence instead of filling gaps with fake certainty." },
  { id: "macro", label: "Macro", value: "context", copy: "FX, rates, commodities and real estate are context lanes." },
  { id: "entropy", label: "Entropy", value: "quality", copy: "RNG/TRNG is explained as measured randomness, not a wallet recipe." },
  { id: "ecc", label: "ECC/BTC", value: "concept", copy: "Signature proof is explained without exposing keys or steps to attack wallets." },
  { id: "prime", label: "Prime Lab", value: "audit", copy: "Prime research is benchmark, falsification and replication." },
  { id: "operator", label: "Operator", value: "hidden", copy: "Sensitive thresholds and internal rules stay private." },
  { id: "locale", label: "Language", value: "PL/EN/DE", copy: "The selected site language controls the report output." },
  { id: "launch", label: "Launch", value: "clean", copy: "Only the newest customer-ready surface is visible." },
] as const;

export function buildPass384ProductionReadout(input: { symbol: string; name: string; type: string; risk: number; source: string; mode: Pass384Mode }) {
  const count = input.mode === "advanced" ? 20 : input.mode === "pro" ? 14 : 10;
  const seconds = pass384BrainStages.reduce((sum, stage) => sum + stage.seconds, 0) + (input.mode === "advanced" ? 2.0 : input.mode === "pro" ? 1.0 : 0.35);
  const band = input.risk >= 60 ? "operator-review" : input.risk >= 42 ? "provider-watch" : "clean-preview";
  return {
    version: "PASS384.production_readout",
    count,
    seconds: Number(seconds.toFixed(1)),
    band,
    headline: `${input.symbol} uses the production Velmère path: provider truth, Shield-grade candles, VLM Brain, security boundary, Prime Lab context and PDF mirror.`,
    body: `${input.name} (${input.type}) returns ${count} concise fields. Source lane: ${input.source}. Missing provider evidence lowers confidence instead of creating random filler.`,
    fields: fields.slice(0, count),
  };
}

export const pass384AssetVisualPatch: Record<string, VisualPatch> = {
  BRK: { label: "Berkshire", glyph: "BK", primary: "#1f2937", secondary: "#d1d5db" },
  UNH: { label: "UnitedHealth", glyph: "UH", primary: "#005eb8", secondary: "#071b35" },
  JPM: { label: "JPMorgan", glyph: "JP", primary: "#1f4e79", secondary: "#0b1320" },
  MS: { label: "Morgan Stanley", glyph: "MS", primary: "#0072ce", secondary: "#06192b" },
  SCHW: { label: "Charles Schwab", glyph: "SC", primary: "#0067b1", secondary: "#061929" },
  CME: { label: "CME Group", glyph: "CM", primary: "#004b8d", secondary: "#06192f" },
  ICE: { label: "ICE", glyph: "IC", primary: "#1f3a5f", secondary: "#050b12" },
  NDAQ: { label: "Nasdaq", glyph: "NQ", primary: "#0092bc", secondary: "#061a22" },
  LSE: { label: "LSE", glyph: "LS", primary: "#001f5b", secondary: "#050b20" },
  SGX: { label: "SGX", glyph: "SX", primary: "#ef3340", secondary: "#230508" },
  HKEX: { label: "HKEX", glyph: "HK", primary: "#e4002b", secondary: "#210307" },
  SONY: { label: "Sony", glyph: "SY", primary: "#111827", secondary: "#d1d5db" },
  TM: { label: "Toyota", glyph: "TY", primary: "#eb0a1e", secondary: "#230306" },
  SHOP: { label: "Shopify", glyph: "SH", primary: "#95bf47", secondary: "#122107", text: "#071107" },
  SQ: { label: "Block", glyph: "SQ", primary: "#111827", secondary: "#22d3ee" },
  PYPL: { label: "PayPal", glyph: "PP", primary: "#003087", secondary: "#06172d" },
  SPGI: { label: "S&P Global", glyph: "SG", primary: "#d71920", secondary: "#210506" },
  MCO: { label: "Moody's", glyph: "MD", primary: "#0f2a55", secondary: "#050b1b" },
  MSCI: { label: "MSCI", glyph: "MI", primary: "#003da5", secondary: "#061637" },
  "USD/MXN": { label: "Dollar Peso", glyph: "$M", primary: "#006847", secondary: "#ce1126" },
  "USD/SGD": { label: "Dollar Singapore", glyph: "$S", primary: "#ef3340", secondary: "#061a22" },
  "EUR/DKK": { label: "Euro Krone", glyph: "€K", primary: "#225eea", secondary: "#c60c30" },
  "USD/TRY": { label: "Dollar Lira", glyph: "$T", primary: "#e30a17", secondary: "#250404" },
  "USD/BRL": { label: "Dollar Real", glyph: "$B", primary: "#009c3b", secondary: "#002776" },
  "MXN/PLN": { label: "Peso Zloty", glyph: "MZ", primary: "#006847", secondary: "#dc143c" },
  EWJ: { label: "Japan ETF", glyph: "EJ", primary: "#bc002d", secondary: "#f7f7f7", text: "#111" },
  EWU: { label: "UK ETF", glyph: "EU", primary: "#012169", secondary: "#c8102e" },
  EWQ: { label: "France ETF", glyph: "EQ", primary: "#0055a4", secondary: "#ef4135" },
  EWG: { label: "Germany ETF", glyph: "EG", primary: "#111827", secondary: "#ffce00" },
  EEM: { label: "EM ETF", glyph: "EM", primary: "#0f766e", secondary: "#052e2b" },
  IGV: { label: "Software ETF", glyph: "IG", primary: "#2563eb", secondary: "#061637" },
  BOTZ: { label: "Robotics ETF", glyph: "BZ", primary: "#475569", secondary: "#0f172a" },
  LIT: { label: "Lithium ETF", glyph: "Li", primary: "#a7f3d0", secondary: "#064e3b", text: "#052e2b" },
  URNM: { label: "Uranium miners", glyph: "Ur", primary: "#84cc16", secondary: "#1a2e05", text: "#071107" },
  NICKEL: { label: "Nickel", glyph: "Ni", primary: "#9ca3af", secondary: "#1f2937" },
  LITHIUM: { label: "Lithium", glyph: "Li", primary: "#a7f3d0", secondary: "#064e3b", text: "#052e2b" },
  CARBON: { label: "Carbon credits", glyph: "CO", primary: "#14532d", secondary: "#052e16" },
  LOGISTICS: { label: "Logistics basket", glyph: "LG", primary: "#f59e0b", secondary: "#231507" },
  "EU-REIT": { label: "EU REIT", glyph: "ER", primary: "#b99d72", secondary: "#211407" },
  "ASIA-REIT": { label: "Asia REIT", glyph: "AR", primary: "#d8b36a", secondary: "#23150a" },
  "DATA-CENTER-REIT": { label: "Data Center REIT", glyph: "DC", primary: "#38bdf8", secondary: "#082f49" },
};

export const pass384PseudoPricePatch: Record<string, string> = {
  BRK: "$738,000", UNH: "$312.40", MS: "$168.20", SCHW: "$96.40", CME: "$281.30", ICE: "$164.90", NDAQ: "$91.20", LSE: "£94.20", SGX: "S$13.10", HKEX: "HK$411.20", SONY: "$27.30", TM: "$191.80", SHOP: "$152.70", SQ: "$84.60", PYPL: "$66.90", SPGI: "$502.20", MCO: "$468.10", MSCI: "$552.80",
  "USD/MXN": "18.24", "USD/SGD": "1.29", "EUR/DKK": "7.46", "USD/TRY": "33.10", "USD/BRL": "5.42", "MXN/PLN": "0.20",
  EWJ: "$78.30", EWU: "$37.50", EWQ: "$43.20", EWG: "$39.80", EEM: "$49.10", IGV: "$103.20", BOTZ: "$37.40", LIT: "$42.80", URNM: "$61.70", NICKEL: "$15,900", LITHIUM: "proxy", CARBON: "€74.20", LOGISTICS: "basket", "EU-REIT": "proxy", "ASIA-REIT": "proxy", "DATA-CENTER-REIT": "proxy",
};

export const pass384SecurityPlainCopy = [
  "Velmère nie prosi o seed phrase ani prywatny klucz; publicznie pokazuje tylko bezpieczny dowód, źródła i ograniczenia.",
  "Entropia i RNG są tłumaczone jako jakość losowości oraz walidacja źródła, nie jako instrukcja generowania portfela.",
  "Raport publiczny pokazuje wynik i braki; operatorowe progi, payloady i reguły pozostają ukryte.",
] as const;

export const pass384ResearchBridge = [
  { id: "banks", label: "Banki", copy: "Warstwy zaufania: podpisy, szyfrowanie, limity, HSM, audyt i kontrola sesji." },
  { id: "ecc", label: "ECC / BTC", copy: "Podpis potwierdza kontrolę bez ujawniania prywatnego sekretu." },
  { id: "rng", label: "Real RNG", copy: "Fizyczne źródła entropii muszą być mierzone i testowane przed użyciem w bezpieczeństwie." },
  { id: "prime", label: "Prime Lab", copy: "Bajak Protocol pozostaje audytem numerycznym: benchmark, falsyfikacja, replikacja." },
  { id: "pdf", label: "PDF", copy: "Ta sama historia renderuje się w podglądzie, modalu i pobranym raporcie." },
] as const;

const expansion: UniversalAssetRow[] = [
  row({ id: "brk", rank: 910, symbol: "BRK", name: "Berkshire Hathaway", assetClass: "stock", riskPressure: 25, sparkTone: "flat" }),
  row({ id: "unh", rank: 911, symbol: "UNH", name: "UnitedHealth", assetClass: "stock", riskPressure: 42, sparkTone: "watch" }),
  row({ id: "ms", rank: 912, symbol: "MS", name: "Morgan Stanley", assetClass: "stock", riskPressure: 35, sparkTone: "flat" }),
  row({ id: "schw", rank: 913, symbol: "SCHW", name: "Charles Schwab", assetClass: "stock", riskPressure: 36, sparkTone: "flat" }),
  row({ id: "cme", rank: 914, symbol: "CME", name: "CME Group", assetClass: "stock", riskPressure: 30, sparkTone: "flat" }),
  row({ id: "ice", rank: 915, symbol: "ICE", name: "Intercontinental Exchange", assetClass: "stock", riskPressure: 31, sparkTone: "flat" }),
  row({ id: "ndaq", rank: 916, symbol: "NDAQ", name: "Nasdaq", assetClass: "stock", riskPressure: 32, sparkTone: "flat" }),
  row({ id: "lse", rank: 917, symbol: "LSE", name: "London Stock Exchange Group", assetClass: "stock", riskPressure: 33, sparkTone: "flat" }),
  row({ id: "sgx", rank: 918, symbol: "SGX", name: "Singapore Exchange", assetClass: "stock", riskPressure: 34, sparkTone: "flat" }),
  row({ id: "hkex", rank: 919, symbol: "HKEX", name: "Hong Kong Exchanges", assetClass: "stock", riskPressure: 36, sparkTone: "watch" }),
  row({ id: "sony", rank: 920, symbol: "SONY", name: "Sony Group", assetClass: "stock", riskPressure: 32, sparkTone: "flat" }),
  row({ id: "tm", rank: 921, symbol: "TM", name: "Toyota", assetClass: "stock", riskPressure: 31, sparkTone: "flat" }),
  row({ id: "shop", rank: 922, symbol: "SHOP", name: "Shopify", assetClass: "stock", riskPressure: 44, sparkTone: "watch" }),
  row({ id: "sq", rank: 923, symbol: "SQ", name: "Block", assetClass: "stock", riskPressure: 47, sparkTone: "watch" }),
  row({ id: "pypl", rank: 924, symbol: "PYPL", name: "PayPal", assetClass: "stock", riskPressure: 38, sparkTone: "watch" }),
  row({ id: "spgi", rank: 925, symbol: "SPGI", name: "S&P Global", assetClass: "stock", riskPressure: 29, sparkTone: "flat" }),
  row({ id: "mco", rank: 926, symbol: "MCO", name: "Moody's", assetClass: "stock", riskPressure: 30, sparkTone: "flat" }),
  row({ id: "msci", rank: 927, symbol: "MSCI", name: "MSCI", assetClass: "stock", riskPressure: 30, sparkTone: "flat" }),
  row({ id: "usd-mxn", rank: 928, symbol: "USD/MXN", name: "Dollar / Mexican Peso", assetClass: "fx", riskPressure: 42, sparkTone: "watch" }),
  row({ id: "usd-sgd", rank: 929, symbol: "USD/SGD", name: "Dollar / Singapore Dollar", assetClass: "fx", riskPressure: 30, sparkTone: "flat" }),
  row({ id: "eur-dkk", rank: 930, symbol: "EUR/DKK", name: "Euro / Danish Krone", assetClass: "fx", riskPressure: 24, sparkTone: "flat" }),
  row({ id: "usd-try", rank: 931, symbol: "USD/TRY", name: "Dollar / Turkish Lira", assetClass: "fx", riskPressure: 58, sparkTone: "watch" }),
  row({ id: "usd-brl", rank: 932, symbol: "USD/BRL", name: "Dollar / Brazilian Real", assetClass: "fx", riskPressure: 49, sparkTone: "watch" }),
  row({ id: "mxn-pln", rank: 933, symbol: "MXN/PLN", name: "Mexican Peso / Polish Zloty", assetClass: "fx", riskPressure: 38, sparkTone: "watch" }),
  row({ id: "ewj", rank: 934, symbol: "EWJ", name: "iShares Japan ETF", assetClass: "etf", riskPressure: 34, sparkTone: "flat" }),
  row({ id: "ewu", rank: 935, symbol: "EWU", name: "iShares UK ETF", assetClass: "etf", riskPressure: 33, sparkTone: "flat" }),
  row({ id: "ewq", rank: 936, symbol: "EWQ", name: "iShares France ETF", assetClass: "etf", riskPressure: 35, sparkTone: "flat" }),
  row({ id: "ewg", rank: 937, symbol: "EWG", name: "iShares Germany ETF", assetClass: "etf", riskPressure: 34, sparkTone: "flat" }),
  row({ id: "eem", rank: 938, symbol: "EEM", name: "Emerging Markets ETF", assetClass: "etf", riskPressure: 43, sparkTone: "watch" }),
  row({ id: "igv", rank: 939, symbol: "IGV", name: "Software ETF", assetClass: "etf", riskPressure: 39, sparkTone: "watch" }),
  row({ id: "botz", rank: 940, symbol: "BOTZ", name: "Robotics and AI ETF", assetClass: "etf", riskPressure: 44, sparkTone: "watch" }),
  row({ id: "lit", rank: 941, symbol: "LIT", name: "Lithium and Battery ETF", assetClass: "etf", riskPressure: 46, sparkTone: "watch" }),
  row({ id: "urnm", rank: 942, symbol: "URNM", name: "Uranium Miners ETF", assetClass: "etf", riskPressure: 48, sparkTone: "watch" }),
  row({ id: "nickel", rank: 943, symbol: "NICKEL", name: "Nickel proxy", assetClass: "commodity", riskPressure: 46, sparkTone: "watch" }),
  row({ id: "lithium", rank: 944, symbol: "LITHIUM", name: "Lithium carbonate proxy", assetClass: "commodity", riskPressure: 50, sparkTone: "watch" }),
  row({ id: "carbon", rank: 945, symbol: "CARBON", name: "Carbon credits proxy", assetClass: "commodity", riskPressure: 42, sparkTone: "watch" }),
  row({ id: "logistics", rank: 946, symbol: "LOGISTICS", name: "Global logistics basket", assetClass: "real_estate", riskPressure: 39, sparkTone: "flat" }),
  row({ id: "eu-reit", rank: 947, symbol: "EU-REIT", name: "European REIT proxy", assetClass: "real_estate", riskPressure: 40, sparkTone: "watch" }),
  row({ id: "asia-reit", rank: 948, symbol: "ASIA-REIT", name: "Asia REIT proxy", assetClass: "real_estate", riskPressure: 41, sparkTone: "watch" }),
  row({ id: "data-center-reit", rank: 949, symbol: "DATA-CENTER-REIT", name: "Data-center REIT proxy", assetClass: "real_estate", riskPressure: 38, sparkTone: "flat" }),
];

export function buildPass384MarketCoverageUniverse() {
  return expansion;
}
