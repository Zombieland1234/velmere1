import type { UniversalAssetRow } from "./universal-asset-market-matrix";

export const PASS415_RUNTIME_CLOSE_EVENT = "velmere:pass415:terminal-latency-stabilizer-close";

type VisualPatch = { label: string; glyph: string; primary: string; secondary: string; text?: string; logoUrl?: string };
type MarketRowInput = Partial<UniversalAssetRow> & Pick<UniversalAssetRow, "id" | "rank" | "symbol" | "name" | "assetClass" | "riskPressure" | "sparkTone">;
type RealMarketMode = "basic" | "pro" | "advanced";
export type Pass415AnalysisField = { id: string; label: string; value: string; copy: string };
type PseudoPatch = string | number | { price?: string | number; change?: string | number; value?: string | number; label?: string | number; amount?: string | number };

function laneFor(assetClass: UniversalAssetRow["assetClass"]) {
  if (assetClass === "fx") return "FX";
  if (assetClass === "commodity") return "commodity";
  if (assetClass === "real_estate") return "real-estate";
  if (assetClass === "etf") return "ETF";
  if (assetClass === "exchange_token") return "exchange-token";
  if (assetClass === "crypto") return "crypto";
  return "equity";
}

function row(input: MarketRowInput): UniversalAssetRow {
  const lane = laneFor(input.assetClass);
  return {
    sourceRhythm: input.sourceRhythm ?? `${lane} provider cadence · PASS415 latency stabilizer · max-3 anchor · no heavy Orbit mount`,
    priceLane: input.priceLane ?? `${lane} OHLCV-ready lane · chart first · provider timestamp required before live copy`,
    volumeLane: input.volumeLane ?? `${lane} volume lane separates session calendar, stale state, spread and drift from AI text`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${lane} logo authority + timestamp + second source + checksum before confidence`,
    secondSourceLane: input.secondSourceLane ?? "primary provider ↔ second source ↔ drift check ↔ Lens preview ↔ PDF download",
    confidenceFloor: input.confidenceFloor ?? 96,
    adapterState: input.adapterState ?? "provider_required",
    humanCopy: input.humanCopy ?? `${input.symbol} routes through PASS415: input-anchored search, object-safe metrics, chart-first modal and stable PDF parity.`,
    nextAdapterStep: input.nextAdapterStep ?? "Wire official provider, session calendar, favicon/logo authority, reconnect state, second-source drift and payload checksum.",
    ...input,
  };
}

export const pass415TerminalLatencyStabilizer = {
  version: "PASS415.terminal_latency_stabilizer",
  searchRule: "Every terminal surface shows at most three suggestions, dedupes by symbol/id, keeps the dropdown physically inside the input shell and closes it on scroll, modal, tab and route actions.",
  modalRule: "Basic/Pro/Advanced remain chart-first while Orbit 360 is not mounted in Real Markets until it is isolated as a lazy, crash-contained component.",
  metricRule: "Object-shaped metrics are serialized recursively, with price/change/value reduced to strings before React render.",
  chartRule: "Pointer start, dead-zone, pointer capture and passive jump prevention keep candle drag from snapping on first movement.",
  pdfRule: "Browser HTML preview and downloaded PDF share a single locale payload, stable field order and checksum lane.",
  aiRule: "Velmère AI answers from source state, freshness, lineage, provider drift, security boundary and next verification step, not random filler.",
  securityRule: "Public security copy stays simple: layered controls, redacted internals, audit trail, rate limits, signer boundary and provider freshness.",
  researchRule: "Research Lab stays in experiment, replication and falsification language until external review exists.",
} as const;

export function pass415SafeText(value: unknown, fallback = "—"): string {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (Array.isArray(value)) {
    const text = value.map((entry) => pass415SafeText(entry, "")).filter(Boolean).join(" · ");
    return text || fallback;
  }
  if (value && typeof value === "object") {
    const record = value as { price?: unknown; change?: unknown; value?: unknown; label?: unknown; amount?: unknown };
    const primary = pass415SafeText(record.price ?? record.value ?? record.label ?? record.amount, "");
    const change = pass415SafeText(record.change, "");
    const text = [primary, change].filter(Boolean).join(" · ");
    return text || fallback;
  }
  return fallback;
}

export function pass415ClampSuggestions<T>(items: T[], keyOf: (item: T) => string, limit = 3): T[] {
  const seen = new Set<string>();
  const next: T[] = [];
  for (const item of items) {
    const key = keyOf(item).trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    next.push(item);
    if (next.length >= limit) break;
  }
  return next;
}

export const pass415AssetVisualPatch: Record<string, VisualPatch> = {
  "STOXX50E": { label: "Euro Stoxx 50", glyph: "50", primary: "#1d4ed8", secondary: "#facc15" },
  "CAC40": { label: "CAC 40", glyph: "FR", primary: "#1d4ed8", secondary: "#f8fafc" },
  "DAX40": { label: "DAX 40", glyph: "DX", primary: "#111827", secondary: "#facc15" },
  "FTSE100": { label: "FTSE 100", glyph: "UK", primary: "#1e3a8a", secondary: "#f8fafc" },
  "NIKKEI": { label: "Nikkei 225", glyph: "JP", primary: "#dc2626", secondary: "#f8fafc" },
  "HSI": { label: "Hang Seng", glyph: "HK", primary: "#16a34a", secondary: "#dc2626" },
  "EUR/SEK": { label: "Euro / Swedish Krona", glyph: "SEK", primary: "#2563eb", secondary: "#facc15" },
  "EUR/NOK": { label: "Euro / Norwegian Krone", glyph: "NOK", primary: "#1d4ed8", secondary: "#dc2626" },
  "USD/CAD": { label: "Dollar / Canadian Dollar", glyph: "CAD", primary: "#16a34a", secondary: "#dc2626" },
  "AUD/USD": { label: "Australian Dollar / Dollar", glyph: "AUD", primary: "#1d4ed8", secondary: "#f8fafc" },
  "NZD/USD": { label: "New Zealand Dollar / Dollar", glyph: "NZD", primary: "#0f766e", secondary: "#f8fafc" },
  "PLD": { label: "Palladium", glyph: "PD", primary: "#64748b", secondary: "#f8fafc" },
  "PLAT": { label: "Platinum", glyph: "PT", primary: "#94a3b8", secondary: "#111827" },
  "CORN": { label: "Corn reference", glyph: "CR", primary: "#ca8a04", secondary: "#111827" },
  "COFFEE": { label: "Coffee reference", glyph: "CF", primary: "#78350f", secondary: "#f8fafc" },
  "XLRE": { label: "Real Estate Select Sector", glyph: "XR", primary: "#0f766e", secondary: "#f8fafc" },
  "REET": { label: "Global REIT ETF", glyph: "RE", primary: "#134e4a", secondary: "#f8fafc" },
  "CIBR": { label: "Nasdaq Cybersecurity ETF", glyph: "CY", primary: "#0f172a", secondary: "#38bdf8" },
  "BUG": { label: "Global X Cybersecurity ETF", glyph: "BG", primary: "#111827", secondary: "#a78bfa" },
  "BOTZ": { label: "Global Robotics & AI ETF", glyph: "AI", primary: "#312e81", secondary: "#a78bfa" },
  "SMH": { label: "Semiconductor ETF", glyph: "SM", primary: "#0f172a", secondary: "#f97316" },
  "LDO.MI": { label: "Leonardo", glyph: "LD", primary: "#1e3a8a", secondary: "#f8fafc" },
  "SIE.DE": { label: "Siemens", glyph: "SI", primary: "#0f766e", secondary: "#f8fafc" },
  "AIR.PA": { label: "Airbus", glyph: "AB", primary: "#1d4ed8", secondary: "#f8fafc" },
};

export const pass415PseudoPricePatch: Record<string, PseudoPatch> = {
  STOXX50E: { price: "index", change: "provider" },
  CAC40: { price: "index", change: "provider" },
  DAX40: { price: "index", change: "provider" },
  FTSE100: { price: "index", change: "provider" },
  NIKKEI: { price: "index", change: "provider" },
  HSI: { price: "index", change: "provider" },
  "EUR/SEK": { price: "11.25", change: "flat" },
  "EUR/NOK": { price: "11.75", change: "watch" },
  "USD/CAD": { price: "1.37", change: "+0.1%" },
  "AUD/USD": { price: "0.66", change: "flat" },
  "NZD/USD": { price: "0.61", change: "flat" },
  PLD: { price: "$980", change: "watch" },
  PLAT: { price: "$1,030", change: "flat" },
  CORN: { price: "$4.55", change: "watch" },
  COFFEE: { price: "$2.20", change: "watch" },
  XLRE: { price: "$40.50", change: "+0.1%" },
  REET: { price: "$23.80", change: "+0.1%" },
  CIBR: { price: "$64.20", change: "+0.2%" },
  BUG: { price: "$30.60", change: "+0.2%" },
  BOTZ: { price: "$33.40", change: "+0.3%" },
  SMH: { price: "$255", change: "+0.3%" },
  "LDO.MI": { price: "€23.10", change: "+0.2%" },
  "SIE.DE": { price: "€175", change: "+0.1%" },
  "AIR.PA": { price: "€155", change: "+0.1%" },
};

export function buildPass415MarketCoverageUniverse(): UniversalAssetRow[] {
  return [
    row({ id: "pass415-stoxx50e", rank: 1400, symbol: "STOXX50E", name: "Euro Stoxx 50 index", assetClass: "stock", riskPressure: 32, sparkTone: "flat" }),
    row({ id: "pass415-cac40", rank: 1401, symbol: "CAC40", name: "CAC 40 index", assetClass: "stock", riskPressure: 33, sparkTone: "flat" }),
    row({ id: "pass415-dax40", rank: 1402, symbol: "DAX40", name: "DAX 40 index", assetClass: "stock", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass415-ftse100", rank: 1403, symbol: "FTSE100", name: "FTSE 100 index", assetClass: "stock", riskPressure: 31, sparkTone: "flat" }),
    row({ id: "pass415-nikkei", rank: 1404, symbol: "NIKKEI", name: "Nikkei 225 index", assetClass: "stock", riskPressure: 39, sparkTone: "watch" }),
    row({ id: "pass415-hsi", rank: 1405, symbol: "HSI", name: "Hang Seng index", assetClass: "stock", riskPressure: 44, sparkTone: "watch" }),
    row({ id: "pass415-eursek", rank: 1406, symbol: "EUR/SEK", name: "Euro / Swedish Krona", assetClass: "fx", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass415-eurnok", rank: 1407, symbol: "EUR/NOK", name: "Euro / Norwegian Krone", assetClass: "fx", riskPressure: 39, sparkTone: "watch" }),
    row({ id: "pass415-usdcad", rank: 1408, symbol: "USD/CAD", name: "Dollar / Canadian Dollar", assetClass: "fx", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass415-audusd", rank: 1409, symbol: "AUD/USD", name: "Australian Dollar / Dollar", assetClass: "fx", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass415-nzdusd", rank: 1410, symbol: "NZD/USD", name: "New Zealand Dollar / Dollar", assetClass: "fx", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass415-palladium", rank: 1411, symbol: "PLD", name: "Palladium reference", assetClass: "commodity", riskPressure: 46, sparkTone: "watch" }),
    row({ id: "pass415-platinum", rank: 1412, symbol: "PLAT", name: "Platinum reference", assetClass: "commodity", riskPressure: 39, sparkTone: "flat" }),
    row({ id: "pass415-corn", rank: 1413, symbol: "CORN", name: "Corn reference", assetClass: "commodity", riskPressure: 45, sparkTone: "watch" }),
    row({ id: "pass415-coffee", rank: 1414, symbol: "COFFEE", name: "Coffee reference", assetClass: "commodity", riskPressure: 52, sparkTone: "watch" }),
    row({ id: "pass415-xlre", rank: 1415, symbol: "XLRE", name: "Real Estate Select Sector SPDR Fund", assetClass: "real_estate", riskPressure: 32, sparkTone: "flat" }),
    row({ id: "pass415-reet", rank: 1416, symbol: "REET", name: "iShares Global REIT ETF", assetClass: "real_estate", riskPressure: 33, sparkTone: "flat" }),
    row({ id: "pass415-cibr", rank: 1417, symbol: "CIBR", name: "First Trust Nasdaq Cybersecurity ETF", assetClass: "etf", riskPressure: 37, sparkTone: "flat" }),
    row({ id: "pass415-bug", rank: 1418, symbol: "BUG", name: "Global X Cybersecurity ETF", assetClass: "etf", riskPressure: 38, sparkTone: "flat" }),
    row({ id: "pass415-botz", rank: 1419, symbol: "BOTZ", name: "Global X Robotics & AI ETF", assetClass: "etf", riskPressure: 41, sparkTone: "watch" }),
    row({ id: "pass415-smh", rank: 1420, symbol: "SMH", name: "VanEck Semiconductor ETF", assetClass: "etf", riskPressure: 43, sparkTone: "watch" }),
    row({ id: "pass415-leonardo", rank: 1421, symbol: "LDO.MI", name: "Leonardo", assetClass: "stock", riskPressure: 40, sparkTone: "watch" }),
    row({ id: "pass415-siemens", rank: 1422, symbol: "SIE.DE", name: "Siemens", assetClass: "stock", riskPressure: 32, sparkTone: "flat" }),
    row({ id: "pass415-airbus", rank: 1423, symbol: "AIR.PA", name: "Airbus", assetClass: "stock", riskPressure: 35, sparkTone: "flat" }),
  ];
}

export function buildPass415StableAnalysisFields(input: {
  symbol: string;
  name: string;
  type: string;
  price: string;
  change: string;
  risk: number;
  source: string;
  proof: string;
  second: string;
  mode: RealMarketMode;
}): Pass415AnalysisField[] {
  const target = input.mode === "advanced" ? 20 : input.mode === "pro" ? 14 : 10;
  const base: Pass415AnalysisField[] = [
    { id: "identity", label: "Identity", value: input.symbol, copy: `${input.name} · ${input.type}` },
    { id: "price", label: "Price lane", value: pass415SafeText(input.price, "preview"), copy: "Text-rendered metric; no object child can reach React." },
    { id: "change", label: "Change lane", value: pass415SafeText(input.change, "—"), copy: "Movement label only; no predictive sentence." },
    { id: "risk", label: "Risk pressure", value: `${input.risk}/100`, copy: "Context score for comparison across asset classes." },
    { id: "source", label: "Source state", value: input.source, copy: "Live wording waits for provider timestamp and reconnect state." },
    { id: "proof", label: "Proof lane", value: input.proof, copy: "Evidence type must be visible before AI confidence." },
    { id: "second", label: "Second source", value: input.second, copy: "A secondary lane checks drift before final wording." },
    { id: "anchor", label: "Search anchor", value: "3 fixed", copy: "Only three deduped suggestions are allowed under the input." },
    { id: "drag", label: "Chart drag", value: "dead-zone", copy: "First motion is ignored until pointer intent is clear." },
    { id: "pdf", label: "PDF parity", value: "same payload", copy: "HTML preview and download keep locale and field order." },
    { id: "logo", label: "Logo authority", value: "visual patch", copy: "Real favicon/logo lane has deterministic fallback." },
    { id: "session", label: "Session calendar", value: "required", copy: "Equities, FX, ETFs and commodities are not labelled live without session logic." },
    { id: "spread", label: "Spread", value: "provider", copy: "Spread and depth stay separate from price copy." },
    { id: "checksum", label: "Checksum", value: "payload seal", copy: "Resolved Lens payload has an audit seal before PDF." },
    { id: "security", label: "Security copy", value: "redacted", copy: "Public page explains controls without revealing internals." },
    { id: "research", label: "Research copy", value: "experiment", copy: "Research Lab stays replication-first until external review." },
    { id: "ai", label: "AI rule", value: "source-bound", copy: "AI text is built from source state, not random filler." },
    { id: "provider", label: "Provider wire", value: "next", copy: "Official data adapters are the next step before full live UI." },
    { id: "orbit", label: "Orbit runtime", value: "lazy-only", copy: "Heavy 3D brain stays out of Real Markets modal for stability." },
    { id: "status", label: "Runtime status", value: "stable", copy: "Current modal is chart-first and crash-contained." },
  ];
  return base.slice(0, target);
}
