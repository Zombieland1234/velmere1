import type { UniversalAssetRow } from "./universal-asset-market-matrix";
import {
  PASS400_RUNTIME_CLOSE_EVENT,
  buildPass400TerminalProofReadout,
  pass400TerminalProofContract,
  type Pass400AuditMode,
} from "./pass400-terminal-proof-engine";

export const PASS401_RUNTIME_CLOSE_EVENT = PASS400_RUNTIME_CLOSE_EVENT;

type VisualPatch = { label: string; glyph: string; primary: string; secondary: string; text?: string; logoUrl?: string };
type MarketRowInput = Partial<UniversalAssetRow> & Pick<UniversalAssetRow, "id" | "rank" | "symbol" | "name" | "assetClass" | "riskPressure" | "sparkTone">;

function laneFor(assetClass: UniversalAssetRow["assetClass"]) {
  if (assetClass === "fx") return "FX";
  if (assetClass === "commodity") return "commodity";
  if (assetClass === "real_estate") return "real-estate";
  if (assetClass === "etf") return "ETF";
  if (assetClass === "exchange_token") return "exchange";
  if (assetClass === "crypto") return "crypto";
  return "equity";
}

function row(input: MarketRowInput): UniversalAssetRow {
  const lane = laneFor(input.assetClass);
  return {
    sourceRhythm: input.sourceRhythm ?? `${lane} provider heartbeat · session calendar · reconnect state · cache-age badge · second-source drift`,
    priceLane: input.priceLane ?? `${lane} Shield mirror candles · OHLCV-ready · timeframe parity · wick/body/volume lane · no filler copy`,
    volumeLane: input.volumeLane ?? `${lane} volume, spread proxy and liquidity lane stay separate from the AI sentence`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${lane} issuer/venue/methodology/logo authority is shown before confidence`,
    secondSourceLane: input.secondSourceLane ?? "primary provider ↔ second source ↔ Browser preview ↔ PDF download exact payload",
    confidenceFloor: input.confidenceFloor ?? 86,
    adapterState: input.adapterState ?? "provider_required",
    humanCopy: input.humanCopy ?? `${input.symbol} runs through PASS401 terminal exactness: Shield-grade chart grammar, deterministic AI copy and one PDF payload.`,
    nextAdapterStep: input.nextAdapterStep ?? "Attach live OHLCV provider, logo authority, market calendar, cache-age badge and second-source drift before live confidence is raised.",
    ...input,
  };
}

export type Pass401AuditMode = Pass400AuditMode;

export const pass401TerminalExactnessMatrix = {
  version: "PASS401.terminal_exactness_matrix",
  searchRule: "Browser, Shield, Shield Map and Real Markets use one global close event before PDF forge, preview, download, modal open, tab switch and scroll.",
  marketRule: "Real Markets mirrors Shield: symbol logo, exchange-grade candles, timeframe, Basic/Pro/Advanced, Orbit 360 VLM Brain and concise field output.",
  pdfRule: "Preview and downloaded PDF are generated from one resolved payload, one locale, one section order and one deterministic copy branch.",
  brainRule: "The VLM coin gathers live/source packets into a blue neural shell, then morphs into Basic 10, Pro 14 or Advanced 20 readable fields.",
  copyRule: "No random text walls: identity, chart state, provider freshness, proof lane, security boundary and Research Lab boundary are reusable across Browser, Shield and Real Markets.",
  securityRule: "Public Security explains private-key boundary, signature proof, entropy quality, source freshness, redaction and withheld internals without exposing operational secrets.",
  launchRule: "Premium pressure is proof-first: freshness, traceability, authenticity and exact payload parity replace fake FOMO and hidden debug history.",
} as const;

export const pass401BrainTimeline = [
  { id: "close", label: "runtime close", seconds: 0.08, copy: "All floating search portals close before PDF, modal, scroll and tab actions." },
  { id: "identity", label: "asset identity", seconds: 0.28, copy: "Symbol, name, route, locale and logo lock into one resolved object." },
  { id: "candles", label: "Shield candles", seconds: 0.58, copy: "Real Stocks uses the same candle/timeframe grammar as crypto Shield." },
  { id: "provider", label: "provider truth", seconds: 0.92, copy: "Timestamp, cache age, fallback flag, provider lane and second source stay visible." },
  { id: "orbit", label: "Orbit 360", seconds: 1.34, copy: "Blue source packets travel into a stable VLM neural shell." },
  { id: "security", label: "security bridge", seconds: 1.86, copy: "Private key, signature proof, entropy quality and redaction stay separated." },
  { id: "research", label: "research lab", seconds: 2.32, copy: "Prime/RNG work is framed as audit, replication and falsification." },
  { id: "morph", label: "field morph", seconds: 2.88, copy: "The brain morphs into 10, 14 or 20 clean fields." },
  { id: "pdf", label: "PDF parity", seconds: 3.40, copy: "Preview and download keep exact locale and section order." },
  { id: "operator", label: "next proof", seconds: 3.92, copy: "The next step is one provider/security proof action, not noise." },
  { id: "launch", label: "premium proof", seconds: 4.36, copy: "Status comes from source truth, traceability and exactness." },
] as const;

const localeLine: Record<"pl" | "en" | "de", string> = {
  pl: "Jeden payload zasila terminal, podgląd i pobrany PDF: bez losowych zdań, bez powtórek i bez debugowej historii passów.",
  en: "One payload powers terminal, preview and PDF download: no random sentences, no repetition and no debug pass history.",
  de: "Ein Payload speist Terminal, Vorschau und PDF-Download: keine Zufallssätze, keine Wiederholungen und keine Debug-Pass-Historie.",
};

export function buildPass401TerminalExactnessReadout(input: {
  symbol: string;
  name: string;
  type: string;
  risk: number;
  source: string;
  mode: Pass401AuditMode;
  locale?: "pl" | "en" | "de";
}) {
  const base = buildPass400TerminalProofReadout(input);
  const count = input.mode === "advanced" ? 20 : input.mode === "pro" ? 14 : 10;
  const locale = input.locale ?? "en";
  return {
    version: pass401TerminalExactnessMatrix.version,
    count,
    seconds: Math.max(base.seconds, 4.36) + 0.14,
    headline: `${input.symbol} · terminal exactness matrix`,
    body: `${input.mode.toUpperCase()} locks search, Shield-grade candles, provider truth, Orbit 360, Security and PDF parity before ${count} fields appear. ${localeLine[locale]}`,
    fields: base.fields.slice(0, count).map((field, index) => ({
      ...field,
      value: index === 0 ? `${input.symbol} · single payload` : index === 1 ? `${input.source} · provider freshness` : index === 2 ? `${input.mode.toUpperCase()} · ${count} fields` : field.value,
      copy: index === 0 ? `${input.name}: ${pass401TerminalExactnessMatrix.pdfRule}` : index === 1 ? pass401TerminalExactnessMatrix.searchRule : index === 2 ? pass401TerminalExactnessMatrix.brainRule : field.copy,
    })),
  };
}

export const pass401AssetVisualPatch: Record<string, VisualPatch> = {
  PLTR: { label: "Palantir", glyph: "PL", primary: "#111827", secondary: "#d1d5db" },
  DDOG: { label: "Datadog", glyph: "DD", primary: "#632ca6", secondary: "#f8fafc" },
  MDB: { label: "MongoDB", glyph: "MG", primary: "#13aa52", secondary: "#111827", text: "#111" },
  SNOW: { label: "Snowflake", glyph: "SN", primary: "#29b5e8", secondary: "#111827" },
  ZS: { label: "Zscaler", glyph: "ZS", primary: "#005bea", secondary: "#111827" },
  FTNT: { label: "Fortinet", glyph: "FN", primary: "#ee3124", secondary: "#111827" },
  VRTX: { label: "Vertex", glyph: "VX", primary: "#2b2d42", secondary: "#f8fafc" },
  ISRG: { label: "Intuitive Surgical", glyph: "IS", primary: "#0067b1", secondary: "#f8fafc", text: "#111" },
  "SAP.DE": { label: "SAP", glyph: "SP", primary: "#0faaff", secondary: "#111827" },
  "MC.PA": { label: "LVMH", glyph: "LV", primary: "#111827", secondary: "#c8a45d" },
  "KER.PA": { label: "Kering", glyph: "KG", primary: "#111827", secondary: "#d1d5db" },
  "RMS.PA": { label: "Hermes", glyph: "HM", primary: "#f37021", secondary: "#111827", text: "#111" },
  "AIR.PA": { label: "Airbus", glyph: "AB", primary: "#00205b", secondary: "#f8fafc" },
  "6758.T": { label: "Sony", glyph: "SY", primary: "#111827", secondary: "#f8fafc" },
  "0700.HK": { label: "Tencent", glyph: "TC", primary: "#00a650", secondary: "#111827", text: "#111" },
  "9988.HK": { label: "Alibaba", glyph: "AB", primary: "#ff6a00", secondary: "#111827", text: "#111" },
  "USD/SGD": { label: "Dollar / Singapore Dollar", glyph: "SG", primary: "#ef3340", secondary: "#f8fafc", text: "#111" },
  "EUR/SGD": { label: "Euro / Singapore Dollar", glyph: "ES", primary: "#225eea", secondary: "#ef3340" },
  "USD/SEK": { label: "Dollar / Swedish Krona", glyph: "SE", primary: "#006aa7", secondary: "#fecc00", text: "#111" },
  "EUR/SEK": { label: "Euro / Swedish Krona", glyph: "EK", primary: "#225eea", secondary: "#fecc00" },
  "USD/NOK": { label: "Dollar / Norwegian Krone", glyph: "NO", primary: "#ba0c2f", secondary: "#00205b" },
  "EUR/NOK": { label: "Euro / Norwegian Krone", glyph: "EN", primary: "#225eea", secondary: "#ba0c2f" },
  "GBP/JPY": { label: "Pound / Yen", glyph: "GJ", primary: "#1d4ed8", secondary: "#bc002d" },
  "AUD/JPY": { label: "Australian Dollar / Yen", glyph: "AJ", primary: "#012169", secondary: "#bc002d" },
  "HG=F": { label: "Copper", glyph: "CU", primary: "#b87333", secondary: "#111827" },
  "PA=F": { label: "Palladium", glyph: "PD", primary: "#94a3b8", secondary: "#111827" },
  "PL=F": { label: "Platinum", glyph: "PT", primary: "#e5e7eb", secondary: "#111827", text: "#111" },
  "ZC=F": { label: "Corn", glyph: "CN", primary: "#facc15", secondary: "#111827", text: "#111" },
  "ZW=F": { label: "Wheat", glyph: "WH", primary: "#d6a657", secondary: "#111827", text: "#111" },
  VNQ: { label: "Vanguard Real Estate", glyph: "VQ", primary: "#8b5cf6", secondary: "#111827" },
  XLRE: { label: "Real Estate Select Sector", glyph: "XR", primary: "#475569", secondary: "#f8fafc" },
  ICF: { label: "Cohen & Steers REIT", glyph: "IC", primary: "#2563eb", secondary: "#111827" },
  RWR: { label: "SPDR Dow Jones REIT", glyph: "RW", primary: "#0f766e", secondary: "#111827" },
};

export const pass401PseudoPricePatch: Record<string, string> = {
  PLTR: "$23.70", DDOG: "$118.80", MDB: "$251.40", SNOW: "$142.30", ZS: "$184.20", FTNT: "$63.50", VRTX: "$462.10", ISRG: "$421.60", "SAP.DE": "EUR 178.40", "MC.PA": "EUR 736.20", "KER.PA": "EUR 338.50", "RMS.PA": "EUR 2,136", "AIR.PA": "EUR 151.10", "6758.T": "JPY 13,520", "0700.HK": "HKD 374.20", "9988.HK": "HKD 78.40", "USD/SGD": "1.35", "EUR/SGD": "1.45", "USD/SEK": "10.42", "EUR/SEK": "11.21", "USD/NOK": "10.58", "EUR/NOK": "11.39", "GBP/JPY": "191.20", "AUD/JPY": "98.10", "HG=F": "4.51", "PA=F": "1,012", "PL=F": "984", "ZC=F": "456", "ZW=F": "612", VNQ: "$82.20", XLRE: "$38.60", ICF: "$55.40", RWR: "$89.10",
};

export function buildPass401MarketCoverageUniverse(): UniversalAssetRow[] {
  return [
    row({ id: "pass401-palantir", rank: 1016, symbol: "PLTR", name: "Palantir", assetClass: "stock", riskPressure: 57, sparkTone: "watch" }),
    row({ id: "pass401-datadog", rank: 1017, symbol: "DDOG", name: "Datadog", assetClass: "stock", riskPressure: 46, sparkTone: "watch" }),
    row({ id: "pass401-mongodb", rank: 1018, symbol: "MDB", name: "MongoDB", assetClass: "stock", riskPressure: 49, sparkTone: "watch" }),
    row({ id: "pass401-snowflake", rank: 1019, symbol: "SNOW", name: "Snowflake", assetClass: "stock", riskPressure: 51, sparkTone: "watch" }),
    row({ id: "pass401-zscaler", rank: 1020, symbol: "ZS", name: "Zscaler", assetClass: "stock", riskPressure: 48, sparkTone: "watch" }),
    row({ id: "pass401-fortinet", rank: 1021, symbol: "FTNT", name: "Fortinet", assetClass: "stock", riskPressure: 38, sparkTone: "flat" }),
    row({ id: "pass401-vertex", rank: 1022, symbol: "VRTX", name: "Vertex Pharmaceuticals", assetClass: "stock", riskPressure: 31, sparkTone: "flat" }),
    row({ id: "pass401-isrg", rank: 1023, symbol: "ISRG", name: "Intuitive Surgical", assetClass: "stock", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass401-sap", rank: 1024, symbol: "SAP.DE", name: "SAP", assetClass: "stock", riskPressure: 30, sparkTone: "flat" }),
    row({ id: "pass401-lvmh", rank: 1025, symbol: "MC.PA", name: "LVMH", assetClass: "stock", riskPressure: 28, sparkTone: "flat" }),
    row({ id: "pass401-kering", rank: 1026, symbol: "KER.PA", name: "Kering", assetClass: "stock", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass401-hermes", rank: 1027, symbol: "RMS.PA", name: "Hermes", assetClass: "stock", riskPressure: 24, sparkTone: "flat" }),
    row({ id: "pass401-airbus", rank: 1028, symbol: "AIR.PA", name: "Airbus", assetClass: "stock", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass401-sony", rank: 1029, symbol: "6758.T", name: "Sony Group", assetClass: "stock", riskPressure: 33, sparkTone: "flat" }),
    row({ id: "pass401-tencent", rank: 1030, symbol: "0700.HK", name: "Tencent", assetClass: "stock", riskPressure: 44, sparkTone: "watch" }),
    row({ id: "pass401-alibaba", rank: 1031, symbol: "9988.HK", name: "Alibaba", assetClass: "stock", riskPressure: 48, sparkTone: "watch" }),
    row({ id: "pass401-usdsgd", rank: 1032, symbol: "USD/SGD", name: "Dollar / Singapore Dollar", assetClass: "fx", riskPressure: 29, sparkTone: "flat" }),
    row({ id: "pass401-eursgd", rank: 1033, symbol: "EUR/SGD", name: "Euro / Singapore Dollar", assetClass: "fx", riskPressure: 28, sparkTone: "flat" }),
    row({ id: "pass401-usdsek", rank: 1034, symbol: "USD/SEK", name: "Dollar / Swedish Krona", assetClass: "fx", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass401-eursek", rank: 1035, symbol: "EUR/SEK", name: "Euro / Swedish Krona", assetClass: "fx", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass401-usdnok", rank: 1036, symbol: "USD/NOK", name: "Dollar / Norwegian Krone", assetClass: "fx", riskPressure: 42, sparkTone: "watch" }),
    row({ id: "pass401-eurnok", rank: 1037, symbol: "EUR/NOK", name: "Euro / Norwegian Krone", assetClass: "fx", riskPressure: 41, sparkTone: "watch" }),
    row({ id: "pass401-gbpjpy", rank: 1038, symbol: "GBP/JPY", name: "Pound / Yen", assetClass: "fx", riskPressure: 46, sparkTone: "watch" }),
    row({ id: "pass401-audjpy", rank: 1039, symbol: "AUD/JPY", name: "Australian Dollar / Yen", assetClass: "fx", riskPressure: 43, sparkTone: "watch" }),
    row({ id: "pass401-copper", rank: 1040, symbol: "HG=F", name: "Copper Futures", assetClass: "commodity", riskPressure: 52, sparkTone: "watch" }),
    row({ id: "pass401-palladium", rank: 1041, symbol: "PA=F", name: "Palladium Futures", assetClass: "commodity", riskPressure: 56, sparkTone: "watch" }),
    row({ id: "pass401-platinum", rank: 1042, symbol: "PL=F", name: "Platinum Futures", assetClass: "commodity", riskPressure: 50, sparkTone: "watch" }),
    row({ id: "pass401-corn", rank: 1043, symbol: "ZC=F", name: "Corn Futures", assetClass: "commodity", riskPressure: 47, sparkTone: "watch" }),
    row({ id: "pass401-wheat", rank: 1044, symbol: "ZW=F", name: "Wheat Futures", assetClass: "commodity", riskPressure: 51, sparkTone: "watch" }),
    row({ id: "pass401-vnq", rank: 1045, symbol: "VNQ", name: "Vanguard Real Estate ETF", assetClass: "real_estate", riskPressure: 33, sparkTone: "flat" }),
    row({ id: "pass401-xlre", rank: 1046, symbol: "XLRE", name: "Real Estate Select Sector SPDR", assetClass: "real_estate", riskPressure: 32, sparkTone: "flat" }),
    row({ id: "pass401-icf", rank: 1047, symbol: "ICF", name: "iShares Cohen & Steers REIT ETF", assetClass: "real_estate", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass401-rwr", rank: 1048, symbol: "RWR", name: "SPDR Dow Jones REIT ETF", assetClass: "real_estate", riskPressure: 34, sparkTone: "flat" }),
  ];
}

export const pass401SecurityOnePageCopy = [
  "Public Security is simple: private keys stay private, signatures prove control and sensitive report details are redacted before export.",
  "Provider truth is separated from AI tone: timestamp, cache age, fallback flag, logo authority and second-source drift are visible before confidence.",
  "Research Lab stays framed as numerical audit, RNG/entropy review, replication and falsification rather than a public formal proof claim.",
] as const;
