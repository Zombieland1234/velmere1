import type { UniversalAssetRow } from "./universal-asset-market-matrix";
import {
  PASS405_RUNTIME_CLOSE_EVENT,
  buildPass405TerminalOnePayloadReadout,
  pass405TerminalOnePayloadOrbit,
  type Pass405AuditMode,
} from "./pass405-terminal-one-payload-orbit";

export const PASS406_RUNTIME_CLOSE_EVENT = "velmere:pass406:terminal-payload-integrity-orbit-close";
export type Pass406AuditMode = Pass405AuditMode;
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
    sourceRhythm: input.sourceRhythm ?? `${lane} provider cadence · exact payload integrity · reconnect guard · cache-age badge · second-source drift`,
    priceLane: input.priceLane ?? `${lane} Shield-grade candles · wick/body/volume grammar · timeframe lock · modal mirror · PDF parity`,
    volumeLane: input.volumeLane ?? `${lane} liquidity, session volume, spread proxy, fallback flag and data age stay visible before AI tone`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${lane} issuer, venue, methodology, icon authority and provider timestamp are shown before confidence`,
    secondSourceLane: input.secondSourceLane ?? "provider ↔ second source ↔ search close bus ↔ Brain modal ↔ preview ↔ PDF payload checksum",
    confidenceFloor: input.confidenceFloor ?? 91,
    adapterState: input.adapterState ?? "provider_required",
    humanCopy: input.humanCopy ?? `${input.symbol} is routed through PASS406: payload checksum, one close bus, Shield-grade chart, Orbit 360 Brain and locale-exact PDF preview/download parity.`,
    nextAdapterStep: input.nextAdapterStep ?? "Attach live OHLCV provider, official icon authority, session calendar, payload checksum and second-source drift before raising live confidence.",
    ...input,
  };
}

export const pass406TerminalPayloadIntegrityOrbit = {
  version: "PASS406.terminal_payload_integrity_orbit",
  runtimeRule: "One close bus shuts Browser, Shield, Shield Map and Real Markets suggestions before modal open, PDF forge, PDF preview, PDF download, scroll, tab switch and route handoff.",
  marketRule: "Real Markets mirrors Shield: trusted icon, advanced candles, timeframe, Basic/Pro/Advanced, Orbit 360 Brain, concise field output and provider-required live boundary.",
  pdfRule: "Preview and downloaded PDF must be rendered from the same resolved payload with a payload checksum mindset: same symbol, locale, section order, fields and deterministic copy.",
  brainRule: "The VLM coin receives source freshness, candle state, second-source drift, security boundary, research boundary and payload checksum before morphing into Basic 10, Pro 14 or Advanced 20 fields.",
  copyRule: "Public copy stays compact: source, chart, proof, security boundary, research boundary, payload parity and next verification step only.",
  securityRule: "Security copy stays simple and premium: private-key boundary, signature proof, entropy quality, redaction, provider truth and withheld internal methods.",
  launchRule: "Status is earned by payload integrity, traceability and calm proof, never by fake scarcity, profit language or debug pass-history.",
  inheritedCloseBus: PASS405_RUNTIME_CLOSE_EVENT,
  previousVersion: pass405TerminalOnePayloadOrbit.version,
} as const;

export const pass406TruthOrbitTimeline = [
  { id: "close", label: "close bus", seconds: 0.02, copy: "Suggestions close before search submit, modal open, PDF forge, preview, download, scroll, tab switch and route handoff." },
  { id: "payload", label: "payload checksum", seconds: 0.11, copy: "Symbol, locale, asset class, title, provider state, fallback flags and output order resolve once." },
  { id: "identity", label: "identity seal", seconds: 0.20, copy: "Icon, name, market lane and source route lock before the AI Brain starts copy." },
  { id: "chart", label: "Shield candles", seconds: 0.36, copy: "Real Stocks, FX, ETF, commodities and REIT proxies use the same candle grammar as Shield." },
  { id: "freshness", label: "freshness rail", seconds: 0.62, copy: "Timestamp, cache age, reconnect state and second-source drift stay separate from narrative tone." },
  { id: "orbit", label: "Orbit 360", seconds: 0.94, copy: "Blue packets feed the VLM coin and neural shell instead of showing random cards." },
  { id: "security", label: "security boundary", seconds: 1.26, copy: "Private keys, signatures, entropy and redaction are explained without exposing internal scoring." },
  { id: "research", label: "research boundary", seconds: 1.60, copy: "Prime/RNG work remains framed as audit, replication and falsification." },
  { id: "locale", label: "locale lock", seconds: 1.96, copy: "PL, EN and DE labels resolve once and mirror into preview and downloaded PDF." },
  { id: "morph", label: "field morph", seconds: 2.38, copy: "The brain morphs into Basic 10, Pro 14 or Advanced 20 fields." },
  { id: "clean", label: "clean surface", seconds: 2.92, copy: "Old pass-history stays hidden; only the newest public terminal remains visible." },
  { id: "proof", label: "proof first", seconds: 3.48, copy: "Premium pressure comes from proof, freshness and traceability instead of hype." },
  { id: "pdf", label: "PDF mirror", seconds: 4.08, copy: "Preview and download keep the same payload, order and language." },
  { id: "provider", label: "provider ready", seconds: 4.74, copy: "The next production step is provider wiring, not fake-live placeholders." },
  { id: "checksum", label: "integrity seal", seconds: 5.42, copy: "The same resolved payload feeds search, modal, Brain, preview and download." },
] as const;

const localeLine: Record<"pl" | "en" | "de", string> = {
  pl: "Jeden payload zasila wyszukiwarkę, modal, Orbit Brain, podgląd i PDF; publiczny widok pokazuje źródła, wykres, dowód, granice i krótkie pola bez losowego copy.",
  en: "One payload powers search, modal, Orbit Brain, preview and PDF; the public surface shows source, chart, proof, boundaries and concise fields without random copy.",
  de: "Ein Payload speist Suche, Modal, Orbit Brain, Vorschau und PDF; die öffentliche Oberfläche zeigt Quelle, Chart, Nachweis, Grenzen und kurze Felder ohne Zufallstexte.",
};

export function buildPass406TerminalPayloadIntegrityReadout(input: {
  symbol: string;
  name: string;
  type: string;
  risk: number;
  source: string;
  mode: Pass406AuditMode;
  locale?: "pl" | "en" | "de";
}) {
  const base = buildPass405TerminalOnePayloadReadout(input);
  const count = input.mode === "advanced" ? 20 : input.mode === "pro" ? 14 : 10;
  const locale = input.locale ?? "en";
  return {
    version: pass406TerminalPayloadIntegrityOrbit.version,
    count,
    seconds: Math.max(base.seconds, 5.42) + 0.18,
    headline: `${input.symbol} · payload integrity orbit`,
    body: `${input.mode.toUpperCase()} uses one resolved payload, one close bus, one Shield-grade chart, one Orbit 360 VLM Brain and one locale-exact PDF mirror before ${count} fields appear. ${localeLine[locale]}`,
    fields: base.fields.slice(0, count).map((field, index) => ({
      ...field,
      value: index === 0 ? `${input.symbol} · payload checksum` : index === 1 ? `${input.source} · freshness rail` : index === 2 ? `${input.mode.toUpperCase()} · ${count} fields` : index === 3 ? `${input.type} · Shield mirror` : index === 4 ? `${locale.toUpperCase()} · locale lock` : index === 5 ? "preview = download" : field.value,
      copy: index === 0 ? `${input.name}: ${pass406TerminalPayloadIntegrityOrbit.pdfRule}` : index === 1 ? pass406TerminalPayloadIntegrityOrbit.runtimeRule : index === 2 ? pass406TerminalPayloadIntegrityOrbit.brainRule : index === 3 ? pass406TerminalPayloadIntegrityOrbit.marketRule : index === 4 ? localeLine[locale] : index === 5 ? "Preview, downloaded PDF and modal readout share one payload order, not a separate text generator." : field.copy,
    })),
  };
}

export const pass406AssetVisualPatch: Record<string, VisualPatch> = {
  SHOP: { label: "Shopify", glyph: "SH", primary: "#95bf47", secondary: "#111827", text: "#111" },
  UBER: { label: "Uber", glyph: "UB", primary: "#111827", secondary: "#f8fafc" },
  ABNB: { label: "Airbnb", glyph: "AB", primary: "#ff385c", secondary: "#111827" },
  MELI: { label: "MercadoLibre", glyph: "ML", primary: "#ffe600", secondary: "#2d3277", text: "#111" },
  ARM: { label: "Arm", glyph: "AR", primary: "#00a8e0", secondary: "#111827", text: "#111" },
  MU: { label: "Micron", glyph: "MU", primary: "#1f6feb", secondary: "#111827" },
  LRCX: { label: "Lam Research", glyph: "LX", primary: "#0f172a", secondary: "#38bdf8" },
  KLAC: { label: "KLA", glyph: "KL", primary: "#0057b8", secondary: "#f8fafc" },
  MRVL: { label: "Marvell", glyph: "MV", primary: "#0ea5e9", secondary: "#111827" },
  DELL: { label: "Dell", glyph: "DE", primary: "#0672cb", secondary: "#111827" },
  HPE: { label: "HPE", glyph: "HP", primary: "#00b388", secondary: "#111827", text: "#111" },
  INTU: { label: "Intuit", glyph: "IN", primary: "#236cff", secondary: "#111827" },
  ADSK: { label: "Autodesk", glyph: "AD", primary: "#0696d7", secondary: "#111827" },
  ANET: { label: "Arista", glyph: "AN", primary: "#f97316", secondary: "#111827", text: "#111" },
  NET: { label: "Cloudflare", glyph: "CF", primary: "#f38020", secondary: "#111827", text: "#111" },
  "RACE.MI": { label: "Ferrari", glyph: "FE", primary: "#dc0000", secondary: "#ffd700", text: "#111" },
  "MBG.DE": { label: "Mercedes-Benz", glyph: "MB", primary: "#111827", secondary: "#cbd5e1" },
  "BMW.DE": { label: "BMW", glyph: "BM", primary: "#0066b1", secondary: "#f8fafc" },
  "VOW3.DE": { label: "Volkswagen", glyph: "VW", primary: "#001e50", secondary: "#f8fafc" },
  "AIR.DE": { label: "Airbus Germany", glyph: "AD", primary: "#00205b", secondary: "#f8fafc" },
  "JPY/PLN": { label: "Yen / Polish Zloty", glyph: "JP", primary: "#bc002d", secondary: "#f8fafc", text: "#111" },
  "CHF/PLN": { label: "Swiss Franc / Polish Zloty", glyph: "CH", primary: "#dc2626", secondary: "#f8fafc", text: "#111" },
  "GBP/PLN": { label: "Pound / Polish Zloty", glyph: "GB", primary: "#1d4ed8", secondary: "#dc2626" },
  "NOK/PLN": { label: "Krone / Polish Zloty", glyph: "NO", primary: "#ba0c2f", secondary: "#00205b" },
  "SEK/PLN": { label: "Krona / Polish Zloty", glyph: "SE", primary: "#006aa7", secondary: "#fecc00", text: "#111" },
  "NG=F": { label: "Natural Gas", glyph: "NG", primary: "#0f766e", secondary: "#111827" },
  "ZC=F": { label: "Corn Futures", glyph: "CN", primary: "#facc15", secondary: "#111827", text: "#111" },
  "ZS=F": { label: "Soybean Futures", glyph: "SY", primary: "#16a34a", secondary: "#111827", text: "#111" },
  "ZW=F": { label: "Wheat Futures", glyph: "WH", primary: "#d97706", secondary: "#111827", text: "#111" },
  RWR: { label: "SPDR Dow Jones REIT ETF", glyph: "RW", primary: "#7c3aed", secondary: "#111827" },
  USRT: { label: "iShares Core US REIT ETF", glyph: "UR", primary: "#111827", secondary: "#38bdf8" },
};

export const pass406PseudoPricePatch: Record<string, string> = {
  SHOP: "$63.80", UBER: "$71.40", ABNB: "$145.30", MELI: "$1,641.00", ARM: "$129.60", MU: "$131.20", LRCX: "$927.00", KLAC: "$812.50", MRVL: "$77.30", DELL: "$144.90", HPE: "$21.40", INTU: "$618.00", ADSK: "$245.20", ANET: "$89.30", NET: "$83.10",
  "RACE.MI": "€392.40", "MBG.DE": "€64.20", "BMW.DE": "€92.30", "VOW3.DE": "€118.80", "AIR.DE": "€154.60",
  "JPY/PLN": "zł0.026", "CHF/PLN": "zł4.55", "GBP/PLN": "zł5.13", "NOK/PLN": "zł0.37", "SEK/PLN": "zł0.39",
  "NG=F": "$2.79", "ZC=F": "$4.48", "ZS=F": "$11.82", "ZW=F": "$6.12", RWR: "$92.40", USRT: "$52.80",
};

export function buildPass406MarketCoverageUniverse(): UniversalAssetRow[] {
  return [
    row({ id: "pass406-shopify", rank: 1176, symbol: "SHOP", name: "Shopify", assetClass: "stock", riskPressure: 42, sparkTone: "watch" }),
    row({ id: "pass406-uber", rank: 1177, symbol: "UBER", name: "Uber", assetClass: "stock", riskPressure: 39, sparkTone: "flat" }),
    row({ id: "pass406-airbnb", rank: 1178, symbol: "ABNB", name: "Airbnb", assetClass: "stock", riskPressure: 41, sparkTone: "watch" }),
    row({ id: "pass406-mercadolibre", rank: 1179, symbol: "MELI", name: "MercadoLibre", assetClass: "stock", riskPressure: 44, sparkTone: "watch" }),
    row({ id: "pass406-arm", rank: 1180, symbol: "ARM", name: "Arm Holdings", assetClass: "stock", riskPressure: 48, sparkTone: "watch" }),
    row({ id: "pass406-micron", rank: 1181, symbol: "MU", name: "Micron", assetClass: "stock", riskPressure: 46, sparkTone: "watch" }),
    row({ id: "pass406-lam", rank: 1182, symbol: "LRCX", name: "Lam Research", assetClass: "stock", riskPressure: 39, sparkTone: "flat" }),
    row({ id: "pass406-kla", rank: 1183, symbol: "KLAC", name: "KLA", assetClass: "stock", riskPressure: 38, sparkTone: "flat" }),
    row({ id: "pass406-marvell", rank: 1184, symbol: "MRVL", name: "Marvell", assetClass: "stock", riskPressure: 45, sparkTone: "watch" }),
    row({ id: "pass406-dell", rank: 1185, symbol: "DELL", name: "Dell Technologies", assetClass: "stock", riskPressure: 40, sparkTone: "flat" }),
    row({ id: "pass406-hpe", rank: 1186, symbol: "HPE", name: "Hewlett Packard Enterprise", assetClass: "stock", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass406-intuit", rank: 1187, symbol: "INTU", name: "Intuit", assetClass: "stock", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass406-autodesk", rank: 1188, symbol: "ADSK", name: "Autodesk", assetClass: "stock", riskPressure: 37, sparkTone: "flat" }),
    row({ id: "pass406-arista", rank: 1189, symbol: "ANET", name: "Arista Networks", assetClass: "stock", riskPressure: 43, sparkTone: "watch" }),
    row({ id: "pass406-cloudflare", rank: 1190, symbol: "NET", name: "Cloudflare", assetClass: "stock", riskPressure: 47, sparkTone: "watch" }),
    row({ id: "pass406-ferrari", rank: 1191, symbol: "RACE.MI", name: "Ferrari Milan", assetClass: "stock", riskPressure: 30, sparkTone: "flat" }),
    row({ id: "pass406-mercedes", rank: 1192, symbol: "MBG.DE", name: "Mercedes-Benz Group", assetClass: "stock", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass406-bmw", rank: 1193, symbol: "BMW.DE", name: "BMW", assetClass: "stock", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass406-volkswagen", rank: 1194, symbol: "VOW3.DE", name: "Volkswagen Preference", assetClass: "stock", riskPressure: 42, sparkTone: "watch" }),
    row({ id: "pass406-airbus-de", rank: 1195, symbol: "AIR.DE", name: "Airbus Germany Proxy", assetClass: "stock", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass406-jpypln", rank: 1196, symbol: "JPY/PLN", name: "Yen / Polish Zloty", assetClass: "fx", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass406-chfpln", rank: 1197, symbol: "CHF/PLN", name: "Swiss Franc / Polish Zloty", assetClass: "fx", riskPressure: 39, sparkTone: "watch" }),
    row({ id: "pass406-gbppln", rank: 1198, symbol: "GBP/PLN", name: "Pound / Polish Zloty", assetClass: "fx", riskPressure: 37, sparkTone: "flat" }),
    row({ id: "pass406-nokpln", rank: 1199, symbol: "NOK/PLN", name: "Norwegian Krone / Polish Zloty", assetClass: "fx", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass406-sekpln", rank: 1200, symbol: "SEK/PLN", name: "Swedish Krona / Polish Zloty", assetClass: "fx", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass406-natural-gas", rank: 1201, symbol: "NG=F", name: "Natural Gas Futures", assetClass: "commodity", riskPressure: 56, sparkTone: "watch" }),
    row({ id: "pass406-corn", rank: 1202, symbol: "ZC=F", name: "Corn Futures", assetClass: "commodity", riskPressure: 43, sparkTone: "watch" }),
    row({ id: "pass406-soybean", rank: 1203, symbol: "ZS=F", name: "Soybean Futures", assetClass: "commodity", riskPressure: 41, sparkTone: "watch" }),
    row({ id: "pass406-wheat", rank: 1204, symbol: "ZW=F", name: "Wheat Futures", assetClass: "commodity", riskPressure: 42, sparkTone: "watch" }),
    row({ id: "pass406-rwr", rank: 1205, symbol: "RWR", name: "SPDR Dow Jones REIT ETF", assetClass: "real_estate", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass406-usrt", rank: 1206, symbol: "USRT", name: "iShares Core US REIT ETF", assetClass: "real_estate", riskPressure: 34, sparkTone: "flat" }),
  ];
}

export const pass406SecurityOnePageCopy = [
  "Private keys never enter the report; the public layer shows signature boundaries and redaction only.",
  "Provider truth stays separate from AI tone: timestamp, cache age, fallback state, reconnect status and second-source drift remain visible.",
  "Preview, modal and downloaded PDF share one resolved payload; separate random text generation is not allowed.",
  "Internal scoring methods stay withheld; the public surface shows source class, proof lane, redaction and next verification step.",
] as const;

export const pass406ResearchBridge = {
  headline: "Research Lab as payload-integrity discipline",
  lanes: ["finite numerical audit", "RNG/entropy testing", "signature boundary education", "replication pack", "falsification queue", "payload parity mirror"],
  publicBoundary: "Velmere Research Lab can describe tests, reductions and hypotheses, but public copy must stay in audit/replication/falsification language until independent review exists.",
} as const;
