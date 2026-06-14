import type { UniversalAssetRow } from "./universal-asset-market-matrix";

export const PASS416_RUNTIME_CLOSE_EVENT = "velmere:pass416:terminal-precision-anchor-close";

type VisualPatch = { label: string; glyph: string; primary: string; secondary: string; text?: string; logoUrl?: string };
type MarketRowInput = Partial<UniversalAssetRow> & Pick<UniversalAssetRow, "id" | "rank" | "symbol" | "name" | "assetClass" | "riskPressure" | "sparkTone">;
type RealMarketMode = "basic" | "pro" | "advanced";
export type Pass416StableField = { id: string; label: string; value: string; copy: string };
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
    sourceRhythm: input.sourceRhythm ?? `${lane} provider cadence · PASS416 precision anchor · 3 suggestions · chart-first no Orbit mount`,
    priceLane: input.priceLane ?? `${lane} OHLCV-ready lane · chart first · source timestamp required before live wording`,
    volumeLane: input.volumeLane ?? `${lane} volume lane separates session calendar, stale state, spread and drift from AI summary`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${lane} logo authority + timestamp + second source + checksum before confidence`,
    secondSourceLane: input.secondSourceLane ?? "primary provider ↔ second source ↔ drift check ↔ Lens preview ↔ PDF download",
    confidenceFloor: input.confidenceFloor ?? 97,
    adapterState: input.adapterState ?? "provider_required",
    humanCopy: input.humanCopy ?? `${input.symbol} routes through PASS416: anchored search, safe metric text, chart-first modal and exact PDF parity.`,
    nextAdapterStep: input.nextAdapterStep ?? "Wire official provider, provider timestamp, session calendar, favicon/logo authority, second-source drift and payload checksum.",
    ...input,
  };
}

export const pass416TerminalPrecisionAnchor = {
  version: "PASS416.terminal_precision_anchor",
  searchRule: "Every Velmère terminal uses exactly three suggestions, local scoring first, no floating portal in Browser, and close events before modal/download/scroll.",
  modalRule: "Real Markets remains chart-first; Basic/Pro/Advanced render deterministic fields while Orbit 360 is parked until isolated as a lazy crash boundary.",
  metricRule: "Every React-visible metric is reduced to text, including nested price/change objects, arrays and missing values.",
  chartRule: "Drag begins only after a dead-zone, pointer default is prevented, and chart position should not jump on first contact.",
  pdfRule: "Browser HTML preview and downloaded PDF use one stable locale payload, one field order and one checksum lane.",
  aiRule: "Velmère AI writes only from source state, freshness, lineage, provider drift, security boundary and next verification step.",
  securityRule: "Public security surface stays simple: layered controls, redacted internals, rate limits, signer boundary, audit log and provider freshness.",
  researchRule: "Research Lab uses experiment, replication and falsification wording until external review exists.",
} as const;

export function pass416SafeText(value: unknown, fallback = "—"): string {
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) {
    const text = value.map((entry) => pass416SafeText(entry, "")).filter(Boolean).join(" · ");
    return text || fallback;
  }
  if (value && typeof value === "object") {
    const record = value as { price?: unknown; change?: unknown; value?: unknown; label?: unknown; amount?: unknown; state?: unknown; source?: unknown };
    const parts = [
      pass416SafeText(record.price ?? record.value ?? record.label ?? record.amount ?? record.state, ""),
      pass416SafeText(record.change, ""),
      pass416SafeText(record.source, ""),
    ].filter(Boolean);
    return parts.join(" · ") || fallback;
  }
  return fallback;
}

export function pass416NormalizeQuery(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

export function pass416ClampSuggestions<T>(items: T[], keyOf: (item: T) => string, limit = 3): T[] {
  const seen = new Set<string>();
  const next: T[] = [];
  for (const item of items) {
    const key = keyOf(item).trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    next.push(item);
    if (next.length >= Math.max(1, limit)) break;
  }
  return next;
}

export const pass416AssetVisualPatch: Record<string, VisualPatch> = {
  "SPY": { label: "S&P 500 ETF", glyph: "SP", primary: "#0f172a", secondary: "#38bdf8" },
  "QQQ": { label: "Nasdaq 100 ETF", glyph: "Q", primary: "#111827", secondary: "#a78bfa" },
  "IWM": { label: "Russell 2000 ETF", glyph: "IW", primary: "#1d4ed8", secondary: "#f8fafc" },
  "TLT": { label: "20Y Treasury ETF", glyph: "TL", primary: "#334155", secondary: "#f8fafc" },
  "HYG": { label: "High Yield ETF", glyph: "HY", primary: "#7c2d12", secondary: "#facc15" },
  "EURNZD": { label: "Euro / New Zealand Dollar", glyph: "NZ", primary: "#0f766e", secondary: "#f8fafc" },
  "USDZAR": { label: "Dollar / South African Rand", glyph: "ZA", primary: "#16a34a", secondary: "#facc15" },
  "USDMXN": { label: "Dollar / Mexican Peso", glyph: "MX", primary: "#15803d", secondary: "#dc2626" },
  "USDBRL": { label: "Dollar / Brazilian Real", glyph: "BR", primary: "#16a34a", secondary: "#facc15" },
  "EURCZK": { label: "Euro / Czech Koruna", glyph: "CZ", primary: "#1d4ed8", secondary: "#dc2626" },
  "WHEAT": { label: "Wheat reference", glyph: "WH", primary: "#ca8a04", secondary: "#111827" },
  "SUGAR": { label: "Sugar reference", glyph: "SG", primary: "#f8fafc", secondary: "#111827", text: "#111" },
  "COPPER": { label: "Copper reference", glyph: "CU", primary: "#b45309", secondary: "#111827" },
  "LITHIUM": { label: "Lithium basket", glyph: "LI", primary: "#64748b", secondary: "#a7f3d0" },
  "URNM": { label: "Uranium miners ETF", glyph: "UR", primary: "#166534", secondary: "#bef264" },
  "VNQI": { label: "Global ex-US Real Estate", glyph: "VQ", primary: "#0f766e", secondary: "#f8fafc" },
  "RWO": { label: "Global Real Estate ETF", glyph: "RW", primary: "#134e4a", secondary: "#f8fafc" },
  "IYR": { label: "US Real Estate ETF", glyph: "YR", primary: "#0f766e", secondary: "#f8fafc" },
  "GILD": { label: "Gilead", glyph: "GI", primary: "#1d4ed8", secondary: "#f8fafc" },
  "ADBE": { label: "Adobe", glyph: "AD", primary: "#dc2626", secondary: "#111827" },
  "CRM": { label: "Salesforce", glyph: "SF", primary: "#0ea5e9", secondary: "#f8fafc" },
  "NOW": { label: "ServiceNow", glyph: "NW", primary: "#16a34a", secondary: "#111827" },
  "SHOP": { label: "Shopify", glyph: "SH", primary: "#16a34a", secondary: "#f8fafc" },
  "MELI": { label: "MercadoLibre", glyph: "ML", primary: "#facc15", secondary: "#1d4ed8", text: "#111" },
};

export const pass416PseudoPricePatch: Record<string, PseudoPatch> = {
  SPY: { price: "$520", change: "provider" },
  QQQ: { price: "$450", change: "provider" },
  IWM: { price: "$205", change: "provider" },
  TLT: { price: "$92", change: "rates" },
  HYG: { price: "$77", change: "spread" },
  EURNZD: { price: "1.78", change: "flat" },
  USDZAR: { price: "18.20", change: "watch" },
  USDMXN: { price: "17.05", change: "flat" },
  USDBRL: { price: "5.20", change: "watch" },
  EURCZK: { price: "24.70", change: "flat" },
  WHEAT: { price: "$6.20", change: "watch" },
  SUGAR: { price: "$0.19", change: "flat" },
  COPPER: { price: "$4.45", change: "watch" },
  LITHIUM: { price: "basket", change: "provider" },
  URNM: { price: "$49", change: "watch" },
  VNQI: { price: "$41", change: "flat" },
  RWO: { price: "$42", change: "flat" },
  IYR: { price: "$88", change: "flat" },
  GILD: { price: "$72", change: "provider" },
  ADBE: { price: "$480", change: "provider" },
  CRM: { price: "$260", change: "provider" },
  NOW: { price: "$730", change: "provider" },
  SHOP: { price: "$65", change: "provider" },
  MELI: { price: "$1,650", change: "provider" },
};

export function buildPass416MarketCoverageUniverse(): UniversalAssetRow[] {
  return [
    row({ id: "pass416-spy", rank: 1500, symbol: "SPY", name: "S&P 500 ETF", assetClass: "etf", riskPressure: 30, sparkTone: "flat" }),
    row({ id: "pass416-qqq", rank: 1501, symbol: "QQQ", name: "Nasdaq 100 ETF", assetClass: "etf", riskPressure: 36, sparkTone: "watch" }),
    row({ id: "pass416-iwm", rank: 1502, symbol: "IWM", name: "Russell 2000 ETF", assetClass: "etf", riskPressure: 39, sparkTone: "watch" }),
    row({ id: "pass416-tlt", rank: 1503, symbol: "TLT", name: "20Y Treasury ETF", assetClass: "etf", riskPressure: 42, sparkTone: "watch" }),
    row({ id: "pass416-hyg", rank: 1504, symbol: "HYG", name: "High Yield Credit ETF", assetClass: "etf", riskPressure: 45, sparkTone: "watch" }),
    row({ id: "pass416-eurnzd", rank: 1505, symbol: "EURNZD", name: "Euro / New Zealand Dollar", assetClass: "fx", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass416-usdzar", rank: 1506, symbol: "USDZAR", name: "Dollar / South African Rand", assetClass: "fx", riskPressure: 49, sparkTone: "watch" }),
    row({ id: "pass416-usdmxn", rank: 1507, symbol: "USDMXN", name: "Dollar / Mexican Peso", assetClass: "fx", riskPressure: 38, sparkTone: "flat" }),
    row({ id: "pass416-usdbrl", rank: 1508, symbol: "USDBRL", name: "Dollar / Brazilian Real", assetClass: "fx", riskPressure: 46, sparkTone: "watch" }),
    row({ id: "pass416-eurczk", rank: 1509, symbol: "EURCZK", name: "Euro / Czech Koruna", assetClass: "fx", riskPressure: 32, sparkTone: "flat" }),
    row({ id: "pass416-wheat", rank: 1510, symbol: "WHEAT", name: "Wheat reference", assetClass: "commodity", riskPressure: 43, sparkTone: "watch" }),
    row({ id: "pass416-sugar", rank: 1511, symbol: "SUGAR", name: "Sugar reference", assetClass: "commodity", riskPressure: 37, sparkTone: "flat" }),
    row({ id: "pass416-copper", rank: 1512, symbol: "COPPER", name: "Copper reference", assetClass: "commodity", riskPressure: 41, sparkTone: "watch" }),
    row({ id: "pass416-lithium", rank: 1513, symbol: "LITHIUM", name: "Lithium basket", assetClass: "commodity", riskPressure: 50, sparkTone: "watch" }),
    row({ id: "pass416-urnm", rank: 1514, symbol: "URNM", name: "Uranium miners ETF", assetClass: "etf", riskPressure: 52, sparkTone: "watch" }),
    row({ id: "pass416-vnqi", rank: 1515, symbol: "VNQI", name: "Global ex-US Real Estate ETF", assetClass: "real_estate", riskPressure: 40, sparkTone: "flat" }),
    row({ id: "pass416-rwo", rank: 1516, symbol: "RWO", name: "Global Real Estate ETF", assetClass: "real_estate", riskPressure: 39, sparkTone: "flat" }),
    row({ id: "pass416-iyr", rank: 1517, symbol: "IYR", name: "US Real Estate ETF", assetClass: "real_estate", riskPressure: 41, sparkTone: "flat" }),
    row({ id: "pass416-gild", rank: 1518, symbol: "GILD", name: "Gilead Sciences", assetClass: "stock", riskPressure: 29, sparkTone: "flat" }),
    row({ id: "pass416-adbe", rank: 1519, symbol: "ADBE", name: "Adobe", assetClass: "stock", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass416-crm", rank: 1520, symbol: "CRM", name: "Salesforce", assetClass: "stock", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass416-now", rank: 1521, symbol: "NOW", name: "ServiceNow", assetClass: "stock", riskPressure: 37, sparkTone: "flat" }),
    row({ id: "pass416-shop", rank: 1522, symbol: "SHOP", name: "Shopify", assetClass: "stock", riskPressure: 46, sparkTone: "watch" }),
    row({ id: "pass416-meli", rank: 1523, symbol: "MELI", name: "MercadoLibre", assetClass: "stock", riskPressure: 45, sparkTone: "watch" }),
  ];
}

function modeLimit(mode: RealMarketMode) {
  if (mode === "basic") return 10;
  if (mode === "pro") return 14;
  return 20;
}

export function buildPass416StableAnalysisFields(input: {
  symbol: string;
  name: string;
  type: string;
  price: unknown;
  change: unknown;
  risk: unknown;
  source: unknown;
  proof: unknown;
  second: unknown;
  mode: RealMarketMode;
}): Pass416StableField[] {
  const source = pass416SafeText(input.source, "provider required");
  const base: Pass416StableField[] = [
    { id: "identity", label: "Instrument", value: input.symbol, copy: `${input.name} · ${input.type}` },
    { id: "price", label: "Price lane", value: pass416SafeText(input.price, "provider pending"), copy: "React-safe metric text; never render raw objects." },
    { id: "change", label: "Change", value: pass416SafeText(input.change, "session pending"), copy: "Change is separated from price so the table and modal stay stable." },
    { id: "source", label: "Source", value: source, copy: "Provider timestamp is required before live wording." },
    { id: "second", label: "Second source", value: pass416SafeText(input.second, "required"), copy: "Second-source drift must be checked before confidence rises." },
    { id: "proof", label: "Proof", value: pass416SafeText(input.proof, "checksum pending"), copy: "Preview and PDF share the same payload checksum lane." },
    { id: "risk", label: "Risk pressure", value: pass416SafeText(input.risk, "review"), copy: "Risk is a review lane, not an action prompt." },
    { id: "chart", label: "Chart", value: "candles first", copy: "Chart remains active while Orbit 360 is disabled in this modal." },
    { id: "freshness", label: "Freshness", value: "reconnect-aware", copy: "WebSocket/live providers need reconnect and stale-state handling." },
    { id: "locale", label: "Locale", value: "PL/EN/DE", copy: "Browser report text follows the active page language." },
    { id: "ai", label: "Velmère AI", value: "source-bound", copy: "AI copy is built from payload fields instead of random filler." },
    { id: "icons", label: "Icon lane", value: "visual patch", copy: "Real assets have deterministic visual marks until official logos are wired." },
    { id: "search", label: "Search", value: "3 suggestions", copy: "Input-anchored suggestions reduce lag and avoid random portal placement." },
    { id: "modal", label: "Modal", value: "chart-first", copy: "Basic/Pro/Advanced switch fields without mounting heavy neural animations." },
    { id: "download", label: "PDF", value: "same payload", copy: "Download and preview use the same resolved data and field order." },
    { id: "security", label: "Security", value: "redacted boundary", copy: "Public copy explains layers without disclosing sensitive internals." },
    { id: "research", label: "Research", value: "replication lane", copy: "Research Lab stays testable and falsifiable before external review." },
    { id: "next", label: "Next adapter", value: "provider key", copy: "Wire official provider, session calendar and second-source drift." },
    { id: "status", label: "Status", value: input.mode, copy: "Output count changes by Basic/Pro/Advanced mode." },
    { id: "orbit", label: "Orbit 360", value: "paused", copy: "Heavy brain animation returns only as lazy crash-contained component." },
  ];
  return base.slice(0, modeLimit(input.mode));
}

export const pass416SecurityPlainCopy = [
  "Velmère Security uses layered controls, signer boundaries, audit logging and provider freshness without exposing sensitive internal methods.",
  "Research Lab remains an experimental verification surface: reproduce, falsify, document and only then promote claims.",
  "Terminal UI avoids fake-live text: source timestamp, second-source drift and checksum decide what can be displayed.",
] as const;
