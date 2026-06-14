import type { UniversalAssetRow } from "./universal-asset-market-matrix";
import {
  PASS410_RUNTIME_CLOSE_EVENT,
  buildPass410TerminalLiveParityReadout,
  pass410TerminalLiveParityOrbit,
  type Pass410AuditMode,
} from "./pass410-terminal-live-parity-orbit";

export const PASS411_RUNTIME_CLOSE_EVENT = "velmere:pass411:terminal-source-equalizer-orbit-close";
export type Pass411AuditMode = Pass410AuditMode;
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
    sourceRhythm: input.sourceRhythm ?? `${lane} provider cadence · PASS411 source equalizer · reconnect guard · payload checksum · locale mirror`,
    priceLane: input.priceLane ?? `${lane} Shield-grade OHLCV · candle body/wick/volume grammar · same chart modal as crypto`,
    volumeLane: input.volumeLane ?? `${lane} liquidity, spread, session calendar, fallback flag and data-age lane remain visible before AI summary`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${lane} icon authority, venue/issuer, methodology, provider timestamp and second source are shown before confidence`,
    secondSourceLane: input.secondSourceLane ?? "primary provider ↔ second source ↔ source equalizer ↔ Orbit Brain ↔ preview ↔ downloaded PDF ↔ checksum ↔ locale",
    confidenceFloor: input.confidenceFloor ?? 95,
    adapterState: input.adapterState ?? "provider_required",
    humanCopy: input.humanCopy ?? `${input.symbol} is routed through PASS411: source-equalized payload, Shield-grade chart modal, Orbit 360 VLM Brain and exact locale mirror across preview and PDF download.`,
    nextAdapterStep: input.nextAdapterStep ?? "Wire official provider feed, logo authority, session calendar, second-source drift, reconnect state and checksum before marking this row as truly live.",
    ...input,
  };
}

export const pass411TerminalSourceEqualizerOrbit = {
  version: "PASS411.terminal_source_equalizer_orbit",
  runtimeRule: "Browser, Shield, Shield Map and Real Markets share one close bus before suggestions, modal, PDF preview, download, scroll, tab switch and route handoff.",
  marketRule: "Real Markets cannot render weaker than Shield: every stock, FX, ETF, commodity and real-estate row opens the same chart-first modal, Basic/Pro/Advanced depth and Orbit 360 Brain output.",
  pdfRule: "Lens preview and downloaded PDF must use the same resolved payload, locale, field order, source lineage, checksum, title and short copy; no separate random report generator is allowed.",
  brainRule: "The VLM coin absorbs provider state, OHLCV state, source lineage, second-source drift, security boundary and research boundary, then morphs into Basic 10, Pro 14 or Advanced 20 fields.",
  aiRule: "Velmere AI writes from resolved facts only: source state, data age, market lane, proof lane, security boundary, research boundary and next verification step.",
  securityRule: "Public security copy stays simple: private-key boundary, signature proof, entropy quality, redaction, source truth and withheld internal methods.",
  researchRule: "Prime/RNG/Riemann-side research is framed as experimental audit, replication and falsification; it is not presented as a proven cryptographic breakthrough.",
  launchRule: "Premium pressure comes from precision, traceability and clean access language, never from debug pass-history, fake live status or profit promises.",
  inheritedCloseBus: PASS410_RUNTIME_CLOSE_EVENT,
  previousVersion: pass410TerminalLiveParityOrbit.version,
} as const;

export const pass411SourceEqualizerTimeline = [
  { id: "close", label: "close bus", seconds: 0.02, copy: "All suggestion layers close before modal, preview, PDF download, scroll and route handoff." },
  { id: "resolve", label: "resolve once", seconds: 0.08, copy: "Symbol, locale, title, asset lane, provider state and field order resolve once." },
  { id: "lineage", label: "source lineage", seconds: 0.16, copy: "Primary provider, second source, fallback state, cache age and checksum are attached before AI copy." },
  { id: "icon", label: "icon authority", seconds: 0.28, copy: "Real assets receive deterministic visual identity while provider logo authority remains a production boundary." },
  { id: "candles", label: "Shield candles", seconds: 0.44, copy: "Stocks, FX, ETF, commodities and REITs use the same candle grammar and timeframe control as Shield crypto." },
  { id: "calendar", label: "calendar guard", seconds: 0.62, copy: "Market sessions are separated from AI tone so stale or closed-market data never looks live." },
  { id: "second", label: "second source", seconds: 0.86, copy: "Second-source drift is a visible field before confidence can rise." },
  { id: "orbit", label: "VLM Orbit Brain", seconds: 1.18, copy: "Blue packets feed the VLM coin and neural shell instead of random cards." },
  { id: "mode", label: "depth mode", seconds: 1.54, copy: "Basic, Pro and Advanced are the same workflow with 10, 14 or 20 fields." },
  { id: "security", label: "security boundary", seconds: 1.92, copy: "Private keys and internal scoring methods remain withheld while public proof lanes stay readable." },
  { id: "research", label: "research boundary", seconds: 2.32, copy: "Mathematical research remains audit/replication/falsification until independently reviewed." },
  { id: "locale", label: "locale mirror", seconds: 2.76, copy: "PL, EN and DE copy resolve once and mirror into preview and downloaded PDF." },
  { id: "pdf", label: "PDF parity", seconds: 3.20, copy: "Preview and download share the same payload, order, language and checksum." },
  { id: "morph", label: "field morph", seconds: 3.72, copy: "The brain morphs into a clean field board instead of stacked debug tiles." },
  { id: "seal", label: "equalizer seal", seconds: 4.28, copy: "The newest public terminal shows source, chart, proof, boundary and next verification step only." },
] as const;

const localeLine: Record<"pl" | "en" | "de", string> = {
  pl: "Jeden payload zasila wyszukiwarkę, modal, Orbit Brain, podgląd i pobrany PDF. AI może opisać tylko źródło, wykres, dowód, granice i następny krok w wybranym języku.",
  en: "One payload powers search, modal, Orbit Brain, preview and downloaded PDF. AI may describe only source, chart, proof, boundaries and next step in the selected language.",
  de: "Ein Payload speist Suche, Modal, Orbit Brain, Vorschau und PDF. Die KI beschreibt nur Quelle, Chart, Nachweis, Grenzen und nächsten Schritt in der gewählten Sprache.",
};

export function buildPass411TerminalSourceEqualizerReadout(input: {
  symbol: string;
  name: string;
  type: string;
  risk: number;
  source: string;
  mode: Pass411AuditMode;
  locale?: "pl" | "en" | "de";
}) {
  const base = buildPass410TerminalLiveParityReadout(input);
  const count = input.mode === "advanced" ? 20 : input.mode === "pro" ? 14 : 10;
  const locale = input.locale ?? "en";
  const overrides = [
    { value: `${input.symbol} · source equalized`, copy: `${input.name}: ${pass411TerminalSourceEqualizerOrbit.pdfRule}` },
    { value: `${input.source} · lineage visible`, copy: pass411TerminalSourceEqualizerOrbit.runtimeRule },
    { value: `${input.mode.toUpperCase()} · ${count} fields`, copy: pass411TerminalSourceEqualizerOrbit.brainRule },
    { value: `${input.type} · Shield parity`, copy: pass411TerminalSourceEqualizerOrbit.marketRule },
    { value: `${locale.toUpperCase()} · exact mirror`, copy: localeLine[locale] },
    { value: "preview = download", copy: "Preview, downloaded PDF and modal use one field order and one payload checksum." },
    { value: "AI source-bound", copy: pass411TerminalSourceEqualizerOrbit.aiRule },
    { value: "calendar guarded", copy: "Closed-session, stale or fallback values stay marked before any public summary." },
    { value: "security readable", copy: pass411TerminalSourceEqualizerOrbit.securityRule },
    { value: "research honest", copy: pass411TerminalSourceEqualizerOrbit.researchRule },
  ];
  return {
    version: pass411TerminalSourceEqualizerOrbit.version,
    count,
    seconds: Math.max(base.seconds, 4.28) + 0.41,
    headline: `${input.symbol} · source equalizer orbit`,
    body: `${input.mode.toUpperCase()} uses one source-equalized payload, one Shield-grade chart modal, one Orbit 360 VLM Brain and one locale-exact PDF mirror before ${count} fields appear. ${localeLine[locale]}`,
    fields: base.fields.slice(0, count).map((field, index) => ({
      ...field,
      value: overrides[index]?.value ?? field.value,
      copy: overrides[index]?.copy ?? field.copy,
    })),
  };
}

export const pass411AssetVisualPatch: Record<string, VisualPatch> = {
  "ASML": { label: "ASML", glyph: "AS", primary: "#f97316", secondary: "#111827" },
  "SAP.DE": { label: "SAP", glyph: "SAP", primary: "#0f62fe", secondary: "#f8fafc" },
  "SU.PA": { label: "Schneider Electric", glyph: "SE", primary: "#16a34a", secondary: "#111827" },
  "KER.PA": { label: "Kering", glyph: "KG", primary: "#111827", secondary: "#d6b56d" },
  "OR.PA": { label: "L'Oreal", glyph: "OR", primary: "#111827", secondary: "#f8fafc" },
  "AIR.PA": { label: "Airbus", glyph: "AI", primary: "#00205b", secondary: "#93c5fd" },
  "7203.T": { label: "Toyota", glyph: "TY", primary: "#eb0a1e", secondary: "#111827" },
  "6758.T": { label: "Sony", glyph: "SO", primary: "#f8fafc", secondary: "#111827", text: "#111" },
  "SHOP.TO": { label: "Shopify Toronto", glyph: "SH", primary: "#95bf47", secondary: "#111827", text: "#111" },
  "RY.TO": { label: "Royal Bank of Canada", glyph: "RY", primary: "#0051a5", secondary: "#f8fafc" },
  "TD.TO": { label: "TD Bank", glyph: "TD", primary: "#008a00", secondary: "#f8fafc" },
  "USD/MXN": { label: "Dollar / Mexican Peso", glyph: "MXN", primary: "#16a34a", secondary: "#dc2626" },
  "EUR/CHF": { label: "Euro / Swiss Franc", glyph: "CHF", primary: "#2563eb", secondary: "#dc2626" },
  "GBP/JPY": { label: "Pound / Yen", glyph: "JPY", primary: "#0f172a", secondary: "#f8fafc" },
  "AUD/JPY": { label: "Aussie / Yen", glyph: "JPY", primary: "#0ea5e9", secondary: "#f8fafc" },
  "USD/ZAR": { label: "Dollar / Rand", glyph: "ZAR", primary: "#111827", secondary: "#facc15" },
  "CORN=F": { label: "Corn Futures", glyph: "CRN", primary: "#facc15", secondary: "#854d0e", text: "#111" },
  "SOYBEAN=F": { label: "Soybean Futures", glyph: "SOY", primary: "#65a30d", secondary: "#111827" },
  "COFFEE=F": { label: "Coffee Futures", glyph: "COF", primary: "#7c2d12", secondary: "#f8fafc" },
  "COCOA=F": { label: "Cocoa Futures", glyph: "CCA", primary: "#3f1d0b", secondary: "#facc15" },
  "COPPER=F": { label: "Copper Futures", glyph: "CU", primary: "#b45309", secondary: "#111827" },
  "VNQ": { label: "Vanguard Real Estate ETF", glyph: "VNQ", primary: "#166534", secondary: "#f8fafc" },
  "IYR": { label: "iShares US Real Estate", glyph: "IYR", primary: "#0f766e", secondary: "#f8fafc" },
  "REET": { label: "iShares Global REIT", glyph: "RET", primary: "#064e3b", secondary: "#f8fafc" },
  "EEM": { label: "iShares Emerging Markets", glyph: "EEM", primary: "#1d4ed8", secondary: "#f8fafc" },
  "EWG": { label: "iShares Germany", glyph: "DE", primary: "#111827", secondary: "#facc15" },
  "EWQ": { label: "iShares France", glyph: "FR", primary: "#2563eb", secondary: "#f8fafc" },
  "EWC": { label: "iShares Canada", glyph: "CA", primary: "#dc2626", secondary: "#f8fafc" },
  "BOTZ": { label: "Global X Robotics", glyph: "BZ", primary: "#111827", secondary: "#38bdf8" },
  "CIBR": { label: "NASDAQ Cybersecurity ETF", glyph: "CB", primary: "#0f172a", secondary: "#60a5fa" },
  "HACK": { label: "Amplify Cybersecurity ETF", glyph: "HK", primary: "#111827", secondary: "#22c55e" },
};

export const pass411PseudoPricePatch: Record<string, string> = {
  "ASML": "€906.40", "SAP.DE": "€187.30", "SU.PA": "€219.80", "KER.PA": "€336.50", "OR.PA": "€441.90", "AIR.PA": "€151.40", "7203.T": "¥3,280", "6758.T": "¥13,240", "SHOP.TO": "C$92.10", "RY.TO": "C$138.60", "TD.TO": "C$78.40", "USD/MXN": "17.08", "EUR/CHF": "0.97", "GBP/JPY": "191.40", "AUD/JPY": "98.10", "USD/ZAR": "18.44", "CORN=F": "$465", "SOYBEAN=F": "$1,176", "COFFEE=F": "$224", "COCOA=F": "$7,820", "COPPER=F": "$4.52", "VNQ": "$84.20", "IYR": "$88.10", "REET": "$24.80", "EEM": "$42.30", "EWG": "$31.20", "EWQ": "$39.10", "EWC": "$37.80", "BOTZ": "$31.70", "CIBR": "$58.40", "HACK": "$63.10",
};

export function buildPass411MarketCoverageUniverse(): UniversalAssetRow[] {
  return [
    row({ id: "pass411-asml", rank: 1321, symbol: "ASML", name: "ASML Holding", assetClass: "stock", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass411-sap", rank: 1322, symbol: "SAP.DE", name: "SAP", assetClass: "stock", riskPressure: 31, sparkTone: "flat" }),
    row({ id: "pass411-schneider", rank: 1323, symbol: "SU.PA", name: "Schneider Electric", assetClass: "stock", riskPressure: 32, sparkTone: "flat" }),
    row({ id: "pass411-kering", rank: 1324, symbol: "KER.PA", name: "Kering", assetClass: "stock", riskPressure: 39, sparkTone: "watch" }),
    row({ id: "pass411-loreal", rank: 1325, symbol: "OR.PA", name: "L'Oreal", assetClass: "stock", riskPressure: 30, sparkTone: "flat" }),
    row({ id: "pass411-airbus", rank: 1326, symbol: "AIR.PA", name: "Airbus", assetClass: "stock", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass411-toyota", rank: 1327, symbol: "7203.T", name: "Toyota Motor", assetClass: "stock", riskPressure: 33, sparkTone: "flat" }),
    row({ id: "pass411-sony", rank: 1328, symbol: "6758.T", name: "Sony Group", assetClass: "stock", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass411-shopify-toronto", rank: 1329, symbol: "SHOP.TO", name: "Shopify Toronto", assetClass: "stock", riskPressure: 42, sparkTone: "watch" }),
    row({ id: "pass411-rbc", rank: 1330, symbol: "RY.TO", name: "Royal Bank of Canada", assetClass: "stock", riskPressure: 31, sparkTone: "flat" }),
    row({ id: "pass411-td-bank", rank: 1331, symbol: "TD.TO", name: "TD Bank", assetClass: "stock", riskPressure: 32, sparkTone: "flat" }),
    row({ id: "pass411-usdmxn", rank: 1332, symbol: "USD/MXN", name: "Dollar / Mexican Peso", assetClass: "fx", riskPressure: 39, sparkTone: "watch" }),
    row({ id: "pass411-eurchf", rank: 1333, symbol: "EUR/CHF", name: "Euro / Swiss Franc", assetClass: "fx", riskPressure: 28, sparkTone: "flat" }),
    row({ id: "pass411-gbpjpy", rank: 1334, symbol: "GBP/JPY", name: "Pound Sterling / Japanese Yen", assetClass: "fx", riskPressure: 45, sparkTone: "watch" }),
    row({ id: "pass411-audjpy", rank: 1335, symbol: "AUD/JPY", name: "Australian Dollar / Japanese Yen", assetClass: "fx", riskPressure: 43, sparkTone: "watch" }),
    row({ id: "pass411-usdzar", rank: 1336, symbol: "USD/ZAR", name: "Dollar / South African Rand", assetClass: "fx", riskPressure: 48, sparkTone: "watch" }),
    row({ id: "pass411-corn", rank: 1337, symbol: "CORN=F", name: "Corn Futures", assetClass: "commodity", riskPressure: 43, sparkTone: "watch" }),
    row({ id: "pass411-soybean", rank: 1338, symbol: "SOYBEAN=F", name: "Soybean Futures", assetClass: "commodity", riskPressure: 44, sparkTone: "watch" }),
    row({ id: "pass411-coffee", rank: 1339, symbol: "COFFEE=F", name: "Coffee Futures", assetClass: "commodity", riskPressure: 49, sparkTone: "watch" }),
    row({ id: "pass411-cocoa", rank: 1340, symbol: "COCOA=F", name: "Cocoa Futures", assetClass: "commodity", riskPressure: 55, sparkTone: "watch" }),
    row({ id: "pass411-copper", rank: 1341, symbol: "COPPER=F", name: "Copper Futures", assetClass: "commodity", riskPressure: 42, sparkTone: "watch" }),
    row({ id: "pass411-vnq", rank: 1342, symbol: "VNQ", name: "Vanguard Real Estate ETF", assetClass: "real_estate", riskPressure: 33, sparkTone: "flat" }),
    row({ id: "pass411-iyr", rank: 1343, symbol: "IYR", name: "iShares US Real Estate", assetClass: "real_estate", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass411-reet", rank: 1344, symbol: "REET", name: "iShares Global REIT", assetClass: "real_estate", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass411-eem", rank: 1345, symbol: "EEM", name: "iShares Emerging Markets ETF", assetClass: "etf", riskPressure: 44, sparkTone: "watch" }),
    row({ id: "pass411-ewg", rank: 1346, symbol: "EWG", name: "iShares MSCI Germany ETF", assetClass: "etf", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass411-ewq", rank: 1347, symbol: "EWQ", name: "iShares MSCI France ETF", assetClass: "etf", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass411-ewc", rank: 1348, symbol: "EWC", name: "iShares MSCI Canada ETF", assetClass: "etf", riskPressure: 33, sparkTone: "flat" }),
    row({ id: "pass411-botz", rank: 1349, symbol: "BOTZ", name: "Global X Robotics & AI ETF", assetClass: "etf", riskPressure: 43, sparkTone: "watch" }),
    row({ id: "pass411-cibr", rank: 1350, symbol: "CIBR", name: "NASDAQ Cybersecurity ETF", assetClass: "etf", riskPressure: 37, sparkTone: "flat" }),
    row({ id: "pass411-hack", rank: 1351, symbol: "HACK", name: "Amplify Cybersecurity ETF", assetClass: "etf", riskPressure: 38, sparkTone: "flat" }),
  ];
}

export const pass411SecurityOnePageCopy = [
  "Security page copy is intentionally simple: private keys never enter reports, signatures are verified through public boundaries, sensitive internals stay withheld.",
  "The user sees what matters: source class, provider age, fallback state, checksum, redaction and the next verification step.",
  "Velmere AI is allowed to summarize evidence; it is not allowed to invent signals, live status, provider names or PDF sections that were not in the resolved payload.",
  "Research Lab content remains experimental audit language until external replication exists.",
] as const;

export const pass411ResearchBridge = {
  headline: "Research Lab as falsifiable audit layer",
  lanes: ["prime-density experiments", "RNG/entropy testing", "signature-boundary education", "replication pack", "falsification queue", "payload checksum mirror", "market-session boundary"],
  publicBoundary: "Velmere Research Lab can present tests and hypotheses, but public copy must stay in audit/replication/falsification language and must not claim solved cryptography without independent review.",
} as const;
