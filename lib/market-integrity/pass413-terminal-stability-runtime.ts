import type { UniversalAssetRow } from "./universal-asset-market-matrix";

export const PASS413_RUNTIME_CLOSE_EVENT = "velmere:pass413:terminal-stability-runtime-close";

type VisualPatch = { label: string; glyph: string; primary: string; secondary: string; text?: string; logoUrl?: string };
type MarketRowInput = Partial<UniversalAssetRow> & Pick<UniversalAssetRow, "id" | "rank" | "symbol" | "name" | "assetClass" | "riskPressure" | "sparkTone">;

type PseudoPatch = string | { price?: string | number; change?: string | number };

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
    sourceRhythm: input.sourceRhythm ?? `${lane} provider cadence · PASS413 stable runtime · max-3 search · chart-first modal · no Orbit kernel spawn`,
    priceLane: input.priceLane ?? `${lane} OHLCV-ready lane · source timestamp required before live wording`,
    volumeLane: input.volumeLane ?? `${lane} volume, spread, session calendar and fallback state stay visible before AI copy`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${lane} logo authority, provider timestamp, second source and checksum before confidence`,
    secondSourceLane: input.secondSourceLane ?? "primary provider ↔ second source ↔ checksum ↔ Lens preview ↔ PDF download",
    confidenceFloor: input.confidenceFloor ?? 94,
    adapterState: input.adapterState ?? "provider_required",
    humanCopy: input.humanCopy ?? `${input.symbol} routes through PASS413: stable search, source-bound AI, Shield-like chart modal and exact preview/download payload parity.`,
    nextAdapterStep: input.nextAdapterStep ?? "Wire official provider feed, logo authority, session calendar, reconnect state, second-source drift and checksum before public live status.",
    ...input,
  };
}

export const pass413TerminalStabilityRuntime = {
  version: "PASS413.terminal_stability_runtime",
  searchRule: "Shield, Browser and Real Markets show at most three suggestions, anchored to the input, with local-first scoring and no keystroke live fetch.",
  modalRule: "Real Markets keeps chart-first Basic/Pro/Advanced controls, but Orbit 360 stays paused until the modal kernel is stable.",
  reactRule: "Any object-shaped metric such as { price, change } is normalized into plain text before React render.",
  chartRule: "Charts avoid first-frame jumps by using a drag dead-zone and direction-locked pan state.",
  pdfRule: "Velmere Browser preview and downloaded PDF use the same resolved payload, locale and field order; no second random copy engine is allowed.",
  aiRule: "Velmere AI writes only from source state, data age, market lane, proof lane, security boundary, research boundary and next verification step.",
  securityRule: "Security copy stays public-safe: key boundary, signature proof, redaction, freshness, checksum and withheld internal methods.",
  researchRule: "Research Lab stays in experiment, audit, replication and falsification language until outside review exists.",
} as const;

export const pass413AssetVisualPatch: Record<string, VisualPatch> = {
  "MSCI": { label: "MSCI", glyph: "MS", primary: "#0f172a", secondary: "#60a5fa" },
  "SPGI": { label: "S&P Global", glyph: "SP", primary: "#111827", secondary: "#f59e0b" },
  "ICE": { label: "Intercontinental Exchange", glyph: "IC", primary: "#0f172a", secondary: "#38bdf8" },
  "CME": { label: "CME Group", glyph: "CM", primary: "#1e3a8a", secondary: "#f8fafc" },
  "DB1.DE": { label: "Deutsche Börse", glyph: "DB", primary: "#111827", secondary: "#facc15" },
  "LSEG.L": { label: "London Stock Exchange Group", glyph: "LS", primary: "#111827", secondary: "#c084fc" },
  "CRWD": { label: "CrowdStrike", glyph: "CR", primary: "#dc2626", secondary: "#111827" },
  "PANW": { label: "Palo Alto Networks", glyph: "PA", primary: "#f97316", secondary: "#111827" },
  "NET": { label: "Cloudflare", glyph: "CF", primary: "#f97316", secondary: "#f8fafc", text: "#111" },
  "ZS": { label: "Zscaler", glyph: "ZS", primary: "#2563eb", secondary: "#111827" },
  "EUR/CZK": { label: "Euro / Czech Koruna", glyph: "CZK", primary: "#2563eb", secondary: "#dc2626" },
  "USD/CZK": { label: "Dollar / Czech Koruna", glyph: "CZK", primary: "#16a34a", secondary: "#dc2626" },
  "EUR/HUF": { label: "Euro / Forint", glyph: "HUF", primary: "#2563eb", secondary: "#16a34a" },
  "USD/HUF": { label: "Dollar / Forint", glyph: "HUF", primary: "#16a34a", secondary: "#f8fafc", text: "#111" },
  "EUR/DKK": { label: "Euro / Danish Krone", glyph: "DKK", primary: "#2563eb", secondary: "#dc2626" },
  "USD/DKK": { label: "Dollar / Danish Krone", glyph: "DKK", primary: "#16a34a", secondary: "#dc2626" },
  "URANIUM": { label: "Uranium Reference", glyph: "U", primary: "#65a30d", secondary: "#111827" },
  "ALUMINUM": { label: "Aluminum Reference", glyph: "AL", primary: "#94a3b8", secondary: "#111827" },
  "LITHIUM": { label: "Lithium Reference", glyph: "LI", primary: "#e5e7eb", secondary: "#0f172a", text: "#111" },
  "EQIX": { label: "Equinix", glyph: "EQ", primary: "#dc2626", secondary: "#111827" },
  "DLR": { label: "Digital Realty", glyph: "DL", primary: "#0f766e", secondary: "#f8fafc" },
  "PLD": { label: "Prologis", glyph: "PL", primary: "#1d4ed8", secondary: "#f8fafc" },
  "AMT": { label: "American Tower", glyph: "AT", primary: "#0f172a", secondary: "#facc15" },
  "XLK": { label: "Technology Select Sector SPDR", glyph: "TK", primary: "#0f172a", secondary: "#60a5fa" },
};

export const pass413PseudoPricePatch: Record<string, PseudoPatch> = {
  MSCI: { price: "$581.20", change: "+0.4%" },
  SPGI: { price: "$489.10", change: "+0.7%" },
  ICE: { price: "$154.10", change: "+0.2%" },
  CME: { price: "$228.80", change: "-0.1%" },
  "DB1.DE": { price: "€211.20", change: "+0.2%" },
  "LSEG.L": { price: "9,430p", change: "+0.1%" },
  CRWD: { price: "$345", change: "+0.6%" },
  PANW: { price: "$305", change: "+0.4%" },
  NET: { price: "$92", change: "+0.7%" },
  ZS: { price: "$187", change: "+0.5%" },
  "EUR/CZK": { price: "24.73", change: "flat" },
  "USD/CZK": { price: "22.93", change: "+0.1%" },
  "EUR/HUF": { price: "388.40", change: "+0.1%" },
  "USD/HUF": { price: "359.10", change: "+0.1%" },
  "EUR/DKK": { price: "7.46", change: "flat" },
  "USD/DKK": { price: "6.91", change: "+0.1%" },
  URANIUM: { price: "$90", change: "+0.4%" },
  ALUMINUM: { price: "$2,590", change: "+0.2%" },
  LITHIUM: { price: "provider", change: "reference" },
  EQIX: { price: "$781", change: "+0.2%" },
  DLR: { price: "$141", change: "+0.2%" },
  PLD: { price: "$112", change: "+0.1%" },
  AMT: { price: "$198", change: "+0.1%" },
  XLK: { price: "$219.90", change: "+0.3%" },
};

export function buildPass413MarketCoverageUniverse(): UniversalAssetRow[] {
  return [
    row({ id: "pass413-msci", rank: 1352, symbol: "MSCI", name: "MSCI", assetClass: "stock", riskPressure: 32, sparkTone: "flat" }),
    row({ id: "pass413-spgi", rank: 1353, symbol: "SPGI", name: "S&P Global", assetClass: "stock", riskPressure: 31, sparkTone: "flat" }),
    row({ id: "pass413-ice", rank: 1354, symbol: "ICE", name: "Intercontinental Exchange", assetClass: "stock", riskPressure: 29, sparkTone: "flat" }),
    row({ id: "pass413-cme", rank: 1355, symbol: "CME", name: "CME Group", assetClass: "stock", riskPressure: 30, sparkTone: "flat" }),
    row({ id: "pass413-db1", rank: 1356, symbol: "DB1.DE", name: "Deutsche Börse", assetClass: "stock", riskPressure: 29, sparkTone: "flat" }),
    row({ id: "pass413-lseg", rank: 1357, symbol: "LSEG.L", name: "London Stock Exchange Group", assetClass: "stock", riskPressure: 30, sparkTone: "flat" }),
    row({ id: "pass413-crwd", rank: 1358, symbol: "CRWD", name: "CrowdStrike", assetClass: "stock", riskPressure: 44, sparkTone: "watch" }),
    row({ id: "pass413-panw", rank: 1359, symbol: "PANW", name: "Palo Alto Networks", assetClass: "stock", riskPressure: 39, sparkTone: "flat" }),
    row({ id: "pass413-net", rank: 1360, symbol: "NET", name: "Cloudflare", assetClass: "stock", riskPressure: 42, sparkTone: "watch" }),
    row({ id: "pass413-zs", rank: 1361, symbol: "ZS", name: "Zscaler", assetClass: "stock", riskPressure: 40, sparkTone: "watch" }),
    row({ id: "pass413-eurczk", rank: 1362, symbol: "EUR/CZK", name: "Euro / Czech Koruna", assetClass: "fx", riskPressure: 33, sparkTone: "flat" }),
    row({ id: "pass413-usdczk", rank: 1363, symbol: "USD/CZK", name: "Dollar / Czech Koruna", assetClass: "fx", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass413-eurhuf", rank: 1364, symbol: "EUR/HUF", name: "Euro / Hungarian Forint", assetClass: "fx", riskPressure: 42, sparkTone: "watch" }),
    row({ id: "pass413-usdhuf", rank: 1365, symbol: "USD/HUF", name: "Dollar / Hungarian Forint", assetClass: "fx", riskPressure: 43, sparkTone: "watch" }),
    row({ id: "pass413-eurdkk", rank: 1366, symbol: "EUR/DKK", name: "Euro / Danish Krone", assetClass: "fx", riskPressure: 24, sparkTone: "flat" }),
    row({ id: "pass413-usddkk", rank: 1367, symbol: "USD/DKK", name: "Dollar / Danish Krone", assetClass: "fx", riskPressure: 31, sparkTone: "flat" }),
    row({ id: "pass413-uranium", rank: 1368, symbol: "URANIUM", name: "Uranium reference", assetClass: "commodity", riskPressure: 51, sparkTone: "watch" }),
    row({ id: "pass413-aluminum", rank: 1369, symbol: "ALUMINUM", name: "Aluminum reference", assetClass: "commodity", riskPressure: 38, sparkTone: "flat" }),
    row({ id: "pass413-lithium", rank: 1370, symbol: "LITHIUM", name: "Lithium reference", assetClass: "commodity", riskPressure: 47, sparkTone: "watch" }),
    row({ id: "pass413-eqix", rank: 1371, symbol: "EQIX", name: "Equinix", assetClass: "real_estate", riskPressure: 32, sparkTone: "flat" }),
    row({ id: "pass413-dlr", rank: 1372, symbol: "DLR", name: "Digital Realty", assetClass: "real_estate", riskPressure: 33, sparkTone: "flat" }),
    row({ id: "pass413-pld", rank: 1373, symbol: "PLD", name: "Prologis", assetClass: "real_estate", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass413-amt", rank: 1374, symbol: "AMT", name: "American Tower", assetClass: "real_estate", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass413-xlk", rank: 1375, symbol: "XLK", name: "Technology Select Sector SPDR", assetClass: "etf", riskPressure: 37, sparkTone: "flat" }),
  ];
}

export const pass413SecurityPlainCopy = [
  "Public security page: keys stay outside the browser report, signatures and source timestamps are checked at the boundary, internal methods stay withheld.",
  "The interface should show what is verified, what is pending and what needs a second source instead of using dramatic copy.",
  "Research Lab remains a test bench for audit, replication and falsification; stronger claims need external review.",
] as const;
