import type { UniversalAssetRow } from "./universal-asset-market-matrix";
import { pass417ClampSuggestions, pass417SafeText } from "./pass417-terminal-chart-anchor-stabilizer";

export const PASS418_RUNTIME_CLOSE_EVENT = "velmere:pass418:terminal-cleanroom-runtime-close";

type VisualPatch = { label: string; glyph: string; primary: string; secondary: string; text?: string; logoUrl?: string };
type PseudoPatch = string | number | { price?: string | number; change?: string | number; value?: string | number; label?: string | number; amount?: string | number; source?: string | number };
type RealMarketMode = "basic" | "pro" | "advanced";
type MarketRowInput = Partial<UniversalAssetRow> & Pick<UniversalAssetRow, "id" | "rank" | "symbol" | "name" | "assetClass" | "riskPressure" | "sparkTone">;
export type Pass418StableField = { id: string; label: string; value: string; copy: string };

function laneFor(assetClass: UniversalAssetRow["assetClass"]) {
  if (assetClass === "fx") return "FX";
  if (assetClass === "commodity") return "commodity";
  if (assetClass === "real_estate") return "real-estate";
  if (assetClass === "etf") return "ETF";
  if (assetClass === "crypto") return "crypto";
  if (assetClass === "exchange_token") return "exchange-token";
  return "equity";
}

