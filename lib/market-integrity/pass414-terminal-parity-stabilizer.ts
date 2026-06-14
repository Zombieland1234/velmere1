import type { UniversalAssetRow } from "./universal-asset-market-matrix";

export const PASS414_RUNTIME_CLOSE_EVENT = "velmere:pass414:terminal-parity-stabilizer-close";

type VisualPatch = { label: string; glyph: string; primary: string; secondary: string; text?: string; logoUrl?: string };
type MarketRowInput = Partial<UniversalAssetRow> & Pick<UniversalAssetRow, "id" | "rank" | "symbol" | "name" | "assetClass" | "riskPressure" | "sparkTone">;
type RealMarketMode = "basic" | "pro" | "advanced";
export type Pass414AnalysisField = { id: string; label: string; value: string; copy: string };

type PseudoPatch = string | number | { price?: string | number; change?: string | number; value?: string | number; label?: string | number };

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
    sourceRhythm: input.sourceRhythm ?? `${lane} provider cadence · PASS414 parity stabilizer · max-3 search · chart-first modal · Orbit paused`,
    priceLane: input.priceLane ?? `${lane} OHLCV-ready lane · live wording blocked until provider timestamp and session calendar exist`,
    volumeLane: input.volumeLane ?? `${lane} volume, spread, session calendar, fallback and stale-state are separated before AI copy`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${lane} logo authority, provider timestamp, second source, checksum and locale snapshot before confidence`,
    secondSourceLane: input.secondSourceLane ?? "primary provider ↔ second source ↔ drift check ↔ Lens preview ↔ PDF download",
    confidenceFloor: input.confidenceFloor ?? 95,
    adapterState: input.adapterState ?? "provider_required",
    humanCopy: input.humanCopy ?? `${input.symbol} routes through PASS414: stable input-anchored search, object-safe metrics, chart-first review and exact Browser PDF parity.`,
    nextAdapterStep: input.nextAdapterStep ?? "Wire official provider, logo authority, session calendar, reconnect state, second-source drift and checksum before public live status.",
    ...input,
  };
}

export const pass414TerminalParityStabilizer = {
  version: "PASS414.terminal_parity_stabilizer",
  searchRule: "Shield, Browser and Real Markets expose exactly three suggestions, scored locally, anchored to the input and closed before modal/pdf/route transitions.",
  modalRule: "Real Markets keeps the Shield-style chart modal but Orbit 360 stays disabled; Basic/Pro/Advanced render deterministic 10/14/20 field output instead of spawning neural layers.",
  metricRule: "Every pseudo metric, provider metric or mixed { price, change } object is serialized into text before React render.",
  chartRule: "Charts use pointer capture, preventDefault and a drag dead-zone to remove first-frame jumps.",
  pdfRule: "Browser preview and downloaded PDF are generated from one locale-aware resolved payload with identical section order.",
  aiRule: "Velmère AI must write from source state, lineage, freshness, proof lane, security boundary and next verification step only.",
  researchRule: "Research Lab keeps public wording in audit, replication, falsification and experiment language until independent review exists.",
} as const;

export function pass414SafeMetricText(value: unknown, fallback = "—"): string {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (value && typeof value === "object") {
    const record = value as { price?: unknown; change?: unknown; value?: unknown; label?: unknown; amount?: unknown };
    return pass414SafeMetricText(record.price ?? record.change ?? record.value ?? record.label ?? record.amount, fallback);
  }
  return fallback;
}

export const pass414AssetVisualPatch: Record<string, VisualPatch> = {
  "BTC.D": { label: "Bitcoin Dominance", glyph: "BD", primary: "#f59e0b", secondary: "#111827" },
  "TOTAL": { label: "Crypto Total Market", glyph: "Σ", primary: "#0f172a", secondary: "#38bdf8" },
  "TOTAL2": { label: "Crypto ex-BTC", glyph: "T2", primary: "#111827", secondary: "#a78bfa" },
  "DXY": { label: "US Dollar Index", glyph: "DX", primary: "#16a34a", secondary: "#f8fafc", text: "#111" },
  "VIX": { label: "Volatility Index", glyph: "VX", primary: "#dc2626", secondary: "#111827" },
  "US10Y": { label: "US 10Y Yield", glyph: "10Y", primary: "#0f172a", secondary: "#facc15" },
  "DE10Y": { label: "Germany 10Y Yield", glyph: "DE", primary: "#111827", secondary: "#facc15" },
  "EUR/CHF": { label: "Euro / Swiss Franc", glyph: "CHF", primary: "#2563eb", secondary: "#dc2626" },
  "USD/CHF": { label: "Dollar / Swiss Franc", glyph: "CHF", primary: "#16a34a", secondary: "#dc2626" },
  "EUR/JPY": { label: "Euro / Yen", glyph: "JPY", primary: "#2563eb", secondary: "#f8fafc", text: "#111" },
  "USD/MXN": { label: "Dollar / Mexican Peso", glyph: "MXN", primary: "#16a34a", secondary: "#dc2626" },
  "COPPER": { label: "Copper", glyph: "CU", primary: "#b45309", secondary: "#111827" },
  "NATGAS": { label: "Natural Gas", glyph: "NG", primary: "#2563eb", secondary: "#f8fafc" },
  "WHEAT": { label: "Wheat", glyph: "WH", primary: "#ca8a04", secondary: "#111827" },
  "IYR": { label: "US Real Estate ETF", glyph: "IY", primary: "#0f766e", secondary: "#f8fafc" },
  "VNQ": { label: "Vanguard Real Estate", glyph: "VQ", primary: "#991b1b", secondary: "#f8fafc" },
  "EUNL.DE": { label: "iShares Core MSCI World", glyph: "IW", primary: "#111827", secondary: "#60a5fa" },
  "EXSA.DE": { label: "Euro Stoxx 600 ETF", glyph: "EU", primary: "#1d4ed8", secondary: "#facc15" },
  "CS.PA": { label: "AXA", glyph: "AX", primary: "#1d4ed8", secondary: "#f8fafc" },
  "BNP.PA": { label: "BNP Paribas", glyph: "BP", primary: "#16a34a", secondary: "#f8fafc" },
  "ASML.AS": { label: "ASML", glyph: "AS", primary: "#0f172a", secondary: "#f97316" },
  "SAP.DE": { label: "SAP", glyph: "SA", primary: "#2563eb", secondary: "#f8fafc" },
  "ADYEN.AS": { label: "Adyen", glyph: "AY", primary: "#16a34a", secondary: "#111827" },
  "0700.HK": { label: "Tencent", glyph: "TC", primary: "#16a34a", secondary: "#111827" },
};

export const pass414PseudoPricePatch: Record<string, PseudoPatch> = {
  "BTC.D": { price: "dominance", change: "watch" },
  TOTAL: { price: "crypto cap", change: "provider" },
  TOTAL2: { price: "ex-BTC cap", change: "provider" },
  DXY: { price: "104.20", change: "+0.1%" },
  VIX: { price: "14.8", change: "watch" },
  US10Y: { price: "4.35%", change: "+0.02" },
  DE10Y: { price: "2.62%", change: "+0.01" },
  "EUR/CHF": { price: "0.94", change: "flat" },
  "USD/CHF": { price: "0.90", change: "+0.1%" },
  "EUR/JPY": { price: "169.10", change: "+0.1%" },
  "USD/MXN": { price: "18.40", change: "flat" },
  COPPER: { price: "$4.55/lb", change: "+0.2%" },
  NATGAS: { price: "$3.10", change: "watch" },
  WHEAT: { price: "$6.25", change: "watch" },
  IYR: { price: "$88.20", change: "+0.1%" },
  VNQ: { price: "$86.90", change: "+0.1%" },
  "EUNL.DE": { price: "€95.40", change: "+0.2%" },
  "EXSA.DE": { price: "€52.10", change: "+0.1%" },
  "CS.PA": { price: "€35.20", change: "+0.2%" },
  "BNP.PA": { price: "€67.10", change: "+0.1%" },
  "ASML.AS": { price: "€710", change: "+0.3%" },
  "SAP.DE": { price: "€185", change: "+0.2%" },
  "ADYEN.AS": { price: "€1,360", change: "+0.4%" },
  "0700.HK": { price: "HK$382", change: "+0.2%" },
};

export function buildPass414MarketCoverageUniverse(): UniversalAssetRow[] {
  return [
    row({ id: "pass414-btc-d", rank: 1376, symbol: "BTC.D", name: "Bitcoin dominance", assetClass: "crypto", riskPressure: 39, sparkTone: "watch" }),
    row({ id: "pass414-total", rank: 1377, symbol: "TOTAL", name: "Crypto total market cap", assetClass: "crypto", riskPressure: 41, sparkTone: "watch" }),
    row({ id: "pass414-total2", rank: 1378, symbol: "TOTAL2", name: "Crypto market cap excluding BTC", assetClass: "crypto", riskPressure: 43, sparkTone: "watch" }),
    row({ id: "pass414-dxy", rank: 1379, symbol: "DXY", name: "US Dollar Index", assetClass: "fx", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass414-vix", rank: 1380, symbol: "VIX", name: "Volatility Index", assetClass: "stock", riskPressure: 49, sparkTone: "watch" }),
    row({ id: "pass414-us10y", rank: 1381, symbol: "US10Y", name: "US 10Y Yield", assetClass: "stock", riskPressure: 37, sparkTone: "flat" }),
    row({ id: "pass414-de10y", rank: 1382, symbol: "DE10Y", name: "Germany 10Y Yield", assetClass: "stock", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass414-eurchf", rank: 1383, symbol: "EUR/CHF", name: "Euro / Swiss Franc", assetClass: "fx", riskPressure: 28, sparkTone: "flat" }),
    row({ id: "pass414-usdchf", rank: 1384, symbol: "USD/CHF", name: "Dollar / Swiss Franc", assetClass: "fx", riskPressure: 30, sparkTone: "flat" }),
    row({ id: "pass414-eurjpy", rank: 1385, symbol: "EUR/JPY", name: "Euro / Japanese Yen", assetClass: "fx", riskPressure: 42, sparkTone: "watch" }),
    row({ id: "pass414-usdmxn", rank: 1386, symbol: "USD/MXN", name: "Dollar / Mexican Peso", assetClass: "fx", riskPressure: 40, sparkTone: "watch" }),
    row({ id: "pass414-copper", rank: 1387, symbol: "COPPER", name: "Copper reference", assetClass: "commodity", riskPressure: 38, sparkTone: "flat" }),
    row({ id: "pass414-natgas", rank: 1388, symbol: "NATGAS", name: "Natural gas reference", assetClass: "commodity", riskPressure: 54, sparkTone: "watch" }),
    row({ id: "pass414-wheat", rank: 1389, symbol: "WHEAT", name: "Wheat reference", assetClass: "commodity", riskPressure: 47, sparkTone: "watch" }),
    row({ id: "pass414-iyr", rank: 1390, symbol: "IYR", name: "iShares U.S. Real Estate ETF", assetClass: "real_estate", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass414-vnq", rank: 1391, symbol: "VNQ", name: "Vanguard Real Estate ETF", assetClass: "real_estate", riskPressure: 33, sparkTone: "flat" }),
    row({ id: "pass414-eunl", rank: 1392, symbol: "EUNL.DE", name: "iShares Core MSCI World UCITS ETF", assetClass: "etf", riskPressure: 28, sparkTone: "flat" }),
    row({ id: "pass414-exsa", rank: 1393, symbol: "EXSA.DE", name: "iShares STOXX Europe 600 UCITS ETF", assetClass: "etf", riskPressure: 31, sparkTone: "flat" }),
    row({ id: "pass414-cs", rank: 1394, symbol: "CS.PA", name: "AXA", assetClass: "stock", riskPressure: 32, sparkTone: "flat" }),
    row({ id: "pass414-bnp", rank: 1395, symbol: "BNP.PA", name: "BNP Paribas", assetClass: "stock", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass414-asml", rank: 1396, symbol: "ASML.AS", name: "ASML", assetClass: "stock", riskPressure: 39, sparkTone: "flat" }),
    row({ id: "pass414-sap", rank: 1397, symbol: "SAP.DE", name: "SAP", assetClass: "stock", riskPressure: 29, sparkTone: "flat" }),
    row({ id: "pass414-adyen", rank: 1398, symbol: "ADYEN.AS", name: "Adyen", assetClass: "stock", riskPressure: 43, sparkTone: "watch" }),
    row({ id: "pass414-tencent", rank: 1399, symbol: "0700.HK", name: "Tencent Holdings", assetClass: "stock", riskPressure: 41, sparkTone: "watch" }),
  ];
}

export function buildPass414StableAnalysisFields(input: {
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
}): Pass414AnalysisField[] {
  const target = input.mode === "advanced" ? 20 : input.mode === "pro" ? 14 : 10;
  const base: Pass414AnalysisField[] = [
    { id: "identity", label: "Identity", value: input.symbol, copy: `${input.name} · ${input.type}` },
    { id: "price", label: "Price lane", value: input.price, copy: "Rendered as text only; object-shaped metrics are blocked." },
    { id: "change", label: "Change lane", value: input.change, copy: "Short movement label, no prediction copy." },
    { id: "risk", label: "Risk pressure", value: `${input.risk}/100`, copy: "Pressure score shown as context, not a promise." },
    { id: "source", label: "Source state", value: input.source, copy: "Live wording remains locked until provider timestamp exists." },
    { id: "proof", label: "Proof lane", value: input.proof, copy: "Evidence type required before AI confidence." },
    { id: "second", label: "Second source", value: input.second, copy: "Cross-check required before public final wording." },
    { id: "freshness", label: "Freshness", value: "timestamp gate", copy: "Provider age and reconnect state must stay visible." },
    { id: "session", label: "Session calendar", value: "market hours", copy: "Stocks, FX and commodities require session-aware labels." },
    { id: "pdf", label: "Lens parity", value: "same payload", copy: "Preview and PDF download must keep identical order and locale." },
    { id: "spread", label: "Spread", value: "adapter required", copy: "Spread and depth stay separate from price copy." },
    { id: "liquidity", label: "Liquidity", value: "provider lane", copy: "Liquidity cannot be inferred from chart color alone." },
    { id: "logo", label: "Logo authority", value: "visual patch", copy: "Real icons fall back to deterministic visual patches." },
    { id: "drift", label: "Provider drift", value: "compare", copy: "Primary and secondary source disagreement is surfaced." },
    { id: "checksum", label: "Checksum", value: "payload seal", copy: "The AI brief references a stable payload checksum." },
    { id: "locale", label: "Locale", value: "PL / EN / DE", copy: "Language follows the page locale before PDF generation." },
    { id: "security", label: "Security boundary", value: "redacted", copy: "Internal defensive methods stay withheld from public copy." },
    { id: "research", label: "Research boundary", value: "audit mode", copy: "Prime/Riemann work stays experimental until external review." },
    { id: "next", label: "Next adapter", value: "provider wire", copy: "Next step is official feed + timestamp + second-source drift." },
    { id: "status", label: "Runtime status", value: "Orbit paused", copy: "No 3D brain is mounted in the modal during stability runtime." },
  ];
  return base.slice(0, target);
}
