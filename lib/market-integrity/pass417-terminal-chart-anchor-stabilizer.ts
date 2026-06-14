import type { UniversalAssetRow } from "./universal-asset-market-matrix";
import { pass416ClampSuggestions, pass416SafeText } from "./pass416-terminal-precision-anchor";

export const PASS417_RUNTIME_CLOSE_EVENT = "velmere:pass417:terminal-chart-anchor-stabilizer-close";

type VisualPatch = { label: string; glyph: string; primary: string; secondary: string; text?: string; logoUrl?: string };
type PseudoPatch = string | number | { price?: string | number; change?: string | number; value?: string | number; label?: string | number; amount?: string | number; source?: string | number };
type RealMarketMode = "basic" | "pro" | "advanced";
type MarketRowInput = Partial<UniversalAssetRow> & Pick<UniversalAssetRow, "id" | "rank" | "symbol" | "name" | "assetClass" | "riskPressure" | "sparkTone">;
export type Pass417StableField = { id: string; label: string; value: string; copy: string };

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
    sourceRhythm: input.sourceRhythm ?? `${lane} provider cadence · PASS417 chart anchor · official logo/fav icon lane · no fake-live label`,
    priceLane: input.priceLane ?? `${lane} OHLCV lane · TradingView-style candles · dead-zone drag · provider timestamp required`,
    volumeLane: input.volumeLane ?? `${lane} volume lane separates market session, spread, stale state and second-source drift`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${lane} provider timestamp + source lineage + checksum + official visual authority`,
    secondSourceLane: input.secondSourceLane ?? "primary provider ↔ second source ↔ payload checksum ↔ Browser preview ↔ PDF download",
    confidenceFloor: input.confidenceFloor ?? 98,
    adapterState: input.adapterState ?? "provider_required",
    humanCopy: input.humanCopy ?? `${input.symbol} routes through PASS417: chart-first modal, source-bound AI, exact PDF parity and official-provider adapter lane.`,
    nextAdapterStep: input.nextAdapterStep ?? "Attach official provider adapter, session calendar, kline/OHLCV cadence, logo authority, source age and checksum.",
    ...input,
  };
}

export const pass417TerminalChartAnchorStabilizer = {
  version: "PASS417.terminal_chart_anchor_stabilizer",
  searchRule: "Every search surface keeps a hard three-result cap, in-shell Browser suggestions and a close event before modal, download, scroll or route handoff.",
  chartRule: "Charts stay chart-first: pointer capture waits for the dead-zone, drag baseline is reset per interaction, and no Orbit layer can mount inside Real Markets yet.",
  marketRule: "Real Markets expands provider-ready coverage while every symbol still needs official provider timestamp, session calendar and second-source drift before live wording.",
  pdfRule: "Lens preview and downloaded PDF use one resolved payload, one locale, one field order and one checksum lane.",
  aiRule: "Velmère AI can describe only source state, source age, provider drift, security boundary, research boundary and next verification step.",
  securityRule: "Security copy stays simple: layered controls, redacted internals, signer boundary, rate limit, audit log, source freshness and evidence export.",
  researchRule: "Research Lab stays an experimental replication surface: claim, test, falsify, document and keep public wording conservative until independent review.",
} as const;

export function pass417SafeText(value: unknown, fallback = "—"): string {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : fallback;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "symbol" || typeof value === "function") return fallback;
  if (Array.isArray(value)) {
    const text = value.map((entry) => pass417SafeText(entry, "")).filter(Boolean).join(" · ");
    return text || fallback;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const preferred = [record.price, record.change, record.value, record.label, record.amount, record.state, record.source]
      .map((entry) => pass417SafeText(entry, ""))
      .filter(Boolean);
    return preferred.join(" · ") || pass416SafeText(value, fallback);
  }
  return pass416SafeText(value, fallback);
}

export function pass417NormalizeSuggestionKey(value: string): string {
  return value.replace(/[^a-z0-9./:_-]+/gi, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

export function pass417ClampSuggestions<T>(items: T[], keyOf: (item: T) => string, limit = 3): T[] {
  return pass416ClampSuggestions(items, (item) => pass417NormalizeSuggestionKey(keyOf(item)), Math.min(3, Math.max(1, limit)));
}

export const pass417AssetVisualPatch: Record<string, VisualPatch> = {
  "^GSPC": { label: "S&P 500 Index", glyph: "S5", primary: "#111827", secondary: "#38bdf8" },
  "^IXIC": { label: "Nasdaq Composite", glyph: "NQ", primary: "#1e1b4b", secondary: "#a78bfa" },
  "^DJI": { label: "Dow Jones", glyph: "DJ", primary: "#0f172a", secondary: "#f8fafc" },
  "^RUT": { label: "Russell 2000", glyph: "RT", primary: "#0f766e", secondary: "#f8fafc" },
  "^GDAXI": { label: "DAX", glyph: "DX", primary: "#111827", secondary: "#facc15" },
  "^STOXX50E": { label: "Euro Stoxx 50", glyph: "SX", primary: "#1d4ed8", secondary: "#f8fafc" },
  "^N225": { label: "Nikkei 225", glyph: "NK", primary: "#f8fafc", secondary: "#dc2626", text: "#111" },
  "^HSI": { label: "Hang Seng", glyph: "HS", primary: "#dc2626", secondary: "#facc15" },
  "EUR/HUF": { label: "Euro / Forint", glyph: "€H", primary: "#166534", secondary: "#dc2626" },
  "EUR/RON": { label: "Euro / Leu", glyph: "€R", primary: "#1d4ed8", secondary: "#facc15" },
  "USD/KRW": { label: "Dollar / Won", glyph: "$W", primary: "#1d4ed8", secondary: "#dc2626" },
  "USD/SGD": { label: "Dollar / Singapore Dollar", glyph: "$S", primary: "#dc2626", secondary: "#f8fafc" },
  "COFFEE": { label: "Coffee reference", glyph: "CF", primary: "#7c2d12", secondary: "#facc15" },
  "COCOA": { label: "Cocoa reference", glyph: "CC", primary: "#78350f", secondary: "#f59e0b" },
  "CORN": { label: "Corn reference", glyph: "CO", primary: "#facc15", secondary: "#111827", text: "#111" },
  "SOYBEAN": { label: "Soybean reference", glyph: "SY", primary: "#65a30d", secondary: "#111827" },
  "SCHH": { label: "Schwab REIT ETF", glyph: "SH", primary: "#0f766e", secondary: "#f8fafc" },
  "REET": { label: "Global REIT ETF", glyph: "RE", primary: "#0f766e", secondary: "#facc15" },
  "EEM": { label: "Emerging Markets ETF", glyph: "EM", primary: "#0f172a", secondary: "#22c55e" },
  "ACWI": { label: "All Country World ETF", glyph: "AW", primary: "#1d4ed8", secondary: "#f8fafc" },
  "SMH": { label: "Semiconductor ETF", glyph: "SM", primary: "#4c1d95", secondary: "#a78bfa" },
  "CIBR": { label: "Cybersecurity ETF", glyph: "CB", primary: "#0f172a", secondary: "#38bdf8" },
  "BOTZ": { label: "Robotics ETF", glyph: "BZ", primary: "#1e293b", secondary: "#22d3ee" },
  "AIQ": { label: "AI ETF", glyph: "AI", primary: "#111827", secondary: "#a78bfa" },
};

export const pass417PseudoPricePatch: Record<string, PseudoPatch> = {
  "^GSPC": { price: "index", change: "provider" },
  "^IXIC": { price: "index", change: "provider" },
  "^DJI": { price: "index", change: "provider" },
  "^RUT": { price: "index", change: "provider" },
  "^GDAXI": { price: "index", change: "EU session" },
  "^STOXX50E": { price: "index", change: "EU session" },
  "^N225": { price: "index", change: "Asia session" },
  "^HSI": { price: "index", change: "Asia session" },
  "EUR/HUF": { price: "provider", change: "CEE FX" },
  "EUR/RON": { price: "provider", change: "CEE FX" },
  "USD/KRW": { price: "provider", change: "Asia FX" },
  "USD/SGD": { price: "provider", change: "Asia FX" },
  COFFEE: { price: "provider", change: "softs" },
  COCOA: { price: "provider", change: "softs" },
  CORN: { price: "provider", change: "grain" },
  SOYBEAN: { price: "provider", change: "grain" },
  SCHH: { price: "$22", change: "REIT" },
  REET: { price: "$25", change: "global REIT" },
  EEM: { price: "$43", change: "EM ETF" },
  ACWI: { price: "$111", change: "world ETF" },
  SMH: { price: "$260", change: "semis" },
  CIBR: { price: "$59", change: "cyber" },
  BOTZ: { price: "$31", change: "robotics" },
  AIQ: { price: "$37", change: "AI" },
};

export function buildPass417MarketCoverageUniverse(): UniversalAssetRow[] {
  return [
    row({ id: "pass417-gspc", rank: 1600, symbol: "^GSPC", name: "S&P 500 Index", assetClass: "etf", riskPressure: 31, sparkTone: "flat" }),
    row({ id: "pass417-ixic", rank: 1601, symbol: "^IXIC", name: "Nasdaq Composite", assetClass: "etf", riskPressure: 37, sparkTone: "watch" }),
    row({ id: "pass417-dji", rank: 1602, symbol: "^DJI", name: "Dow Jones Industrial Average", assetClass: "etf", riskPressure: 30, sparkTone: "flat" }),
    row({ id: "pass417-rut", rank: 1603, symbol: "^RUT", name: "Russell 2000 Index", assetClass: "etf", riskPressure: 43, sparkTone: "watch" }),
    row({ id: "pass417-gdaxi", rank: 1604, symbol: "^GDAXI", name: "DAX Index", assetClass: "etf", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass417-stoxx50e", rank: 1605, symbol: "^STOXX50E", name: "Euro Stoxx 50", assetClass: "etf", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass417-n225", rank: 1606, symbol: "^N225", name: "Nikkei 225", assetClass: "etf", riskPressure: 38, sparkTone: "watch" }),
    row({ id: "pass417-hsi", rank: 1607, symbol: "^HSI", name: "Hang Seng Index", assetClass: "etf", riskPressure: 46, sparkTone: "watch" }),
    row({ id: "pass417-eurhuf", rank: 1608, symbol: "EUR/HUF", name: "Euro / Hungarian Forint", assetClass: "fx", riskPressure: 39, sparkTone: "watch" }),
    row({ id: "pass417-eurron", rank: 1609, symbol: "EUR/RON", name: "Euro / Romanian Leu", assetClass: "fx", riskPressure: 33, sparkTone: "flat" }),
    row({ id: "pass417-usdkrw", rank: 1610, symbol: "USD/KRW", name: "Dollar / Korean Won", assetClass: "fx", riskPressure: 40, sparkTone: "watch" }),
    row({ id: "pass417-usdsgd", rank: 1611, symbol: "USD/SGD", name: "Dollar / Singapore Dollar", assetClass: "fx", riskPressure: 32, sparkTone: "flat" }),
    row({ id: "pass417-coffee", rank: 1612, symbol: "COFFEE", name: "Coffee reference", assetClass: "commodity", riskPressure: 48, sparkTone: "watch" }),
    row({ id: "pass417-cocoa", rank: 1613, symbol: "COCOA", name: "Cocoa reference", assetClass: "commodity", riskPressure: 52, sparkTone: "watch" }),
    row({ id: "pass417-corn", rank: 1614, symbol: "CORN", name: "Corn reference", assetClass: "commodity", riskPressure: 37, sparkTone: "flat" }),
    row({ id: "pass417-soybean", rank: 1615, symbol: "SOYBEAN", name: "Soybean reference", assetClass: "commodity", riskPressure: 39, sparkTone: "flat" }),
    row({ id: "pass417-schh", rank: 1616, symbol: "SCHH", name: "Schwab US REIT ETF", assetClass: "real_estate", riskPressure: 38, sparkTone: "flat" }),
    row({ id: "pass417-reet", rank: 1617, symbol: "REET", name: "Global REIT ETF", assetClass: "real_estate", riskPressure: 40, sparkTone: "flat" }),
    row({ id: "pass417-eem", rank: 1618, symbol: "EEM", name: "Emerging Markets ETF", assetClass: "etf", riskPressure: 43, sparkTone: "watch" }),
    row({ id: "pass417-acwi", rank: 1619, symbol: "ACWI", name: "All Country World ETF", assetClass: "etf", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass417-smh", rank: 1620, symbol: "SMH", name: "Semiconductor ETF", assetClass: "etf", riskPressure: 44, sparkTone: "watch" }),
    row({ id: "pass417-cibr", rank: 1621, symbol: "CIBR", name: "Cybersecurity ETF", assetClass: "etf", riskPressure: 41, sparkTone: "watch" }),
    row({ id: "pass417-botz", rank: 1622, symbol: "BOTZ", name: "Robotics ETF", assetClass: "etf", riskPressure: 42, sparkTone: "watch" }),
    row({ id: "pass417-aiq", rank: 1623, symbol: "AIQ", name: "Artificial Intelligence ETF", assetClass: "etf", riskPressure: 45, sparkTone: "watch" }),
  ];
}

function modeLimit(mode: RealMarketMode) {
  if (mode === "basic") return 10;
  if (mode === "pro") return 14;
  return 20;
}

export function buildPass417StableAnalysisFields(input: {
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
}): Pass417StableField[] {
  const fields: Pass417StableField[] = [
    { id: "identity", label: "Instrument", value: pass417SafeText(input.symbol, "symbol"), copy: `${pass417SafeText(input.name, "asset")} · ${pass417SafeText(input.type, "market")}` },
    { id: "price", label: "Price lane", value: pass417SafeText(input.price, "provider pending"), copy: "React-safe text output; raw objects never render in JSX." },
    { id: "change", label: "Session change", value: pass417SafeText(input.change, "session pending"), copy: "Change is separated from price to avoid price/change object crashes." },
    { id: "risk", label: "Risk pressure", value: pass417SafeText(input.risk, "review"), copy: "Risk is a review signal, not an action prompt." },
    { id: "source", label: "Source state", value: pass417SafeText(input.source, "provider required"), copy: "Source age and provider timestamp decide public confidence." },
    { id: "proof", label: "Proof lane", value: pass417SafeText(input.proof, "checksum pending"), copy: "Preview and PDF mirror the same resolved payload checksum." },
    { id: "second", label: "Second source", value: pass417SafeText(input.second, "required"), copy: "Second-source drift must be visible before stronger wording." },
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

export const pass417SecurityPlainCopy = [
  "Velmère Security presents simple public layers: rate limits, signer boundaries, audit logs, provider freshness and redacted operational details.",
  "Velmère Research Lab stays a verification lab: test, replicate, falsify and document before promoting any mathematical or cryptographic claim.",
  "Velmère AI output is source-bound: no random filler, no fake-live language and no claims stronger than the available evidence.",
] as const;
