import type { UniversalAssetRow } from "./universal-asset-market-matrix";
import {
  PASS407_RUNTIME_CLOSE_EVENT,
  buildPass407TerminalPayloadIntegrityReadout,
  pass407TerminalPayloadIntegrityOrbit,
  type Pass407AuditMode,
} from "./pass407-terminal-exact-payload-orbit";

export const PASS408_RUNTIME_CLOSE_EVENT = "velmere:pass408:terminal-source-proof-orbit-close";
export type Pass408AuditMode = Pass407AuditMode;
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
    sourceRhythm: input.sourceRhythm ?? `${lane} provider cadence · source proof orbit · reconnect guard · cache-age badge · second-source drift`,
    priceLane: input.priceLane ?? `${lane} Shield-grade candles · wick/body/volume grammar · timeframe lock · modal mirror · PDF exact payload`,
    volumeLane: input.volumeLane ?? `${lane} liquidity, session volume, spread proxy, fallback flag and data age stay visible before AI tone`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${lane} issuer, venue, methodology, icon authority and provider timestamp are shown before confidence`,
    secondSourceLane: input.secondSourceLane ?? "provider ↔ second source ↔ search close bus ↔ Brain modal ↔ preview ↔ PDF payload checksum",
    confidenceFloor: input.confidenceFloor ?? 92,
    adapterState: input.adapterState ?? "provider_required",
    humanCopy: input.humanCopy ?? `${input.symbol} is routed through PASS408: source proof, one close bus, Shield-grade chart, Orbit 360 Brain and locale-exact PDF preview/download parity.`,
    nextAdapterStep: input.nextAdapterStep ?? "Attach live OHLCV provider, official icon authority, session calendar, payload checksum and second-source drift before raising live confidence.",
    ...input,
  };
}

export const pass408TerminalSourceProofOrbit = {
  version: "PASS408.terminal_source_proof_orbit",
  runtimeRule: "One close bus shuts Browser, Shield, Shield Map and Real Markets suggestions before modal open, PDF forge, PDF preview, PDF download, scroll, tab switch and route handoff.",
  marketRule: "Real Markets mirrors Shield: trusted icon, advanced candles, timeframe, Basic/Pro/Advanced, Orbit 360 Brain, concise field output and provider-required live boundary.",
  pdfRule: "Preview and downloaded PDF must be rendered from the same resolved payload: symbol, locale, asset class, section order, field order and deterministic copy.",
  brainRule: "The VLM coin receives source proof, candle state, second-source drift, security boundary, research boundary and payload exactness before morphing into Basic 10, Pro 14 or Advanced 20 fields.",
  copyRule: "Public copy stays compact: source, chart, proof, security boundary, research boundary, payload parity and next verification step only.",
  securityRule: "Security copy stays simple and premium: private-key boundary, signature proof, entropy quality, redaction, provider truth and withheld internal methods.",
  launchRule: "Status is earned by exact payload, traceability and calm proof, never by fake scarcity, profit language or debug pass-history.",
  inheritedCloseBus: PASS407_RUNTIME_CLOSE_EVENT,
  previousVersion: pass407TerminalPayloadIntegrityOrbit.version,
} as const;

export const pass408SourceProofTimeline = [
  { id: "close", label: "close bus", seconds: 0.02, copy: "Suggestions close before search submit, modal open, PDF forge, preview, download, scroll, tab switch and route handoff." },
  { id: "payload", label: "payload checksum", seconds: 0.10, copy: "Symbol, locale, asset class, title, provider state, fallback flags and output order resolve once." },
  { id: "identity", label: "identity seal", seconds: 0.20, copy: "Icon, name, market lane and source route lock before the AI Brain starts copy." },
  { id: "chart", label: "Shield candles", seconds: 0.34, copy: "Real Stocks, FX, ETF, commodities and REIT proxies use the same candle grammar as Shield." },
  { id: "freshness", label: "freshness rail", seconds: 0.58, copy: "Timestamp, cache age, reconnect state and second-source drift stay separate from narrative tone." },
  { id: "depth", label: "depth context", seconds: 0.84, copy: "Order-book depth and volume lanes are treated as context, not as a hidden buy/sell command." },
  { id: "orbit", label: "Orbit 360", seconds: 1.08, copy: "Blue packets feed the VLM coin and neural shell instead of showing random cards." },
  { id: "security", label: "security boundary", seconds: 1.38, copy: "Private keys, signatures, entropy and redaction are explained without exposing internal scoring." },
  { id: "research", label: "research boundary", seconds: 1.72, copy: "Prime/RNG work remains framed as audit, replication and falsification." },
  { id: "locale", label: "locale lock", seconds: 2.10, copy: "PL, EN and DE labels resolve once and mirror into preview and downloaded PDF." },
  { id: "morph", label: "field morph", seconds: 2.58, copy: "The brain morphs into Basic 10, Pro 14 or Advanced 20 fields." },
  { id: "clean", label: "clean surface", seconds: 3.10, copy: "Old pass-history stays hidden; only the newest public terminal remains visible." },
  { id: "proof", label: "proof first", seconds: 3.70, copy: "Premium pressure comes from proof, freshness and traceability instead of hype." },
  { id: "pdf", label: "PDF mirror", seconds: 4.34, copy: "Preview and download keep the same payload, order and language." },
  { id: "provider", label: "provider ready", seconds: 5.02, copy: "The next production step is provider wiring, not fake-live placeholders." },
  { id: "seal", label: "source proof seal", seconds: 5.76, copy: "The same resolved payload feeds search, modal, Brain, preview and download." },
] as const;

const localeLine: Record<"pl" | "en" | "de", string> = {
  pl: "Jeden payload zasila wyszukiwarkę, modal, Orbit Brain, podgląd i PDF; widok publiczny pokazuje źródła, wykres, dowód, granice i krótkie pola bez losowego copy.",
  en: "One payload powers search, modal, Orbit Brain, preview and PDF; the public surface shows source, chart, proof, boundaries and concise fields without random copy.",
  de: "Ein Payload speist Suche, Modal, Orbit Brain, Vorschau und PDF; die öffentliche Oberfläche zeigt Quelle, Chart, Nachweis, Grenzen und kurze Felder ohne Zufallstexte.",
};

export function buildPass408TerminalSourceProofReadout(input: {
  symbol: string;
  name: string;
  type: string;
  risk: number;
  source: string;
  mode: Pass408AuditMode;
  locale?: "pl" | "en" | "de";
}) {
  const base = buildPass407TerminalPayloadIntegrityReadout(input);
  const count = input.mode === "advanced" ? 20 : input.mode === "pro" ? 14 : 10;
  const locale = input.locale ?? "en";
  return {
    version: pass408TerminalSourceProofOrbit.version,
    count,
    seconds: Math.max(base.seconds, 5.76) + 0.16,
    headline: `${input.symbol} · source proof orbit`,
    body: `${input.mode.toUpperCase()} uses one resolved payload, one close bus, one Shield-grade chart, one Orbit 360 VLM Brain and one locale-exact PDF mirror before ${count} fields appear. ${localeLine[locale]}`,
    fields: base.fields.slice(0, count).map((field, index) => ({
      ...field,
      value: index === 0 ? `${input.symbol} · source proof` : index === 1 ? `${input.source} · freshness rail` : index === 2 ? `${input.mode.toUpperCase()} · ${count} fields` : index === 3 ? `${input.type} · Shield mirror` : index === 4 ? `${locale.toUpperCase()} · locale lock` : index === 5 ? "preview = download" : index === 6 ? "depth context only" : field.value,
      copy: index === 0 ? `${input.name}: ${pass408TerminalSourceProofOrbit.pdfRule}` : index === 1 ? pass408TerminalSourceProofOrbit.runtimeRule : index === 2 ? pass408TerminalSourceProofOrbit.brainRule : index === 3 ? pass408TerminalSourceProofOrbit.marketRule : index === 4 ? localeLine[locale] : index === 5 ? "Preview, downloaded PDF and modal readout share one payload order, not a separate text generator." : index === 6 ? "Depth, spread and volume inform confidence boundaries but never become a hidden trading instruction." : field.copy,
    })),
  };
}

export const pass408AssetVisualPatch: Record<string, VisualPatch> = {
  ORCL: { label: "Oracle", glyph: "OR", primary: "#c74634", secondary: "#111827" },
  SAP: { label: "SAP", glyph: "SAP", primary: "#0a6ed1", secondary: "#f8fafc" },
  NOW: { label: "ServiceNow", glyph: "SN", primary: "#81b5a1", secondary: "#111827", text: "#111" },
  TEAM: { label: "Atlassian", glyph: "AT", primary: "#0052cc", secondary: "#f8fafc" },
  OKTA: { label: "Okta", glyph: "OK", primary: "#00297a", secondary: "#f8fafc" },
  ZS: { label: "Zscaler", glyph: "ZS", primary: "#0f9ed5", secondary: "#111827" },
  PANW: { label: "Palo Alto", glyph: "PA", primary: "#f04e23", secondary: "#111827", text: "#111" },
  FTNT: { label: "Fortinet", glyph: "FT", primary: "#da291c", secondary: "#f8fafc" },
  AVGO: { label: "Broadcom", glyph: "BC", primary: "#cc092f", secondary: "#111827" },
  QCOM: { label: "Qualcomm", glyph: "QC", primary: "#3253dc", secondary: "#f8fafc" },
  "MC.PA": { label: "LVMH", glyph: "LV", primary: "#d6b56d", secondary: "#111827", text: "#111" },
  "RMS.PA": { label: "Hermes", glyph: "HE", primary: "#f37021", secondary: "#111827", text: "#111" },
  "CFR.SW": { label: "Richemont", glyph: "RC", primary: "#1f2937", secondary: "#d6b56d" },
  "PRX.AS": { label: "Prosus", glyph: "PX", primary: "#111827", secondary: "#60a5fa" },
  "9988.HK": { label: "Alibaba HK", glyph: "AB", primary: "#ff6a00", secondary: "#111827", text: "#111" },
  "0700.HK": { label: "Tencent HK", glyph: "TC", primary: "#1d4ed8", secondary: "#22c55e" },
  "EUR/HUF": { label: "Euro / Forint", glyph: "HF", primary: "#16a34a", secondary: "#dc2626" },
  "USD/HUF": { label: "Dollar / Forint", glyph: "HF", primary: "#2563eb", secondary: "#dc2626" },
  "EUR/CZK": { label: "Euro / Czech Koruna", glyph: "CZ", primary: "#1d4ed8", secondary: "#dc2626" },
  "USD/CZK": { label: "Dollar / Czech Koruna", glyph: "CZ", primary: "#2563eb", secondary: "#dc2626" },
  "GC=F": { label: "Gold Futures", glyph: "AU", primary: "#d4af37", secondary: "#111827", text: "#111" },
  "SI=F": { label: "Silver Futures", glyph: "AG", primary: "#cbd5e1", secondary: "#111827", text: "#111" },
  "HG=F": { label: "Copper Futures", glyph: "CU", primary: "#b87333", secondary: "#111827", text: "#111" },
  "CL=F": { label: "Crude Oil Futures", glyph: "CL", primary: "#111827", secondary: "#f97316" },
  VNQ: { label: "Vanguard Real Estate ETF", glyph: "VN", primary: "#b91c1c", secondary: "#f8fafc" },
  XLRE: { label: "Real Estate Select Sector", glyph: "XR", primary: "#2563eb", secondary: "#f8fafc" },
  REET: { label: "Global REIT ETF", glyph: "RE", primary: "#0f766e", secondary: "#f8fafc" },
  GLD: { label: "SPDR Gold Shares", glyph: "GD", primary: "#d4af37", secondary: "#111827", text: "#111" },
  SLV: { label: "iShares Silver Trust", glyph: "SV", primary: "#cbd5e1", secondary: "#111827", text: "#111" },
  DBB: { label: "Base Metals Fund", glyph: "BM", primary: "#b87333", secondary: "#111827", text: "#111" },
};

export const pass408PseudoPricePatch: Record<string, string> = {
  ORCL: "$124.80", SAP: "$196.40", NOW: "$742.00", TEAM: "$183.20", OKTA: "$93.10", ZS: "$179.60", PANW: "$309.40", FTNT: "$64.70", AVGO: "$1,680.00", QCOM: "$209.30",
  "MC.PA": "€724.40", "RMS.PA": "€2,118.00", "CFR.SW": "CHF 142.60", "PRX.AS": "€36.40", "9988.HK": "HK$78.20", "0700.HK": "HK$386.00",
  "EUR/HUF": "Ft389.20", "USD/HUF": "Ft358.60", "EUR/CZK": "Kč24.70", "USD/CZK": "Kč22.70",
  "GC=F": "$2,337.00", "SI=F": "$30.40", "HG=F": "$4.58", "CL=F": "$78.10", VNQ: "$84.20", XLRE: "$38.90", REET: "$23.40", GLD: "$216.80", SLV: "$27.90", DBB: "$22.60",
};

export function buildPass408MarketCoverageUniverse(): UniversalAssetRow[] {
  return [
    row({ id: "pass408-oracle", rank: 1229, symbol: "ORCL", name: "Oracle", assetClass: "stock", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass408-sap", rank: 1230, symbol: "SAP", name: "SAP", assetClass: "stock", riskPressure: 33, sparkTone: "flat" }),
    row({ id: "pass408-servicenow", rank: 1231, symbol: "NOW", name: "ServiceNow", assetClass: "stock", riskPressure: 39, sparkTone: "flat" }),
    row({ id: "pass408-atlassian", rank: 1232, symbol: "TEAM", name: "Atlassian", assetClass: "stock", riskPressure: 42, sparkTone: "watch" }),
    row({ id: "pass408-okta", rank: 1233, symbol: "OKTA", name: "Okta", assetClass: "stock", riskPressure: 44, sparkTone: "watch" }),
    row({ id: "pass408-zscaler", rank: 1234, symbol: "ZS", name: "Zscaler", assetClass: "stock", riskPressure: 45, sparkTone: "watch" }),
    row({ id: "pass408-palo-alto", rank: 1235, symbol: "PANW", name: "Palo Alto Networks", assetClass: "stock", riskPressure: 39, sparkTone: "flat" }),
    row({ id: "pass408-fortinet", rank: 1236, symbol: "FTNT", name: "Fortinet", assetClass: "stock", riskPressure: 38, sparkTone: "flat" }),
    row({ id: "pass408-broadcom", rank: 1237, symbol: "AVGO", name: "Broadcom", assetClass: "stock", riskPressure: 41, sparkTone: "watch" }),
    row({ id: "pass408-qualcomm", rank: 1238, symbol: "QCOM", name: "Qualcomm", assetClass: "stock", riskPressure: 38, sparkTone: "flat" }),
    row({ id: "pass408-lvmh", rank: 1239, symbol: "MC.PA", name: "LVMH", assetClass: "stock", riskPressure: 32, sparkTone: "flat" }),
    row({ id: "pass408-hermes", rank: 1240, symbol: "RMS.PA", name: "Hermes", assetClass: "stock", riskPressure: 28, sparkTone: "flat" }),
    row({ id: "pass408-richemont", rank: 1241, symbol: "CFR.SW", name: "Richemont", assetClass: "stock", riskPressure: 31, sparkTone: "flat" }),
    row({ id: "pass408-prosus", rank: 1242, symbol: "PRX.AS", name: "Prosus", assetClass: "stock", riskPressure: 39, sparkTone: "flat" }),
    row({ id: "pass408-alibaba-hk", rank: 1243, symbol: "9988.HK", name: "Alibaba Hong Kong", assetClass: "stock", riskPressure: 47, sparkTone: "watch" }),
    row({ id: "pass408-tencent-hk", rank: 1244, symbol: "0700.HK", name: "Tencent Hong Kong", assetClass: "stock", riskPressure: 43, sparkTone: "watch" }),
    row({ id: "pass408-eurhuf", rank: 1245, symbol: "EUR/HUF", name: "Euro / Hungarian Forint", assetClass: "fx", riskPressure: 37, sparkTone: "flat" }),
    row({ id: "pass408-usdhuf", rank: 1246, symbol: "USD/HUF", name: "Dollar / Hungarian Forint", assetClass: "fx", riskPressure: 39, sparkTone: "flat" }),
    row({ id: "pass408-eurczk", rank: 1247, symbol: "EUR/CZK", name: "Euro / Czech Koruna", assetClass: "fx", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass408-usdczk", rank: 1248, symbol: "USD/CZK", name: "Dollar / Czech Koruna", assetClass: "fx", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass408-gold-futures", rank: 1249, symbol: "GC=F", name: "Gold Futures", assetClass: "commodity", riskPressure: 37, sparkTone: "flat" }),
    row({ id: "pass408-silver-futures", rank: 1250, symbol: "SI=F", name: "Silver Futures", assetClass: "commodity", riskPressure: 43, sparkTone: "watch" }),
    row({ id: "pass408-copper-futures", rank: 1251, symbol: "HG=F", name: "Copper Futures", assetClass: "commodity", riskPressure: 41, sparkTone: "watch" }),
    row({ id: "pass408-crude-oil", rank: 1252, symbol: "CL=F", name: "Crude Oil Futures", assetClass: "commodity", riskPressure: 49, sparkTone: "watch" }),
    row({ id: "pass408-vnq", rank: 1253, symbol: "VNQ", name: "Vanguard Real Estate ETF", assetClass: "real_estate", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass408-xlre", rank: 1254, symbol: "XLRE", name: "Real Estate Select Sector SPDR", assetClass: "real_estate", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass408-reet", rank: 1255, symbol: "REET", name: "iShares Global REIT ETF", assetClass: "real_estate", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass408-gld", rank: 1256, symbol: "GLD", name: "SPDR Gold Shares", assetClass: "etf", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass408-slv", rank: 1257, symbol: "SLV", name: "iShares Silver Trust", assetClass: "etf", riskPressure: 42, sparkTone: "watch" }),
    row({ id: "pass408-dbb", rank: 1258, symbol: "DBB", name: "Invesco Base Metals Fund", assetClass: "etf", riskPressure: 41, sparkTone: "watch" }),
  ];
}

export const pass408SecurityOnePageCopy = [
  "Private keys never enter the report; the public layer shows signature boundaries and redaction only.",
  "Provider truth stays separate from AI tone: timestamp, cache age, fallback state, reconnect status and second-source drift remain visible.",
  "Preview, modal and downloaded PDF share one resolved payload; separate random text generation is not allowed.",
  "Internal scoring methods stay withheld; the public surface shows source class, proof lane, redaction and next verification step.",
] as const;

export const pass408ResearchBridge = {
  headline: "Research Lab as source-proof discipline",
  lanes: ["finite numerical audit", "RNG/entropy testing", "signature boundary education", "replication pack", "falsification queue", "payload parity mirror"],
  publicBoundary: "Velmere Research Lab can describe tests, reductions and hypotheses, but public copy must stay in audit/replication/falsification language until independent review exists.",
} as const;
