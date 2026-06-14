import type { UniversalAssetClass, UniversalAssetRow } from "./universal-asset-market-matrix";
import { buildPass396TerminalBrain, pass396TerminalParityContract, type Pass396AuditMode } from "./pass396-terminal-parity-brain";

export const PASS397_SEARCH_RUNTIME_CLOSE_EVENT = "velmere:search-runtime-close" as const;
export type Pass397AuditMode = Pass396AuditMode;
type VisualPatch = { label: string; glyph: string; primary: string; secondary: string; text?: string; logoUrl?: string };
type MarketRowInput = Partial<UniversalAssetRow> & Pick<UniversalAssetRow, "id" | "rank" | "symbol" | "name" | "assetClass" | "riskPressure" | "sparkTone">;

function family(assetClass: UniversalAssetClass) {
  if (assetClass === "fx") return "FX";
  if (assetClass === "commodity") return "commodity";
  if (assetClass === "real_estate") return "real-estate";
  if (assetClass === "etf") return "ETF";
  if (assetClass === "exchange_token") return "exchange";
  if (assetClass === "crypto") return "crypto";
  return "equity";
}

function row(input: MarketRowInput): UniversalAssetRow {
  const lane = family(input.assetClass);
  return {
    sourceRhythm: input.sourceRhythm ?? `${lane} provider-ready lane · timestamp · session calendar · cache age · fallback flag · second source`,
    priceLane: input.priceLane ?? `${lane} Shield candle mirror · 1H / 4H / 1D / 1W · no table-only preview`,
    volumeLane: input.volumeLane ?? `${lane} volume/spread/session lane separated from confidence`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${lane} issuer/reference/methodology passport lane`,
    secondSourceLane: input.secondSourceLane ?? "primary provider ↔ second source ↔ Browser PDF mirror before confidence rises",
    confidenceFloor: input.confidenceFloor ?? 80,
    adapterState: input.adapterState ?? "provider_required",
    humanCopy: input.humanCopy ?? `${input.symbol} is routed through PASS397: one search runtime, one Shield-grade modal, one Orbit 360 VLM Brain, one locale-locked PDF object.`,
    nextAdapterStep: input.nextAdapterStep ?? "Attach live provider credentials, OHLCV timestamp, cache age, fallback flag and second-source diff before public live confidence.",
    ...input,
  };
}

export const pass397UnifiedTerminalContract = {
  version: "PASS397.unified_search_pdf_brain",
  searchRule: "Browser, Shield, Shield Map and Real Markets use one close event before PDF forge, download, modal open, tab switch, row click and scroll-anchor loss.",
  marketRule: "Real Markets stays Shield-like: logo, wide row, candle modal, timeframe, Basic/Pro/Advanced and Orbit 360 VLM Brain for every provider-ready asset.",
  pdfRule: "Browser preview and downloaded PDF must read the same resolved payload, locale, symbol, section order and field count; no second copy generator.",
  brainRule: "The VLM coin collects source, OHLCV, depth, issuer proof, security boundary and research context, then collapses into 10/14/20 fields.",
  publicRule: "Premium access language can create status through proof depth and craft, but must not use fake scarcity, fake live data or price promises.",
} as const;

export const pass397BrainTimeline = [
  { id: "runtime-close", label: "close stale search", seconds: 0.24, copy: "All old portals close before a modal, PDF forge or download starts." },
  { id: "identity-lock", label: "identity lock", seconds: 0.62, copy: "Symbol, logo, route and locale resolve once." },
  { id: "ohlcv", label: "OHLCV mirror", seconds: 1.08, copy: "The same candle grammar powers Shield and Real Markets." },
  { id: "provider-proof", label: "provider proof", seconds: 1.56, copy: "Timestamp, cache age, fallback and second source stay visible." },
  { id: "neural-orbit", label: "Orbit 360 brain", seconds: 2.18, copy: "VLM coin sends blue lanes into a smooth brain shell." },
  { id: "security", label: "security boundary", seconds: 2.74, copy: "Keys, signatures, entropy and redaction stay in separate lanes." },
  { id: "research", label: "Research Lab", seconds: 3.22, copy: "Prime/RNG work remains framed as audit and replication." },
  { id: "collapse", label: "field collapse", seconds: 3.86, copy: "The brain collapses into 10, 14 or 20 concise fields." },
  { id: "pdf", label: "PDF mirror", seconds: 4.42, copy: "Preview and downloaded PDF use the same resolved object." },
] as const;

export function buildPass397UnifiedTerminalReadout(input: {
  symbol: string;
  name: string;
  type: string;
  risk: number;
  source: string;
  mode: Pass397AuditMode;
  locale?: "pl" | "en" | "de";
}) {
  const base = buildPass396TerminalBrain(input);
  const count = input.mode === "advanced" ? 20 : input.mode === "pro" ? 14 : 10;
  const locale = input.locale ?? "en";
  const localizedIntro = locale === "pl"
    ? "jeden wynik, jeden wykres, jeden mózg i jeden PDF bez losowego tekstu"
    : locale === "de"
      ? "ein Ergebnis, ein Chart, ein Brain und ein PDF ohne Zufallstext"
      : "one result, one chart, one brain and one PDF without random copy";
  const fields = base.fields.slice(0, count).map((field, index) => ({
    ...field,
    value: index === 0 ? `${input.symbol} · locked` : field.value,
    copy: index === 0
      ? `${input.name} uses ${localizedIntro}. ${pass397UnifiedTerminalContract.searchRule}`
      : field.copy,
  }));

  return {
    version: pass397UnifiedTerminalContract.version,
    count,
    seconds: base.seconds + 0.4,
    headline: `${input.symbol} · unified Shield/Real Markets brain`,
    body: `${input.mode.toUpperCase()} collects identity, candles, provider proof, security and research lanes before ${count} fields appear. ${localizedIntro}.`,
    fields,
  };
}

export const pass397AssetVisualPatch: Record<string, VisualPatch> = {
  JPM: { label: "JPMorgan Chase", glyph: "JP", primary: "#111827", secondary: "#d6b263" },
  MS: { label: "Morgan Stanley", glyph: "MS", primary: "#2563eb", secondary: "#dbeafe", text: "#111" },
  BLK: { label: "BlackRock", glyph: "BR", primary: "#111827", secondary: "#f8fafc" },
  BX: { label: "Blackstone", glyph: "BX", primary: "#111827", secondary: "#d6b263" },
  PLTR: { label: "Palantir", glyph: "PL", primary: "#111827", secondary: "#cbd5e1" },
  ARM: { label: "Arm Holdings", glyph: "AR", primary: "#0091bd", secondary: "#0b1a2a" },
  ASML: { label: "ASML", glyph: "AS", primary: "#1e3a8a", secondary: "#f97316" },
  TSM: { label: "TSMC", glyph: "TS", primary: "#e11d48", secondary: "#111827" },
  BABA: { label: "Alibaba", glyph: "BA", primary: "#ff6a00", secondary: "#111827" },
  TCEHY: { label: "Tencent", glyph: "TC", primary: "#16a34a", secondary: "#06180d" },
  SAP: { label: "SAP", glyph: "SA", primary: "#0f7ec2", secondary: "#e6f4ff", text: "#111" },
  NOVO_B: { label: "Novo Nordisk", glyph: "NN", primary: "#005eb8", secondary: "#f8fafc", text: "#111" },
  "NESN.SW": { label: "Nestle", glyph: "NE", primary: "#6b4f2a", secondary: "#f8fafc", text: "#111" },
  "ROG.SW": { label: "Roche", glyph: "RO", primary: "#0b5cab", secondary: "#f8fafc", text: "#111" },
  "NOVN.SW": { label: "Novartis", glyph: "NV", primary: "#f59e0b", secondary: "#111827" },
  "ABI.BR": { label: "AB InBev", glyph: "AB", primary: "#d6b263", secondary: "#111827" },
  "RACE.MI": { label: "Ferrari", glyph: "FR", primary: "#dc2626", secondary: "#facc15", text: "#111" },
  "MONC.MI": { label: "Moncler", glyph: "MO", primary: "#111827", secondary: "#f8fafc" },
  "SPY": { label: "S&P 500 ETF", glyph: "SP", primary: "#2563eb", secondary: "#111827" },
  "DIA": { label: "Dow Jones ETF", glyph: "DJ", primary: "#7c3aed", secondary: "#111827" },
  "IWM": { label: "Russell 2000 ETF", glyph: "IW", primary: "#0f766e", secondary: "#ecfeff", text: "#111" },
  "EEM": { label: "Emerging Markets ETF", glyph: "EM", primary: "#16a34a", secondary: "#052e16" },
  "FXI": { label: "China Large Cap ETF", glyph: "FX", primary: "#dc2626", secondary: "#facc15", text: "#111" },
  "TLT": { label: "20+ Year Treasury ETF", glyph: "TL", primary: "#64748b", secondary: "#f8fafc", text: "#111" },
  "HYG": { label: "High Yield Bond ETF", glyph: "HY", primary: "#8b5cf6", secondary: "#1e1038" },
  "UUP": { label: "US Dollar Index ETF", glyph: "DX", primary: "#16a34a", secondary: "#052e16" },
  "EUR/NOK": { label: "Euro / Norwegian Krone", glyph: "EN", primary: "#225eea", secondary: "#ba0c2f" },
  "USD/NOK": { label: "Dollar / Norwegian Krone", glyph: "UN", primary: "#0f8d61", secondary: "#ba0c2f" },
  "EUR/SEK": { label: "Euro / Swedish Krona", glyph: "ES", primary: "#225eea", secondary: "#006aa7" },
  "USD/SEK": { label: "Dollar / Swedish Krona", glyph: "US", primary: "#0f8d61", secondary: "#006aa7" },
  "USD/DKK": { label: "Dollar / Danish Krone", glyph: "DK", primary: "#0f8d61", secondary: "#c60c30" },
  "EUR/DKK": { label: "Euro / Danish Krone", glyph: "ED", primary: "#225eea", secondary: "#c60c30" },
  "NG=F": { label: "Natural Gas", glyph: "NG", primary: "#0ea5e9", secondary: "#082f49" },
  "HG=F": { label: "Copper", glyph: "CU", primary: "#b45309", secondary: "#111827" },
  "KC=F": { label: "Coffee", glyph: "CF", primary: "#7c2d12", secondary: "#f5e0c3", text: "#111" },
  "CC=F": { label: "Cocoa", glyph: "CO", primary: "#4a2c16", secondary: "#d6b263" },
  "CT=F": { label: "Cotton", glyph: "CT", primary: "#f8fafc", secondary: "#64748b", text: "#111" },
  "LIT": { label: "Lithium & Battery ETF", glyph: "LI", primary: "#67e8f9", secondary: "#083344", text: "#111" },
  "URA": { label: "Uranium ETF", glyph: "UR", primary: "#a3e635", secondary: "#1a2e05", text: "#111" },
  "WOOD": { label: "Timber ETF", glyph: "WD", primary: "#92400e", secondary: "#fef3c7", text: "#111" },
  "REET": { label: "Global REIT ETF", glyph: "RE", primary: "#a98256", secondary: "#251709" },
  "RWX": { label: "International Real Estate", glyph: "RX", primary: "#8b5cf6", secondary: "#1e1038" },
};

export const pass397PseudoPricePatch: Record<string, string> = {
  JPM: "$202.44", MS: "$101.30", BLK: "$812.60", BX: "$124.18", PLTR: "$27.70", ARM: "$132.40", ASML: "$942.00", TSM: "$168.35", BABA: "$79.90", TCEHY: "$48.20", SAP: "$188.40", NOVO_B: "DKK 742.10", "NESN.SW": "CHF 94.12", "ROG.SW": "CHF 258.30", "NOVN.SW": "CHF 92.50", "ABI.BR": "€56.20", "RACE.MI": "€382.60", "MONC.MI": "€59.90", SPY: "$527.40", DIA: "$391.80", IWM: "$205.25", EEM: "$42.30", FXI: "$26.50", TLT: "$92.14", HYG: "$77.62", UUP: "$28.42", "EUR/NOK": "11.42", "USD/NOK": "10.68", "EUR/SEK": "11.18", "USD/SEK": "10.46", "USD/DKK": "6.86", "EUR/DKK": "7.46", "NG=F": "$2.82", "HG=F": "$4.58", "KC=F": "$224.10", "CC=F": "$8,140", "CT=F": "$0.76", LIT: "$43.10", URA: "$28.90", WOOD: "$79.20", REET: "$25.64", RWX: "$25.08",
};

export function buildPass397MarketCoverageUniverse(): UniversalAssetRow[] {
  return [
    row({ id: "pass397-jpm", rank: 860, symbol: "JPM", name: "JPMorgan Chase", assetClass: "stock", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass397-ms", rank: 861, symbol: "MS", name: "Morgan Stanley", assetClass: "stock", riskPressure: 37, sparkTone: "flat" }),
    row({ id: "pass397-blk", rank: 862, symbol: "BLK", name: "BlackRock", assetClass: "stock", riskPressure: 32, sparkTone: "watch" }),
    row({ id: "pass397-bx", rank: 863, symbol: "BX", name: "Blackstone", assetClass: "stock", riskPressure: 41, sparkTone: "watch" }),
    row({ id: "pass397-pltr", rank: 864, symbol: "PLTR", name: "Palantir", assetClass: "stock", riskPressure: 49, sparkTone: "watch" }),
    row({ id: "pass397-arm", rank: 865, symbol: "ARM", name: "Arm Holdings", assetClass: "stock", riskPressure: 44, sparkTone: "watch" }),
    row({ id: "pass397-asml", rank: 866, symbol: "ASML", name: "ASML", assetClass: "stock", riskPressure: 39, sparkTone: "flat" }),
    row({ id: "pass397-tsm", rank: 867, symbol: "TSM", name: "TSMC", assetClass: "stock", riskPressure: 40, sparkTone: "flat" }),
    row({ id: "pass397-baba", rank: 868, symbol: "BABA", name: "Alibaba", assetClass: "stock", riskPressure: 55, sparkTone: "watch" }),
    row({ id: "pass397-tcehy", rank: 869, symbol: "TCEHY", name: "Tencent", assetClass: "stock", riskPressure: 52, sparkTone: "watch" }),
    row({ id: "pass397-sap", rank: 870, symbol: "SAP", name: "SAP", assetClass: "stock", riskPressure: 31, sparkTone: "flat" }),
    row({ id: "pass397-novo", rank: 871, symbol: "NOVO_B", name: "Novo Nordisk", assetClass: "stock", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass397-nesn", rank: 872, symbol: "NESN.SW", name: "Nestle", assetClass: "stock", riskPressure: 29, sparkTone: "flat" }),
    row({ id: "pass397-roche", rank: 873, symbol: "ROG.SW", name: "Roche", assetClass: "stock", riskPressure: 30, sparkTone: "flat" }),
    row({ id: "pass397-novartis", rank: 874, symbol: "NOVN.SW", name: "Novartis", assetClass: "stock", riskPressure: 30, sparkTone: "flat" }),
    row({ id: "pass397-abinbev", rank: 875, symbol: "ABI.BR", name: "AB InBev", assetClass: "stock", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass397-ferrari", rank: 876, symbol: "RACE.MI", name: "Ferrari", assetClass: "stock", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass397-moncler", rank: 877, symbol: "MONC.MI", name: "Moncler", assetClass: "stock", riskPressure: 38, sparkTone: "watch" }),
    row({ id: "pass397-spy", rank: 900, symbol: "SPY", name: "S&P 500 ETF", assetClass: "etf", riskPressure: 24, sparkTone: "flat" }),
    row({ id: "pass397-dia", rank: 901, symbol: "DIA", name: "Dow Jones ETF", assetClass: "etf", riskPressure: 23, sparkTone: "flat" }),
    row({ id: "pass397-iwm", rank: 902, symbol: "IWM", name: "Russell 2000 ETF", assetClass: "etf", riskPressure: 36, sparkTone: "watch" }),
    row({ id: "pass397-eem", rank: 903, symbol: "EEM", name: "Emerging Markets ETF", assetClass: "etf", riskPressure: 43, sparkTone: "watch" }),
    row({ id: "pass397-fxi", rank: 904, symbol: "FXI", name: "China Large Cap ETF", assetClass: "etf", riskPressure: 53, sparkTone: "watch" }),
    row({ id: "pass397-tlt", rank: 905, symbol: "TLT", name: "20+ Year Treasury ETF", assetClass: "etf", riskPressure: 39, sparkTone: "watch" }),
    row({ id: "pass397-hyg", rank: 906, symbol: "HYG", name: "High Yield Bond ETF", assetClass: "etf", riskPressure: 46, sparkTone: "watch" }),
    row({ id: "pass397-uup", rank: 907, symbol: "UUP", name: "US Dollar Index ETF", assetClass: "etf", riskPressure: 33, sparkTone: "flat" }),
    row({ id: "pass397-eurnok", rank: 930, symbol: "EUR/NOK", name: "Euro / Norwegian Krone", assetClass: "fx", riskPressure: 42, sparkTone: "watch" }),
    row({ id: "pass397-usdnok", rank: 931, symbol: "USD/NOK", name: "Dollar / Norwegian Krone", assetClass: "fx", riskPressure: 41, sparkTone: "watch" }),
    row({ id: "pass397-eursek", rank: 932, symbol: "EUR/SEK", name: "Euro / Swedish Krona", assetClass: "fx", riskPressure: 39, sparkTone: "watch" }),
    row({ id: "pass397-usdsek", rank: 933, symbol: "USD/SEK", name: "Dollar / Swedish Krona", assetClass: "fx", riskPressure: 39, sparkTone: "watch" }),
    row({ id: "pass397-usddkk", rank: 934, symbol: "USD/DKK", name: "Dollar / Danish Krone", assetClass: "fx", riskPressure: 25, sparkTone: "flat" }),
    row({ id: "pass397-eurdkk", rank: 935, symbol: "EUR/DKK", name: "Euro / Danish Krone", assetClass: "fx", riskPressure: 22, sparkTone: "flat" }),
    row({ id: "pass397-ng", rank: 960, symbol: "NG=F", name: "Natural Gas", assetClass: "commodity", riskPressure: 61, sparkTone: "watch" }),
    row({ id: "pass397-copper", rank: 961, symbol: "HG=F", name: "Copper", assetClass: "commodity", riskPressure: 45, sparkTone: "watch" }),
    row({ id: "pass397-coffee", rank: 962, symbol: "KC=F", name: "Coffee", assetClass: "commodity", riskPressure: 55, sparkTone: "watch" }),
    row({ id: "pass397-cocoa", rank: 963, symbol: "CC=F", name: "Cocoa", assetClass: "commodity", riskPressure: 66, sparkTone: "watch" }),
    row({ id: "pass397-cotton", rank: 964, symbol: "CT=F", name: "Cotton", assetClass: "commodity", riskPressure: 44, sparkTone: "flat" }),
    row({ id: "pass397-lit", rank: 990, symbol: "LIT", name: "Lithium & Battery ETF", assetClass: "etf", riskPressure: 52, sparkTone: "watch" }),
    row({ id: "pass397-ura", rank: 991, symbol: "URA", name: "Uranium ETF", assetClass: "etf", riskPressure: 58, sparkTone: "watch" }),
    row({ id: "pass397-wood", rank: 992, symbol: "WOOD", name: "Timber ETF", assetClass: "etf", riskPressure: 41, sparkTone: "flat" }),
    row({ id: "pass397-reet", rank: 1020, symbol: "REET", name: "Global REIT ETF", assetClass: "real_estate", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass397-rwx", rank: 1021, symbol: "RWX", name: "International Real Estate", assetClass: "real_estate", riskPressure: 42, sparkTone: "watch" }),
  ];
}
