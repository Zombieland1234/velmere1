import type { UniversalAssetRow } from "./universal-asset-market-matrix";
import {
  PASS404_RUNTIME_CLOSE_EVENT,
  buildPass404TerminalExactOrbitReadout,
  pass404TerminalExactOrbit,
  type Pass404AuditMode,
} from "./pass404-terminal-exact-orbit";

export const PASS405_RUNTIME_CLOSE_EVENT = "velmere:pass405:terminal-one-payload-orbit-close";
export type Pass405AuditMode = Pass404AuditMode;
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
    sourceRhythm: input.sourceRhythm ?? `${lane} provider cadence · exact payload resolver · reconnect guard · cache-age badge · second-source drift`,
    priceLane: input.priceLane ?? `${lane} Shield-grade candles · wick/body/volume grammar · timeframe lock · modal mirror`,
    volumeLane: input.volumeLane ?? `${lane} liquidity, session volume, spread proxy, fallback flag and data age stay visible before AI tone`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${lane} issuer, venue, methodology, icon authority and provider timestamp are shown before confidence`,
    secondSourceLane: input.secondSourceLane ?? "provider ↔ second source ↔ search close bus ↔ Brain modal ↔ preview ↔ PDF exact payload",
    confidenceFloor: input.confidenceFloor ?? 90,
    adapterState: input.adapterState ?? "provider_required",
    humanCopy: input.humanCopy ?? `${input.symbol} is routed through PASS405: one payload resolver, one close bus, one Shield-grade chart, one Orbit 360 Brain and one locale-exact PDF mirror.`,
    nextAdapterStep: input.nextAdapterStep ?? "Attach live OHLCV provider, official logo authority, session calendar, cache-age badge and second-source drift before raising live confidence.",
    ...input,
  };
}

export const pass405TerminalOnePayloadOrbit = {
  version: "PASS405.terminal_one_payload_orbit",
  runtimeRule: "One close bus shuts Browser, Shield, Shield Map and Real Markets suggestions before modal open, PDF forge, PDF preview, PDF download, scroll, tab switch and route handoff.",
  marketRule: "Real Markets follows the Shield path: trusted icon, advanced candles, timeframe, Basic/Pro/Advanced, Orbit 360 Brain and compact result fields.",
  pdfRule: "Preview and downloaded PDF must be rendered from the same resolved payload, same locale, same order and deterministic copy; no second text generator is allowed.",
  brainRule: "The VLM coin receives source freshness, candle state, second-source drift, security boundary and research boundary before morphing into Basic 10, Pro 14 or Advanced 20 fields.",
  copyRule: "Public copy stays short: source, chart, proof, security boundary, research boundary and next verification step only.",
  securityRule: "Security copy stays simple and premium: private-key boundary, signature proof, entropy quality, redaction, provider truth and withheld internal methods.",
  launchRule: "Status is earned by payload exactness, traceability and calm proof, never by fake scarcity, profit language or debug pass-history.",
  inheritedCloseBus: PASS404_RUNTIME_CLOSE_EVENT,
  previousVersion: pass404TerminalExactOrbit.version,
} as const;

export const pass405TruthOrbitTimeline = [
  { id: "close", label: "close bus", seconds: 0.03, copy: "Floating suggestions close before search submit, modal open, PDF forge, preview, download, scroll and tab switch." },
  { id: "payload", label: "payload resolver", seconds: 0.12, copy: "Symbol, locale, asset class, title, provider state and fallback flags resolve once." },
  { id: "identity", label: "identity seal", seconds: 0.22, copy: "Icon, name, market lane and source route lock before the AI Brain starts copy." },
  { id: "chart", label: "Shield candles", seconds: 0.40, copy: "Real Stocks, FX, ETF, commodities and REIT proxies use the same candle grammar as Shield." },
  { id: "freshness", label: "freshness rail", seconds: 0.68, copy: "Timestamp, cache age, reconnect state and second-source drift stay separate from narrative tone." },
  { id: "orbit", label: "Orbit 360", seconds: 1.02, copy: "Blue packets feed the VLM coin and neural shell instead of showing random cards." },
  { id: "security", label: "security boundary", seconds: 1.36, copy: "Private keys, signatures, entropy and redaction are explained without exposing internal scoring." },
  { id: "research", label: "research boundary", seconds: 1.74, copy: "Prime/RNG work remains framed as audit, replication and falsification." },
  { id: "locale", label: "locale lock", seconds: 2.10, copy: "PL, EN and DE labels are resolved once and mirrored into preview and downloaded PDF." },
  { id: "morph", label: "field morph", seconds: 2.62, copy: "The brain morphs into Basic 10, Pro 14 or Advanced 20 fields." },
  { id: "clean", label: "clean surface", seconds: 3.18, copy: "Old pass-history stays hidden; only the newest public terminal remains visible." },
  { id: "proof", label: "proof first", seconds: 3.82, copy: "Premium pressure comes from proof, freshness and traceability instead of hype." },
  { id: "pdf", label: "PDF mirror", seconds: 4.46, copy: "Preview and download keep the same payload, order and language." },
  { id: "ready", label: "provider ready", seconds: 5.10, copy: "The next production step is provider wiring, not fake-live placeholders." },
] as const;

const localeLine: Record<"pl" | "en" | "de", string> = {
  pl: "Jeden resolver zasila wyszukiwarkę, modal, Orbit Brain, podgląd i PDF; publiczny widok pokazuje tylko źródła, wykres, dowód i krótkie pola.",
  en: "One resolver powers search, modal, Orbit Brain, preview and PDF; the public surface shows only source, chart, proof and concise fields.",
  de: "Ein Resolver speist Suche, Modal, Orbit Brain, Vorschau und PDF; die öffentliche Oberfläche zeigt nur Quelle, Chart, Nachweis und kurze Felder.",
};

export function buildPass405TerminalOnePayloadReadout(input: {
  symbol: string;
  name: string;
  type: string;
  risk: number;
  source: string;
  mode: Pass405AuditMode;
  locale?: "pl" | "en" | "de";
}) {
  const base = buildPass404TerminalExactOrbitReadout(input);
  const count = input.mode === "advanced" ? 20 : input.mode === "pro" ? 14 : 10;
  const locale = input.locale ?? "en";
  return {
    version: pass405TerminalOnePayloadOrbit.version,
    count,
    seconds: Math.max(base.seconds, 5.10) + 0.16,
    headline: `${input.symbol} · one payload orbit`,
    body: `${input.mode.toUpperCase()} uses one payload resolver, one close bus, one Shield-grade chart, one Orbit 360 VLM Brain and one locale-exact PDF mirror before ${count} fields appear. ${localeLine[locale]}`,
    fields: base.fields.slice(0, count).map((field, index) => ({
      ...field,
      value: index === 0 ? `${input.symbol} · one payload` : index === 1 ? `${input.source} · freshness rail` : index === 2 ? `${input.mode.toUpperCase()} · ${count} fields` : index === 3 ? `${input.type} · Shield mirror` : index === 4 ? `${locale.toUpperCase()} · locale lock` : field.value,
      copy: index === 0 ? `${input.name}: ${pass405TerminalOnePayloadOrbit.pdfRule}` : index === 1 ? pass405TerminalOnePayloadOrbit.runtimeRule : index === 2 ? pass405TerminalOnePayloadOrbit.brainRule : index === 3 ? pass405TerminalOnePayloadOrbit.marketRule : index === 4 ? localeLine[locale] : field.copy,
    })),
  };
}

export const pass405AssetVisualPatch: Record<string, VisualPatch> = {
  SNOW: { label: "Snowflake", glyph: "SN", primary: "#29b5e8", secondary: "#111827" },
  DDOG: { label: "Datadog", glyph: "DD", primary: "#632ca6", secondary: "#f8fafc" },
  MDB: { label: "MongoDB", glyph: "MD", primary: "#13aa52", secondary: "#111827", text: "#111" },
  TEAM: { label: "Atlassian", glyph: "AT", primary: "#0052cc", secondary: "#111827" },
  ZS: { label: "Zscaler", glyph: "ZS", primary: "#2563eb", secondary: "#111827" },
  OKTA: { label: "Okta", glyph: "OK", primary: "#00297a", secondary: "#f8fafc" },
  DOCU: { label: "DocuSign", glyph: "DS", primary: "#1f7a8c", secondary: "#111827" },
  SQ: { label: "Block", glyph: "SQ", primary: "#111827", secondary: "#f8fafc" },
  PYPL: { label: "PayPal", glyph: "PY", primary: "#003087", secondary: "#009cde" },
  ADYEN: { label: "Adyen", glyph: "AY", primary: "#0abf53", secondary: "#111827", text: "#111" },
  "ADYEN.AS": { label: "Adyen Amsterdam", glyph: "AY", primary: "#0abf53", secondary: "#111827", text: "#111" },
  "MC.PA": { label: "LVMH", glyph: "LV", primary: "#c8a45d", secondary: "#111827", text: "#111" },
  "KER.PA": { label: "Kering", glyph: "KR", primary: "#111827", secondary: "#c8a45d" },
  "CFR.SW": { label: "Richemont", glyph: "RC", primary: "#9f1239", secondary: "#f8fafc" },
  "BRBY.L": { label: "Burberry", glyph: "BB", primary: "#8b5e34", secondary: "#111827" },
  "SIE.DE": { label: "Siemens", glyph: "SI", primary: "#009999", secondary: "#111827", text: "#111" },
  "AIR.PA": { label: "Airbus", glyph: "AB", primary: "#00205b", secondary: "#f8fafc" },
  "ULVR.L": { label: "Unilever", glyph: "UL", primary: "#005eff", secondary: "#f8fafc" },
  "9988.HK": { label: "Alibaba HK", glyph: "AB", primary: "#ff6a00", secondary: "#111827", text: "#111" },
  "0700.HK": { label: "Tencent HK", glyph: "TC", primary: "#2563eb", secondary: "#111827" },
  "EUR/SGD": { label: "Euro / Singapore Dollar", glyph: "SG", primary: "#dc2626", secondary: "#f8fafc", text: "#111" },
  "USD/SGD": { label: "Dollar / Singapore Dollar", glyph: "SG", primary: "#dc2626", secondary: "#2563eb" },
  "EUR/NOK": { label: "Euro / Norwegian Krone", glyph: "NO", primary: "#ba0c2f", secondary: "#00205b" },
  "USD/NOK": { label: "Dollar / Norwegian Krone", glyph: "NO", primary: "#00205b", secondary: "#2563eb" },
  "EUR/SEK": { label: "Euro / Swedish Krona", glyph: "SE", primary: "#006aa7", secondary: "#fecc00", text: "#111" },
  "USD/SEK": { label: "Dollar / Swedish Krona", glyph: "SE", primary: "#006aa7", secondary: "#2563eb" },
  "HO=F": { label: "Heating Oil", glyph: "HO", primary: "#0f172a", secondary: "#f97316" },
  "RB=F": { label: "Gasoline", glyph: "RB", primary: "#b91c1c", secondary: "#facc15", text: "#111" },
  "PL=F": { label: "Platinum", glyph: "PT", primary: "#94a3b8", secondary: "#111827", text: "#111" },
  VNQ: { label: "Vanguard Real Estate ETF", glyph: "VQ", primary: "#96151d", secondary: "#f8fafc" },
  XLRE: { label: "Real Estate Select ETF", glyph: "XR", primary: "#0f766e", secondary: "#111827" },
  ICF: { label: "iShares Cohen & Steers REIT", glyph: "IC", primary: "#0f172a", secondary: "#38bdf8" },
};

export const pass405PseudoPricePatch: Record<string, string> = {
  SNOW: "$156.40", DDOG: "$123.80", MDB: "$318.10", TEAM: "$188.70", ZS: "$176.30", OKTA: "$92.50", DOCU: "$61.40", SQ: "$74.20", PYPL: "$68.90", ADYEN: "€1,482.00",
  "ADYEN.AS": "€1,482.00", "MC.PA": "€739.00", "KER.PA": "€312.40", "CFR.SW": "CHF 141.20", "BRBY.L": "£12.84", "SIE.DE": "€176.30", "AIR.PA": "€154.80", "ULVR.L": "£43.40", "9988.HK": "HK$82.10", "0700.HK": "HK$391.20",
  "EUR/SGD": "S$1.45", "USD/SGD": "S$1.34", "EUR/NOK": "kr11.45", "USD/NOK": "kr10.52", "EUR/SEK": "kr11.22", "USD/SEK": "kr10.31",
  "HO=F": "$2.44", "RB=F": "$2.31", "PL=F": "$1,017.00", VNQ: "$84.70", XLRE: "$39.20", ICF: "$59.10",
};

export function buildPass405MarketCoverageUniverse(): UniversalAssetRow[] {
  return [
    row({ id: "pass405-snowflake", rank: 1145, symbol: "SNOW", name: "Snowflake", assetClass: "stock", riskPressure: 43, sparkTone: "watch" }),
    row({ id: "pass405-datadog", rank: 1146, symbol: "DDOG", name: "Datadog", assetClass: "stock", riskPressure: 42, sparkTone: "watch" }),
    row({ id: "pass405-mongodb", rank: 1147, symbol: "MDB", name: "MongoDB", assetClass: "stock", riskPressure: 46, sparkTone: "watch" }),
    row({ id: "pass405-atlassian", rank: 1148, symbol: "TEAM", name: "Atlassian", assetClass: "stock", riskPressure: 41, sparkTone: "watch" }),
    row({ id: "pass405-zscaler", rank: 1149, symbol: "ZS", name: "Zscaler", assetClass: "stock", riskPressure: 47, sparkTone: "watch" }),
    row({ id: "pass405-okta", rank: 1150, symbol: "OKTA", name: "Okta", assetClass: "stock", riskPressure: 45, sparkTone: "watch" }),
    row({ id: "pass405-docusign", rank: 1151, symbol: "DOCU", name: "DocuSign", assetClass: "stock", riskPressure: 39, sparkTone: "flat" }),
    row({ id: "pass405-block", rank: 1152, symbol: "SQ", name: "Block", assetClass: "stock", riskPressure: 48, sparkTone: "watch" }),
    row({ id: "pass405-paypal", rank: 1153, symbol: "PYPL", name: "PayPal", assetClass: "stock", riskPressure: 42, sparkTone: "watch" }),
    row({ id: "pass405-adyen", rank: 1154, symbol: "ADYEN.AS", name: "Adyen", assetClass: "stock", riskPressure: 37, sparkTone: "flat" }),
    row({ id: "pass405-lvmh", rank: 1155, symbol: "MC.PA", name: "LVMH", assetClass: "stock", riskPressure: 28, sparkTone: "flat" }),
    row({ id: "pass405-kering", rank: 1156, symbol: "KER.PA", name: "Kering", assetClass: "stock", riskPressure: 36, sparkTone: "watch" }),
    row({ id: "pass405-richemont", rank: 1157, symbol: "CFR.SW", name: "Richemont", assetClass: "stock", riskPressure: 31, sparkTone: "flat" }),
    row({ id: "pass405-burberry", rank: 1158, symbol: "BRBY.L", name: "Burberry", assetClass: "stock", riskPressure: 40, sparkTone: "watch" }),
    row({ id: "pass405-siemens", rank: 1159, symbol: "SIE.DE", name: "Siemens", assetClass: "stock", riskPressure: 30, sparkTone: "flat" }),
    row({ id: "pass405-airbus", rank: 1160, symbol: "AIR.PA", name: "Airbus", assetClass: "stock", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass405-unilever", rank: 1161, symbol: "ULVR.L", name: "Unilever", assetClass: "stock", riskPressure: 27, sparkTone: "flat" }),
    row({ id: "pass405-alibaba-hk", rank: 1162, symbol: "9988.HK", name: "Alibaba Hong Kong", assetClass: "stock", riskPressure: 49, sparkTone: "watch" }),
    row({ id: "pass405-tencent-hk", rank: 1163, symbol: "0700.HK", name: "Tencent Hong Kong", assetClass: "stock", riskPressure: 43, sparkTone: "watch" }),
    row({ id: "pass405-eursgd", rank: 1164, symbol: "EUR/SGD", name: "Euro / Singapore Dollar", assetClass: "fx", riskPressure: 30, sparkTone: "flat" }),
    row({ id: "pass405-usdsgd", rank: 1165, symbol: "USD/SGD", name: "Dollar / Singapore Dollar", assetClass: "fx", riskPressure: 31, sparkTone: "flat" }),
    row({ id: "pass405-eurnok", rank: 1166, symbol: "EUR/NOK", name: "Euro / Norwegian Krone", assetClass: "fx", riskPressure: 39, sparkTone: "watch" }),
    row({ id: "pass405-usdnok", rank: 1167, symbol: "USD/NOK", name: "Dollar / Norwegian Krone", assetClass: "fx", riskPressure: 40, sparkTone: "watch" }),
    row({ id: "pass405-eursek", rank: 1168, symbol: "EUR/SEK", name: "Euro / Swedish Krona", assetClass: "fx", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass405-usdsek", rank: 1169, symbol: "USD/SEK", name: "Dollar / Swedish Krona", assetClass: "fx", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass405-heating-oil", rank: 1170, symbol: "HO=F", name: "Heating Oil Futures", assetClass: "commodity", riskPressure: 52, sparkTone: "watch" }),
    row({ id: "pass405-gasoline", rank: 1171, symbol: "RB=F", name: "Gasoline Futures", assetClass: "commodity", riskPressure: 53, sparkTone: "watch" }),
    row({ id: "pass405-platinum", rank: 1172, symbol: "PL=F", name: "Platinum Futures", assetClass: "commodity", riskPressure: 47, sparkTone: "watch" }),
    row({ id: "pass405-vnq", rank: 1173, symbol: "VNQ", name: "Vanguard Real Estate ETF", assetClass: "real_estate", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass405-xlre", rank: 1174, symbol: "XLRE", name: "Real Estate Select Sector ETF", assetClass: "real_estate", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass405-icf", rank: 1175, symbol: "ICF", name: "iShares Cohen & Steers REIT ETF", assetClass: "real_estate", riskPressure: 35, sparkTone: "flat" }),
  ];
}

export const pass405SecurityOnePageCopy = [
  "Private keys never enter the report; the public layer shows signature boundaries and redaction only.",
  "Provider truth stays separate from AI tone: timestamp, cache age, fallback state, reconnect status and second-source drift remain visible.",
  "Entropy and RNG research is framed as verification and audit work, not as a claim that secrets can be recovered.",
  "Internal scoring methods stay withheld; the public surface shows source class, proof lane, redaction and next verification step.",
] as const;

export const pass405ResearchBridge = {
  headline: "Research Lab as replication discipline",
  lanes: ["finite numerical audit", "RNG/entropy testing", "signature boundary education", "replication pack", "falsification queue", "one-payload PDF mirror"],
  publicBoundary: "Velmere Research Lab can describe tests, reductions and hypotheses, but public copy must stay in audit/replication/falsification language until independent review exists.",
} as const;