function row(input: MarketRowInput): UniversalAssetRow {
  const lane = laneFor(input.assetClass);
  return {
    sourceRhythm: input.sourceRhythm ?? `${lane} provider cadence · PASS418 cleanroom · official logo/fav icon lane · no fake-live label`,
    priceLane: input.priceLane ?? `${lane} OHLCV lane · TradingView-style candles · dead-zone drag · provider timestamp required`,
    volumeLane: input.volumeLane ?? `${lane} volume lane separates market session, spread, stale state and second-source drift`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${lane} provider timestamp + source lineage + checksum + official visual authority`,
    secondSourceLane: input.secondSourceLane ?? "primary provider ↔ second source ↔ payload checksum ↔ Browser preview ↔ PDF download",
    confidenceFloor: input.confidenceFloor ?? 98,
    adapterState: input.adapterState ?? "provider_required",
    humanCopy: input.humanCopy ?? `${input.symbol} routes through PASS418: chart-first modal, source-bound AI, exact PDF parity and official-provider adapter lane.`,
    nextAdapterStep: input.nextAdapterStep ?? "Attach official provider adapter, session calendar, kline/OHLCV cadence, logo authority, source age and checksum.",
    ...input,
  };
}

export const pass418TerminalCleanroomRuntime = {
  version: "PASS418.terminal_cleanroom_runtime",
  searchRule: "Every search surface keeps a hard three-result cap, in-shell Browser suggestions, stable local ranking and a close event before modal, download, scroll or route handoff.",
  chartRule: "Charts stay chart-first: pointer capture waits for the dead-zone, drag baseline is reset per interaction, and no Orbit layer can mount inside Real Markets until the lazy crash boundary is isolated.",
  marketRule: "Real Markets expands provider-ready coverage while every symbol still needs official provider timestamp, session calendar and second-source drift before live wording.",
  pdfRule: "Lens preview and downloaded PDF use one resolved payload, one locale, one field order and one checksum lane.",
  aiRule: "Velmère AI can describe only source state, source age, provider drift, security boundary, research boundary and next verification step.",
  securityRule: "Security copy stays simple: layered controls, redacted internals, signer boundary, rate limit, audit log, source freshness and evidence export.",
  researchRule: "Research Lab stays an experimental replication surface: claim, test, falsify, document and keep public wording conservative until independent review.",
} as const;

export const pass418TerminalChartAnchorStabilizer = pass418TerminalCleanroomRuntime;

export function pass418SafeText(value: unknown, fallback = "—"): string {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : fallback;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "symbol" || typeof value === "function") return fallback;
  if (Array.isArray(value)) {
    const text = value.map((entry) => pass418SafeText(entry, "")).filter(Boolean).join(" · ");
    return text || fallback;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const preferred = [record.price, record.change, record.value, record.label, record.amount, record.state, record.source]
      .map((entry) => pass418SafeText(entry, ""))
      .filter(Boolean);
    return preferred.join(" · ") || pass417SafeText(value, fallback);
  }
  return pass417SafeText(value, fallback);
}

export function pass418NormalizeSuggestionKey(value: string): string {
  return value.replace(/[^a-z0-9./:_-]+/gi, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

export function pass418ClampSuggestions<T>(items: T[], keyOf: (item: T) => string, limit = 3): T[] {
  return pass417ClampSuggestions(items, (item) => pass418NormalizeSuggestionKey(keyOf(item)), Math.min(3, Math.max(1, limit)));
}

export const pass418AssetVisualPatch: Record<string, VisualPatch> = {
  "SPY": { label: "SPDR S&P 500 ETF", glyph: "SP", primary: "#111827", secondary: "#38bdf8" },
  "QQQ": { label: "Invesco QQQ", glyph: "QQ", primary: "#1e1b4b", secondary: "#a78bfa" },
  "DIA": { label: "SPDR Dow Jones", glyph: "DI", primary: "#0f172a", secondary: "#f8fafc" },
  "IWM": { label: "Russell 2000 ETF", glyph: "IW", primary: "#0f766e", secondary: "#f8fafc" },
  "IEUR": { label: "Europe ETF", glyph: "EU", primary: "#1d4ed8", secondary: "#facc15" },
  "EWJ": { label: "Japan ETF", glyph: "JP", primary: "#f8fafc", secondary: "#dc2626", text: "#111" },
  "EWU": { label: "United Kingdom ETF", glyph: "UK", primary: "#1e3a8a", secondary: "#dc2626" },
  "EWG": { label: "Germany ETF", glyph: "DE", primary: "#111827", secondary: "#facc15" },
  "USD/HKD": { label: "Dollar / Hong Kong Dollar", glyph: "$H", primary: "#dc2626", secondary: "#facc15" },
  "USD/MXN": { label: "Dollar / Mexican Peso", glyph: "$M", primary: "#166534", secondary: "#f8fafc" },
  "USD/ZAR": { label: "Dollar / South African Rand", glyph: "$Z", primary: "#064e3b", secondary: "#facc15" },
  "EUR/SEK": { label: "Euro / Swedish Krona", glyph: "€S", primary: "#1d4ed8", secondary: "#facc15" },
  "COPPER": { label: "Copper reference", glyph: "CU", primary: "#b45309", secondary: "#fed7aa" },
  "NATGAS": { label: "Natural Gas reference", glyph: "NG", primary: "#0f172a", secondary: "#60a5fa" },
  "WHEAT": { label: "Wheat reference", glyph: "WH", primary: "#ca8a04", secondary: "#111827", text: "#111" },
  "SILVER": { label: "Silver reference", glyph: "AG", primary: "#e5e7eb", secondary: "#111827", text: "#111" },
  "PLD": { label: "Prologis", glyph: "PL", primary: "#0f766e", secondary: "#f8fafc" },
  "AMT": { label: "American Tower", glyph: "AT", primary: "#1e3a8a", secondary: "#f8fafc" },
  "EQIX": { label: "Equinix", glyph: "EQ", primary: "#111827", secondary: "#22d3ee" },
  "DLR": { label: "Digital Realty", glyph: "DR", primary: "#1e293b", secondary: "#38bdf8" },
  "PANW": { label: "Palo Alto Networks", glyph: "PA", primary: "#0f172a", secondary: "#38bdf8" },
  "CRWD": { label: "CrowdStrike", glyph: "CS", primary: "#111827", secondary: "#dc2626" },
  "SNOW": { label: "Snowflake", glyph: "SN", primary: "#dbeafe", secondary: "#2563eb", text: "#111" },
  "SHOP": { label: "Shopify", glyph: "SH", primary: "#14532d", secondary: "#86efac" },
};

export const pass418PseudoPricePatch: Record<string, PseudoPatch> = {
  SPY: { price: "$620", change: "US ETF" },
  QQQ: { price: "$540", change: "tech ETF" },
  DIA: { price: "$430", change: "Dow ETF" },
  IWM: { price: "$225", change: "small cap" },
  IEUR: { price: "$61", change: "Europe ETF" },
  EWJ: { price: "$73", change: "Japan ETF" },
  EWU: { price: "$37", change: "UK ETF" },
  EWG: { price: "$34", change: "Germany ETF" },
  "USD/HKD": { price: "provider", change: "HK peg" },
  "USD/MXN": { price: "provider", change: "LatAm FX" },
  "USD/ZAR": { price: "provider", change: "EM FX" },
  "EUR/SEK": { price: "provider", change: "Nordic FX" },
  COPPER: { price: "provider", change: "industrial metal" },
  NATGAS: { price: "provider", change: "energy" },
  WHEAT: { price: "provider", change: "grain" },
  SILVER: { price: "provider", change: "precious metal" },
  PLD: { price: "$118", change: "logistics REIT" },
  AMT: { price: "$190", change: "tower REIT" },
  EQIX: { price: "$770", change: "data center REIT" },
  DLR: { price: "$146", change: "data center REIT" },
  PANW: { price: "$300", change: "cyber" },
  CRWD: { price: "$360", change: "endpoint" },
  SNOW: { price: "$170", change: "data cloud" },
  SHOP: { price: "$68", change: "commerce" },
};

export function buildPass418MarketCoverageUniverse(): UniversalAssetRow[] {
  return [
    row({ id: "pass418-spy", rank: 1624, symbol: "SPY", name: "SPDR S&P 500 ETF", assetClass: "etf", riskPressure: 31, sparkTone: "flat" }),
    row({ id: "pass418-qqq", rank: 1625, symbol: "QQQ", name: "Invesco QQQ Trust", assetClass: "etf", riskPressure: 39, sparkTone: "watch" }),
    row({ id: "pass418-dia", rank: 1626, symbol: "DIA", name: "SPDR Dow Jones ETF", assetClass: "etf", riskPressure: 30, sparkTone: "flat" }),
    row({ id: "pass418-iwm", rank: 1627, symbol: "IWM", name: "Russell 2000 ETF", assetClass: "etf", riskPressure: 44, sparkTone: "watch" }),
    row({ id: "pass418-ieur", rank: 1628, symbol: "IEUR", name: "Europe ETF", assetClass: "etf", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass418-ewj", rank: 1629, symbol: "EWJ", name: "Japan ETF", assetClass: "etf", riskPressure: 38, sparkTone: "watch" }),
    row({ id: "pass418-ewu", rank: 1630, symbol: "EWU", name: "United Kingdom ETF", assetClass: "etf", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass418-ewg", rank: 1631, symbol: "EWG", name: "Germany ETF", assetClass: "etf", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass418-usdhkd", rank: 1632, symbol: "USD/HKD", name: "Dollar / Hong Kong Dollar", assetClass: "fx", riskPressure: 29, sparkTone: "flat" }),
    row({ id: "pass418-usdmxn", rank: 1633, symbol: "USD/MXN", name: "Dollar / Mexican Peso", assetClass: "fx", riskPressure: 45, sparkTone: "watch" }),
    row({ id: "pass418-usdzar", rank: 1634, symbol: "USD/ZAR", name: "Dollar / South African Rand", assetClass: "fx", riskPressure: 50, sparkTone: "watch" }),
    row({ id: "pass418-eursek", rank: 1635, symbol: "EUR/SEK", name: "Euro / Swedish Krona", assetClass: "fx", riskPressure: 33, sparkTone: "flat" }),
    row({ id: "pass418-copper", rank: 1636, symbol: "COPPER", name: "Copper reference", assetClass: "commodity", riskPressure: 43, sparkTone: "watch" }),
    row({ id: "pass418-natgas", rank: 1637, symbol: "NATGAS", name: "Natural Gas reference", assetClass: "commodity", riskPressure: 56, sparkTone: "watch" }),
    row({ id: "pass418-wheat", rank: 1638, symbol: "WHEAT", name: "Wheat reference", assetClass: "commodity", riskPressure: 40, sparkTone: "watch" }),
    row({ id: "pass418-silver", rank: 1639, symbol: "SILVER", name: "Silver reference", assetClass: "commodity", riskPressure: 42, sparkTone: "watch" }),
    row({ id: "pass418-pld", rank: 1640, symbol: "PLD", name: "Prologis", assetClass: "real_estate", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass418-amt", rank: 1641, symbol: "AMT", name: "American Tower", assetClass: "real_estate", riskPressure: 39, sparkTone: "flat" }),
    row({ id: "pass418-eqix", rank: 1642, symbol: "EQIX", name: "Equinix", assetClass: "real_estate", riskPressure: 37, sparkTone: "flat" }),
    row({ id: "pass418-dlr", rank: 1643, symbol: "DLR", name: "Digital Realty", assetClass: "real_estate", riskPressure: 41, sparkTone: "watch" }),
    row({ id: "pass418-panw", rank: 1644, symbol: "PANW", name: "Palo Alto Networks", assetClass: "stock", riskPressure: 42, sparkTone: "watch" }),
    row({ id: "pass418-crwd", rank: 1645, symbol: "CRWD", name: "CrowdStrike", assetClass: "stock", riskPressure: 46, sparkTone: "watch" }),
    row({ id: "pass418-snow", rank: 1646, symbol: "SNOW", name: "Snowflake", assetClass: "stock", riskPressure: 48, sparkTone: "watch" }),
    row({ id: "pass418-shop", rank: 1647, symbol: "SHOP", name: "Shopify", assetClass: "stock", riskPressure: 43, sparkTone: "watch" }),
  ];
}

function modeLimit(mode: RealMarketMode) {
  if (mode === "basic") return 10;
  if (mode === "pro") return 14;
  return 20;
}

export function buildPass418StableAnalysisFields(input: {
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
}): Pass418StableField[] {
  const fields: Pass418StableField[] = [
    { id: "identity", label: "Instrument", value: pass418SafeText(input.symbol, "symbol"), copy: `${pass418SafeText(input.name, "asset")} · ${pass418SafeText(input.type, "market")}` },
    { id: "price", label: "Price lane", value: pass418SafeText(input.price, "provider pending"), copy: "React-safe text output; raw objects never render in JSX." },
    { id: "change", label: "Session change", value: pass418SafeText(input.change, "session pending"), copy: "Change is separated from price to avoid price/change object crashes." },
    { id: "risk", label: "Risk pressure", value: pass418SafeText(input.risk, "review"), copy: "Risk is a review signal, not an action prompt." },
    { id: "source", label: "Source state", value: pass418SafeText(input.source, "provider required"), copy: "Source age and provider timestamp decide public confidence." },
    { id: "proof", label: "Proof lane", value: pass418SafeText(input.proof, "checksum pending"), copy: "Preview and PDF mirror the same resolved payload checksum." },
    { id: "second", label: "Second source", value: pass418SafeText(input.second, "required"), copy: "Second-source drift must be visible before stronger wording." },
    { id: "chart", label: "Chart", value: "candles first", copy: "The modal opens directly to chart + fields; Orbit remains parked." },
    { id: "drag", label: "Drag stability", value: "dead-zone", copy: "Pointer movement waits for a threshold and resets at each gesture start." },
    { id: "search", label: "Search", value: "3 suggestions", copy: "All terminals use a hard max-three suggestion contract." },
    { id: "locale", label: "Locale", value: "PL/EN/DE", copy: "Browser report output follows the selected page language." },
    { id: "ai", label: "Velmère AI", value: "source-bound", copy: "AI copy is composed from source fields instead of random filler." },
    { id: "icons", label: "Icon lane", value: "official adapter", copy: "Deterministic marks stay until provider/logo authority is wired." },
    { id: "freshness", label: "Freshness", value: "reconnect-aware", copy: "WebSocket adapters need reconnect and stale-state handling." },
    { id: "modal", label: "Modal", value: "no Orbit mount", copy: "Basic/Pro/Advanced switch output count without heavy neural animation." },
    { id: "download", label: "PDF", value: "same payload", copy: "Downloaded PDF and HTML preview share one payload and field order." },
    { id: "security", label: "Security", value: "redacted boundary", copy: "Public page explains controls without exposing sensitive internals." },
    { id: "research", label: "Research", value: "replication lane", copy: "Claims stay experimental until they are independently reviewed." },
    { id: "provider", label: "Provider adapter", value: "pending", copy: "Wire official OHLCV/kline provider, session calendar and second source." },
    { id: "status", label: "Output mode", value: input.mode, copy: "Basic uses 10, Pro 14, Advanced 20 fields." },
  ];
  return fields.slice(0, modeLimit(input.mode));
}

export const pass418SecurityPlainCopy = [
  "Velmère Security presents simple public layers: rate limits, signer boundaries, audit logs, provider freshness and redacted operational details.",
  "Velmère Research Lab stays a verification lab: test, replicate, falsify and document before promoting any mathematical or cryptographic claim.",
  "Velmère AI output is source-bound: no random filler, no fake-live language and no claims stronger than the available evidence.",
] as const;
