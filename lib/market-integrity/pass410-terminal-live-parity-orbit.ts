import type { UniversalAssetRow } from "./universal-asset-market-matrix";
import {
  PASS409_RUNTIME_CLOSE_EVENT,
  buildPass409TerminalSourceTruthReadout,
  pass409TerminalSourceTruthOrbit,
  type Pass409AuditMode,
} from "./pass409-terminal-source-truth-orbit";

export const PASS410_RUNTIME_CLOSE_EVENT = "velmere:pass410:terminal-live-parity-orbit-close";
export type Pass410AuditMode = Pass409AuditMode;
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
    sourceRhythm: input.sourceRhythm ?? `${lane} provider cadence · live parity orbit · reconnect/freshness guard · checksum · locale lock`,
    priceLane: input.priceLane ?? `${lane} Shield-grade candles · wick/body/volume grammar · timeframe lock · Orbit 360 modal mirror`,
    volumeLane: input.volumeLane ?? `${lane} liquidity, spread proxy, venue/session calendar, fallback flag and data age stay visible before AI tone`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${lane} issuer, venue, methodology, icon authority, provider timestamp and exact payload proof are shown before confidence`,
    secondSourceLane: input.secondSourceLane ?? "provider ↔ second source ↔ close bus ↔ Brain modal ↔ preview ↔ PDF exact payload ↔ checksum ↔ locale",
    confidenceFloor: input.confidenceFloor ?? 94,
    adapterState: input.adapterState ?? "provider_required",
    humanCopy: input.humanCopy ?? `${input.symbol} is routed through PASS410: live parity orbit, one close bus, Shield-grade chart, Orbit 360 Brain and exact locale payload across search, modal, preview and download.`,
    nextAdapterStep: input.nextAdapterStep ?? "Wire live OHLCV, official icon authority, market calendar, second-source drift, payload checksum and provider reconnect before raising live confidence.",
    ...input,
  };
}

export const pass410TerminalLiveParityOrbit = {
  version: "PASS410.terminal_live_parity_orbit",
  runtimeRule: "One close bus shuts Browser, Shield, Shield Map and Real Markets suggestions before modal open, PDF forge, preview, download, scroll, tab switch and route handoff.",
  marketRule: "Real Markets mirrors Shield: trusted icon, advanced candles, timeframe, Basic/Pro/Advanced, Orbit 360 Brain, concise output fields and provider-required live boundary.",
  pdfRule: "Preview and downloaded PDF must be rendered from the exact same resolved payload: symbol, locale, asset class, field order, source truth, source proof, copy and public boundary.",
  brainRule: "The VLM coin receives provider state, candle state, second-source drift, security boundary, research boundary and checksum before morphing into Basic 10, Pro 14 or Advanced 20 fields.",
  copyRule: "Public copy stays compact: source, chart, proof, security boundary, research boundary, locale, payload checksum and next verification step only.",
  securityRule: "Security copy stays simple and premium: private-key boundary, signature proof, entropy quality, redaction, provider truth and withheld internal methods.",
  launchRule: "Status is earned by exact payload, traceability, freshness and calm proof, never by fake scarcity, profit language or debug pass-history.",
  inheritedCloseBus: PASS409_RUNTIME_CLOSE_EVENT,
  previousVersion: pass409TerminalSourceTruthOrbit.version,
} as const;

export const pass410LiveParityTimeline = [
  { id: "close", label: "close bus", seconds: 0.02, copy: "Suggestions close before search submit, modal open, PDF forge, preview, download, scroll, tab switch and route handoff." },
  { id: "resolve", label: "resolve once", seconds: 0.10, copy: "Symbol, locale, asset class, title, provider state, fallback flags and output order resolve once." },
  { id: "checksum", label: "payload checksum", seconds: 0.18, copy: "The same resolved payload is tagged for search, modal, brain, preview and PDF download." },
  { id: "identity", label: "identity seal", seconds: 0.28, copy: "Icon, venue, market lane and source route lock before the AI Brain writes copy." },
  { id: "candles", label: "Shield candles", seconds: 0.44, copy: "Stocks, FX, ETF, commodities and REIT proxies use the same candle grammar as Shield." },
  { id: "calendar", label: "market calendar", seconds: 0.58, copy: "Session state is separated from narrative tone so stale overnight values do not look live." },
  { id: "freshness", label: "freshness rail", seconds: 0.76, copy: "Timestamp, cache age, reconnect state and second-source drift stay visible." },
  { id: "depth", label: "depth context", seconds: 1.02, copy: "Order-book depth and volume are treated as context, never as a hidden trading instruction." },
  { id: "orbit", label: "Orbit 360", seconds: 1.30, copy: "Blue source packets feed the VLM coin and neural shell instead of random cards." },
  { id: "security", label: "security boundary", seconds: 1.66, copy: "Private keys, signatures, entropy and redaction are explained without exposing internal scoring." },
  { id: "research", label: "research boundary", seconds: 2.04, copy: "Prime/RNG work remains framed as audit, replication and falsification." },
  { id: "locale", label: "locale lock", seconds: 2.42, copy: "PL, EN and DE labels resolve once and mirror into preview and downloaded PDF." },
  { id: "morph", label: "field morph", seconds: 2.94, copy: "The brain morphs into Basic 10, Pro 14 or Advanced 20 fields." },
  { id: "clean", label: "clean public UI", seconds: 3.48, copy: "Old pass-history stays hidden; only the newest public terminal remains visible." },
  { id: "proof", label: "proof first", seconds: 4.12, copy: "Premium pressure comes from proof, freshness and traceability instead of hype." },
  { id: "pdf", label: "PDF mirror", seconds: 4.82, copy: "Preview and download keep the same payload, order, language and proof boundary." },
  { id: "provider", label: "provider ready", seconds: 5.58, copy: "The next production step is provider wiring, not fake-live placeholders." },
  { id: "seal", label: "live parity seal", seconds: 6.44, copy: "The same resolved payload feeds search, modal, Brain, preview and download." },
] as const;

const localeLine: Record<"pl" | "en" | "de", string> = {
  pl: "Jeden payload zasila wyszukiwarkę, modal, Orbit Brain, podgląd i PDF; widok publiczny pokazuje źródła, wykres, dowód, granice i krótkie pola bez losowego copy.",
  en: "One payload powers search, modal, Orbit Brain, preview and PDF; the public surface shows source, chart, proof, boundaries and concise fields without random copy.",
  de: "Ein Payload speist Suche, Modal, Orbit Brain, Vorschau und PDF; die öffentliche Oberfläche zeigt Quelle, Chart, Nachweis, Grenzen und kurze Felder ohne Zufallstexte.",
};

export function buildPass410TerminalLiveParityReadout(input: {
  symbol: string;
  name: string;
  type: string;
  risk: number;
  source: string;
  mode: Pass410AuditMode;
  locale?: "pl" | "en" | "de";
}) {
  const base = buildPass409TerminalSourceTruthReadout(input);
  const count = input.mode === "advanced" ? 20 : input.mode === "pro" ? 14 : 10;
  const locale = input.locale ?? "en";
  return {
    version: pass410TerminalLiveParityOrbit.version,
    count,
    seconds: Math.max(base.seconds, 6.44) + 0.20,
    headline: `${input.symbol} · live parity orbit`,
    body: `${input.mode.toUpperCase()} uses one resolved payload, one close bus, one Shield-grade chart, one Orbit 360 VLM Brain and one locale-exact PDF mirror before ${count} fields appear. ${localeLine[locale]}`,
    fields: base.fields.slice(0, count).map((field, index) => ({
      ...field,
      value: index === 0 ? `${input.symbol} · live parity` : index === 1 ? `${input.source} · reconnect/freshness rail` : index === 2 ? `${input.mode.toUpperCase()} · ${count} fields` : index === 3 ? `${input.type} · Shield mirror` : index === 4 ? `${locale.toUpperCase()} · locale lock` : index === 5 ? "preview = download" : index === 6 ? "payload checksum" : index === 7 ? "market calendar" : field.value,
      copy: index === 0 ? `${input.name}: ${pass410TerminalLiveParityOrbit.pdfRule}` : index === 1 ? pass410TerminalLiveParityOrbit.runtimeRule : index === 2 ? pass410TerminalLiveParityOrbit.brainRule : index === 3 ? pass410TerminalLiveParityOrbit.marketRule : index === 4 ? localeLine[locale] : index === 5 ? "Preview, downloaded PDF and modal readout share one payload order, not a separate text generator." : index === 6 ? "Depth, spread, volume, session state and fallback state inform boundaries but never become a hidden trading instruction." : index === 7 ? "Stocks, FX and commodities need market calendar awareness before they can be described as live." : field.copy,
    })),
  };
}

export const pass410AssetVisualPatch: Record<string, VisualPatch> = {
  INTU: { label: "Intuit", glyph: "IN", primary: "#2563eb", secondary: "#f8fafc" },
  ADBE: { label: "Adobe", glyph: "AD", primary: "#fa0f00", secondary: "#111827" },
  TEAM: { label: "Atlassian", glyph: "AT", primary: "#0052cc", secondary: "#f8fafc" },
  HUBS: { label: "HubSpot", glyph: "HS", primary: "#ff7a59", secondary: "#111827", text: "#111" },
  TTD: { label: "Trade Desk", glyph: "TD", primary: "#111827", secondary: "#60a5fa" },
  RBLX: { label: "Roblox", glyph: "RB", primary: "#111827", secondary: "#f8fafc" },
  SPOT: { label: "Spotify", glyph: "SP", primary: "#1db954", secondary: "#111827", text: "#111" },
  SNAP: { label: "Snap", glyph: "SN", primary: "#fffc00", secondary: "#111827", text: "#111" },
  WDAY: { label: "Workday", glyph: "WD", primary: "#f4991a", secondary: "#111827", text: "#111" },
  ADSK: { label: "Autodesk", glyph: "AK", primary: "#0696d7", secondary: "#111827", text: "#111" },
  DELL: { label: "Dell", glyph: "DL", primary: "#0076ce", secondary: "#f8fafc" },
  HPQ: { label: "HP", glyph: "HP", primary: "#0096d6", secondary: "#111827", text: "#111" },
  "MC.PA": { label: "LVMH", glyph: "LV", primary: "#111827", secondary: "#d6b56d" },
  "RMS.PA": { label: "Hermes", glyph: "HR", primary: "#f37021", secondary: "#111827", text: "#111" },
  "CFR.SW": { label: "Richemont", glyph: "RC", primary: "#111827", secondary: "#d6b56d" },
  "PRX.AS": { label: "Prosus", glyph: "PX", primary: "#2563eb", secondary: "#f8fafc" },
  "NPN.JO": { label: "Naspers", glyph: "NP", primary: "#0f172a", secondary: "#60a5fa" },
  "005930.KS": { label: "Samsung", glyph: "SS", primary: "#1428a0", secondary: "#f8fafc" },
  "BIDU": { label: "Baidu", glyph: "BD", primary: "#2932e1", secondary: "#f8fafc" },
  "JD": { label: "JD.com", glyph: "JD", primary: "#e1251b", secondary: "#f8fafc" },
  "USD/DKK": { label: "Dollar / Danish Krone", glyph: "DKK", primary: "#b91c1c", secondary: "#f8fafc" },
  "EUR/DKK": { label: "Euro / Danish Krone", glyph: "DKK", primary: "#2563eb", secondary: "#dc2626" },
  "USD/HUF": { label: "Dollar / Forint", glyph: "HUF", primary: "#16a34a", secondary: "#dc2626" },
  "EUR/HUF": { label: "Euro / Forint", glyph: "HUF", primary: "#2563eb", secondary: "#16a34a" },
  "PLATINUM=F": { label: "Platinum Futures", glyph: "PT", primary: "#e5e7eb", secondary: "#64748b", text: "#111" },
  "PALLADIUM=F": { label: "Palladium Futures", glyph: "PD", primary: "#f8fafc", secondary: "#94a3b8", text: "#111" },
  "LUMBER=F": { label: "Lumber Futures", glyph: "LB", primary: "#7c2d12", secondary: "#f59e0b" },
  "VICI": { label: "VICI Properties", glyph: "VC", primary: "#7c3aed", secondary: "#f8fafc" },
  "O": { label: "Realty Income", glyph: "O", primary: "#0f766e", secondary: "#f8fafc" },
  "XLRE": { label: "Real Estate Select Sector", glyph: "XR", primary: "#166534", secondary: "#f8fafc" },
  "ARKQ": { label: "ARK Autonomous Tech ETF", glyph: "AQ", primary: "#111827", secondary: "#38bdf8" },
};

export const pass410PseudoPricePatch: Record<string, string> = {
  INTU: "$641.20", ADBE: "$512.40", TEAM: "$184.30", HUBS: "$594.80", TTD: "$91.60", RBLX: "$38.40", SPOT: "$309.10", SNAP: "$13.20", WDAY: "$247.80", ADSK: "$236.90", DELL: "$148.70", HPQ: "$36.20", "MC.PA": "€728.40", "RMS.PA": "€2,145", "CFR.SW": "CHF 141.20", "PRX.AS": "€36.90", "NPN.JO": "ZAR 3,980", "005930.KS": "₩78,400", BIDU: "$101.40", JD: "$31.80", "USD/DKK": "6.88", "EUR/DKK": "7.46", "USD/HUF": "361.40", "EUR/HUF": "392.70", "PLATINUM=F": "$1,030", "PALLADIUM=F": "$956", "LUMBER=F": "$528", VICI: "$29.20", O: "$54.80", XLRE: "$39.40", ARKQ: "$56.20",
};

export function buildPass410MarketCoverageUniverse(): UniversalAssetRow[] {
  return [
    row({ id: "pass410-intuit", rank: 1290, symbol: "INTU", name: "Intuit", assetClass: "stock", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass410-adobe", rank: 1291, symbol: "ADBE", name: "Adobe", assetClass: "stock", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass410-atlassian", rank: 1292, symbol: "TEAM", name: "Atlassian", assetClass: "stock", riskPressure: 42, sparkTone: "watch" }),
    row({ id: "pass410-hubspot", rank: 1293, symbol: "HUBS", name: "HubSpot", assetClass: "stock", riskPressure: 43, sparkTone: "watch" }),
    row({ id: "pass410-tradedesk", rank: 1294, symbol: "TTD", name: "The Trade Desk", assetClass: "stock", riskPressure: 45, sparkTone: "watch" }),
    row({ id: "pass410-roblox", rank: 1295, symbol: "RBLX", name: "Roblox", assetClass: "stock", riskPressure: 52, sparkTone: "watch" }),
    row({ id: "pass410-spotify", rank: 1296, symbol: "SPOT", name: "Spotify", assetClass: "stock", riskPressure: 39, sparkTone: "flat" }),
    row({ id: "pass410-snap", rank: 1297, symbol: "SNAP", name: "Snap", assetClass: "stock", riskPressure: 53, sparkTone: "watch" }),
    row({ id: "pass410-workday", rank: 1298, symbol: "WDAY", name: "Workday", assetClass: "stock", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass410-autodesk", rank: 1299, symbol: "ADSK", name: "Autodesk", assetClass: "stock", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass410-dell", rank: 1300, symbol: "DELL", name: "Dell Technologies", assetClass: "stock", riskPressure: 43, sparkTone: "watch" }),
    row({ id: "pass410-hp", rank: 1301, symbol: "HPQ", name: "HP", assetClass: "stock", riskPressure: 37, sparkTone: "flat" }),
    row({ id: "pass410-lvmh", rank: 1302, symbol: "MC.PA", name: "LVMH", assetClass: "stock", riskPressure: 32, sparkTone: "flat" }),
    row({ id: "pass410-hermes", rank: 1303, symbol: "RMS.PA", name: "Hermes", assetClass: "stock", riskPressure: 30, sparkTone: "flat" }),
    row({ id: "pass410-richemont", rank: 1304, symbol: "CFR.SW", name: "Richemont", assetClass: "stock", riskPressure: 33, sparkTone: "flat" }),
    row({ id: "pass410-prosus", rank: 1305, symbol: "PRX.AS", name: "Prosus", assetClass: "stock", riskPressure: 40, sparkTone: "watch" }),
    row({ id: "pass410-naspers", rank: 1306, symbol: "NPN.JO", name: "Naspers", assetClass: "stock", riskPressure: 42, sparkTone: "watch" }),
    row({ id: "pass410-samsung", rank: 1307, symbol: "005930.KS", name: "Samsung Electronics", assetClass: "stock", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass410-baidu", rank: 1308, symbol: "BIDU", name: "Baidu", assetClass: "stock", riskPressure: 48, sparkTone: "watch" }),
    row({ id: "pass410-jd", rank: 1309, symbol: "JD", name: "JD.com", assetClass: "stock", riskPressure: 47, sparkTone: "watch" }),
    row({ id: "pass410-usddkk", rank: 1310, symbol: "USD/DKK", name: "Dollar / Danish Krone", assetClass: "fx", riskPressure: 31, sparkTone: "flat" }),
    row({ id: "pass410-eurdkk", rank: 1311, symbol: "EUR/DKK", name: "Euro / Danish Krone", assetClass: "fx", riskPressure: 28, sparkTone: "flat" }),
    row({ id: "pass410-usdhuf", rank: 1312, symbol: "USD/HUF", name: "Dollar / Hungarian Forint", assetClass: "fx", riskPressure: 43, sparkTone: "watch" }),
    row({ id: "pass410-eurhuf", rank: 1313, symbol: "EUR/HUF", name: "Euro / Hungarian Forint", assetClass: "fx", riskPressure: 40, sparkTone: "watch" }),
    row({ id: "pass410-platinum", rank: 1314, symbol: "PLATINUM=F", name: "Platinum Futures", assetClass: "commodity", riskPressure: 42, sparkTone: "watch" }),
    row({ id: "pass410-palladium", rank: 1315, symbol: "PALLADIUM=F", name: "Palladium Futures", assetClass: "commodity", riskPressure: 50, sparkTone: "watch" }),
    row({ id: "pass410-lumber", rank: 1316, symbol: "LUMBER=F", name: "Lumber Futures", assetClass: "commodity", riskPressure: 47, sparkTone: "watch" }),
    row({ id: "pass410-vici", rank: 1317, symbol: "VICI", name: "VICI Properties", assetClass: "real_estate", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass410-realty-income", rank: 1318, symbol: "O", name: "Realty Income", assetClass: "real_estate", riskPressure: 33, sparkTone: "flat" }),
    row({ id: "pass410-xlre", rank: 1319, symbol: "XLRE", name: "Real Estate Select Sector SPDR", assetClass: "real_estate", riskPressure: 32, sparkTone: "flat" }),
    row({ id: "pass410-arkq", rank: 1320, symbol: "ARKQ", name: "ARK Autonomous Technology ETF", assetClass: "etf", riskPressure: 44, sparkTone: "watch" }),
  ];
}

export const pass410SecurityOnePageCopy = [
  "Private keys never enter the report; the public layer shows signature boundaries, redaction and source class only.",
  "Provider truth stays separate from AI tone: timestamp, cache age, fallback state, reconnect status, market calendar and second-source drift remain visible.",
  "Preview, modal and downloaded PDF share one resolved payload; separate random text generation is not allowed.",
  "Internal scoring methods stay withheld; the public surface shows source class, proof lane, redaction and next verification step.",
] as const;

export const pass410ResearchBridge = {
  headline: "Research Lab as live-parity discipline",
  lanes: ["finite numerical audit", "RNG/entropy testing", "signature boundary education", "replication pack", "falsification queue", "payload checksum mirror", "market-calendar boundary"],
  publicBoundary: "Velmere Research Lab can describe tests, reductions and hypotheses, but public copy must stay in audit/replication/falsification language until independent review exists.",
} as const;
