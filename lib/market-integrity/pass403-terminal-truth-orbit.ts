import type { UniversalAssetRow } from "./universal-asset-market-matrix";
import {
  PASS402_RUNTIME_CLOSE_EVENT,
  buildPass402TerminalCleanOrbitReadout,
  pass402TerminalCleanOrbit,
  type Pass402AuditMode,
} from "./pass402-terminal-clean-orbit-controller";

export const PASS403_RUNTIME_CLOSE_EVENT = "velmere:pass403:terminal-truth-orbit-close";

export type Pass403AuditMode = Pass402AuditMode;
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
    sourceRhythm: input.sourceRhythm ?? `${lane} provider cadence · reconnect guard · market calendar · cache-age label · second-source drift`,
    priceLane: input.priceLane ?? `${lane} Shield mirror candles · wick/body/volume grammar · timeframe lock · no text-wall fallback`,
    volumeLane: input.volumeLane ?? `${lane} liquidity, spread proxy, session volume and stale/fallback flags stay outside AI tone`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${lane} issuer, venue, methodology, logo authority and data provenance are shown before confidence`,
    secondSourceLane: input.secondSourceLane ?? "primary provider ↔ second source ↔ Browser preview ↔ PDF download exact payload",
    confidenceFloor: input.confidenceFloor ?? 88,
    adapterState: input.adapterState ?? "provider_required",
    humanCopy: input.humanCopy ?? `${input.symbol} is routed through PASS403: one shared close bus, one Shield-grade market modal, one VLM Orbit Brain and one PDF payload.`,
    nextAdapterStep: input.nextAdapterStep ?? "Attach live OHLCV provider, logo authority, market calendar, cache-age badge, reconnect guard and second-source drift before raising live confidence.",
    ...input,
  };
}

export const pass403TerminalTruthOrbit = {
  version: "PASS403.terminal_truth_orbit",
  runtimeRule: "Browser, Shield, Shield Map and Real Markets dispatch the same close bus before search, scroll, modal, PDF preview, PDF download and tab changes.",
  marketRule: "Real Markets stays Shield-like: asset identity, logo, candles, timeframe, Basic/Pro/Advanced and Orbit 360 VLM Brain stay in one modal path.",
  pdfRule: "The HTML preview and downloaded PDF read from the same resolved report object, locale and deterministic field order; no random secondary copy is allowed.",
  brainRule: "The VLM coin receives source packets, provider freshness, candle context, security boundary and research boundary before morphing into 10/14/20 fields.",
  copyRule: "Public copy is short: identity, chart state, provider freshness, proof lane, security boundary and Research Lab boundary only.",
  securityRule: "Security page copy remains simple and premium: private-key boundary, signature proof, entropy quality, redaction and withheld internals.",
  launchRule: "Premium pressure comes from traceability, exactness and source truth, not fake scarcity, profit promises or hidden debug history.",
} as const;

export const pass403TruthOrbitTimeline = [
  { id: "bus", label: "close bus", seconds: 0.05, copy: "Every floating search portal closes before modal, PDF, scroll, tab and download actions." },
  { id: "identity", label: "identity seal", seconds: 0.18, copy: "Symbol, route, locale, asset class, logo and source mode lock into one object." },
  { id: "candles", label: "Shield candles", seconds: 0.42, copy: "Real Stocks, FX and commodities reuse the same wick, body, volume and timeframe language as Shield." },
  { id: "provider", label: "provider truth", seconds: 0.70, copy: "Timestamp, cache age, fallback flag, reconnect state and second-source drift are separated before confidence." },
  { id: "orbit", label: "Orbit 360", seconds: 1.05, copy: "Blue packets orbit the VLM coin and feed the neural shell instead of showing debug cards." },
  { id: "security", label: "security lane", seconds: 1.44, copy: "Private-key boundary, signature proof, entropy quality and redaction stay visible but not over-explained." },
  { id: "research", label: "research lane", seconds: 1.86, copy: "Prime/RNG work remains framed as audit, replication and falsification." },
  { id: "morph", label: "field morph", seconds: 2.34, copy: "The brain morphs into Basic 10, Pro 14 or Advanced 20 readable fields." },
  { id: "locale", label: "locale mirror", seconds: 2.84, copy: "PL/EN/DE labels are resolved once and mirrored into preview and binary PDF." },
  { id: "pdf", label: "PDF exactness", seconds: 3.38, copy: "HTML preview and downloaded PDF use the same section order and deterministic copy." },
  { id: "clean", label: "clean surface", seconds: 3.92, copy: "Old pass-history panels stay hidden from the public surface." },
  { id: "launch", label: "premium proof", seconds: 4.46, copy: "Status is earned by source truth and traceability, not random hype." },
] as const;

const localeLine: Record<"pl" | "en" | "de", string> = {
  pl: "Jeden payload zasila wyszukiwarkę, modal, Orbit Brain, podgląd i pobrany PDF: bez losowych zdań, bez pływających sugestii i bez historii debug passów.",
  en: "One payload powers search, modal, Orbit Brain, preview and PDF download: no random sentences, no floating suggestions and no debug pass history.",
  de: "Ein Payload speist Suche, Modal, Orbit Brain, Vorschau und PDF-Download: keine Zufallssätze, keine schwebenden Vorschläge und keine Debug-Pass-Historie.",
};

export function buildPass403TerminalTruthOrbitReadout(input: {
  symbol: string;
  name: string;
  type: string;
  risk: number;
  source: string;
  mode: Pass403AuditMode;
  locale?: "pl" | "en" | "de";
}) {
  const base = buildPass402TerminalCleanOrbitReadout(input);
  const count = input.mode === "advanced" ? 20 : input.mode === "pro" ? 14 : 10;
  const locale = input.locale ?? "en";
  return {
    version: pass403TerminalTruthOrbit.version,
    count,
    seconds: Math.max(base.seconds, 4.46) + 0.16,
    headline: `${input.symbol} · terminal truth orbit`,
    body: `${input.mode.toUpperCase()} keeps one close bus, one Shield-grade chart path, one Orbit 360 neural brain and one exact PDF payload before ${count} fields appear. ${localeLine[locale]}`,
    fields: base.fields.slice(0, count).map((field, index) => ({
      ...field,
      value: index === 0 ? `${input.symbol} · one payload` : index === 1 ? `${input.source} · freshness bus` : index === 2 ? `${input.mode.toUpperCase()} · ${count} fields` : field.value,
      copy: index === 0 ? `${input.name}: ${pass403TerminalTruthOrbit.pdfRule}` : index === 1 ? pass403TerminalTruthOrbit.runtimeRule : index === 2 ? pass403TerminalTruthOrbit.brainRule : field.copy,
    })),
  };
}

export const pass403AssetVisualPatch: Record<string, VisualPatch> = {
  SAP: { label: "SAP", glyph: "SP", primary: "#0a6ed1", secondary: "#f8fafc" },
  ORCL: { label: "Oracle", glyph: "OC", primary: "#c74634", secondary: "#111827" },
  CRM: { label: "Salesforce", glyph: "SF", primary: "#00a1e0", secondary: "#f8fafc", text: "#111" },
  SNOW: { label: "Snowflake", glyph: "SN", primary: "#29b5e8", secondary: "#111827", text: "#111" },
  DDOG: { label: "Datadog", glyph: "DD", primary: "#632ca6", secondary: "#f8fafc" },
  MDB: { label: "MongoDB", glyph: "MD", primary: "#13aa52", secondary: "#111827", text: "#111" },
  ZS: { label: "Zscaler", glyph: "ZS", primary: "#2563eb", secondary: "#111827" },
  FTNT: { label: "Fortinet", glyph: "FN", primary: "#ee3124", secondary: "#111827" },
  "MC.PA": { label: "LVMH", glyph: "LV", primary: "#111827", secondary: "#c8a45d" },
  "KER.PA": { label: "Kering", glyph: "KR", primary: "#111827", secondary: "#f8fafc" },
  "CFR.SW": { label: "Richemont", glyph: "RC", primary: "#6b1028", secondary: "#c8a45d" },
  "ITX.MC": { label: "Inditex", glyph: "IX", primary: "#111827", secondary: "#f8fafc" },
  "9988.HK": { label: "Alibaba", glyph: "AB", primary: "#ff6a00", secondary: "#111827", text: "#111" },
  "0700.HK": { label: "Tencent", glyph: "TC", primary: "#0052d9", secondary: "#f8fafc" },
  "005930.KS": { label: "Samsung Electronics", glyph: "SS", primary: "#1428a0", secondary: "#f8fafc" },
  "EUR/NOK": { label: "Euro / Norwegian Krone", glyph: "NO", primary: "#ba0c2f", secondary: "#00205b" },
  "USD/NOK": { label: "Dollar / Norwegian Krone", glyph: "UN", primary: "#00205b", secondary: "#ba0c2f" },
  "EUR/SEK": { label: "Euro / Swedish Krona", glyph: "SE", primary: "#006aa7", secondary: "#fecc00", text: "#111" },
  "USD/SEK": { label: "Dollar / Swedish Krona", glyph: "US", primary: "#006aa7", secondary: "#fecc00", text: "#111" },
  "USD/SGD": { label: "Dollar / Singapore Dollar", glyph: "SG", primary: "#ef3340", secondary: "#f8fafc", text: "#111" },
  "EUR/SGD": { label: "Euro / Singapore Dollar", glyph: "ES", primary: "#225eea", secondary: "#ef3340" },
  "BZ=F": { label: "Brent Crude", glyph: "BZ", primary: "#111827", secondary: "#f59e0b" },
  "HO=F": { label: "Heating Oil", glyph: "HO", primary: "#0f172a", secondary: "#38bdf8" },
  "OJ=F": { label: "Orange Juice", glyph: "OJ", primary: "#fb923c", secondary: "#111827", text: "#111" },
  "CT=F": { label: "Cotton", glyph: "CT", primary: "#f8fafc", secondary: "#0f172a", text: "#111" },
  VNQ: { label: "Vanguard Real Estate", glyph: "VQ", primary: "#96151d", secondary: "#f8fafc" },
  XLRE: { label: "Real Estate Select Sector", glyph: "XR", primary: "#2563eb", secondary: "#111827" },
  PSA: { label: "Public Storage", glyph: "PS", primary: "#f97316", secondary: "#111827", text: "#111" },
  O: { label: "Realty Income", glyph: "O", primary: "#0f766e", secondary: "#111827" },
  DLR: { label: "Digital Realty", glyph: "DR", primary: "#dc2626", secondary: "#111827" },
  EQIX: { label: "Equinix", glyph: "EQ", primary: "#ed1c24", secondary: "#111827" },
  IBKR: { label: "Interactive Brokers", glyph: "IB", primary: "#111827", secondary: "#c8a45d" },
};

export const pass403PseudoPricePatch: Record<string, string> = {
  SAP: "€184.20", ORCL: "$124.80", CRM: "$253.50", SNOW: "$142.60", DDOG: "$119.40", MDB: "$269.70", ZS: "$184.30", FTNT: "$64.90",
  "MC.PA": "€712.50", "KER.PA": "€319.40", "CFR.SW": "CHF 134.20", "ITX.MC": "€44.10", "9988.HK": "HK$78.40", "0700.HK": "HK$382.00", "005930.KS": "₩78,100",
  "EUR/NOK": "11.54", "USD/NOK": "10.73", "EUR/SEK": "11.31", "USD/SEK": "10.52", "USD/SGD": "1.35", "EUR/SGD": "1.45",
  "BZ=F": "$82.10", "HO=F": "$2.55", "OJ=F": "$373", "CT=F": "$76.40", VNQ: "$83.40", XLRE: "$38.70", PSA: "$278.80", O: "$54.20", DLR: "$145.10", EQIX: "$779.40", IBKR: "$117.30",
};

export function buildPass403MarketCoverageUniverse(): UniversalAssetRow[] {
  return [
    row({ id: "pass403-sap", rank: 1081, symbol: "SAP", name: "SAP", assetClass: "stock", riskPressure: 30, sparkTone: "flat" }),
    row({ id: "pass403-oracle", rank: 1082, symbol: "ORCL", name: "Oracle", assetClass: "stock", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass403-salesforce", rank: 1083, symbol: "CRM", name: "Salesforce", assetClass: "stock", riskPressure: 40, sparkTone: "watch" }),
    row({ id: "pass403-snowflake", rank: 1084, symbol: "SNOW", name: "Snowflake", assetClass: "stock", riskPressure: 55, sparkTone: "watch" }),
    row({ id: "pass403-datadog", rank: 1085, symbol: "DDOG", name: "Datadog", assetClass: "stock", riskPressure: 49, sparkTone: "watch" }),
    row({ id: "pass403-mongodb", rank: 1086, symbol: "MDB", name: "MongoDB", assetClass: "stock", riskPressure: 50, sparkTone: "watch" }),
    row({ id: "pass403-zscaler", rank: 1087, symbol: "ZS", name: "Zscaler", assetClass: "stock", riskPressure: 46, sparkTone: "watch" }),
    row({ id: "pass403-fortinet", rank: 1088, symbol: "FTNT", name: "Fortinet", assetClass: "stock", riskPressure: 38, sparkTone: "flat" }),
    row({ id: "pass403-lvmh", rank: 1089, symbol: "MC.PA", name: "LVMH", assetClass: "stock", riskPressure: 28, sparkTone: "flat" }),
    row({ id: "pass403-kering", rank: 1090, symbol: "KER.PA", name: "Kering", assetClass: "stock", riskPressure: 37, sparkTone: "watch" }),
    row({ id: "pass403-richemont", rank: 1091, symbol: "CFR.SW", name: "Richemont", assetClass: "stock", riskPressure: 31, sparkTone: "flat" }),
    row({ id: "pass403-inditex", rank: 1092, symbol: "ITX.MC", name: "Inditex", assetClass: "stock", riskPressure: 27, sparkTone: "flat" }),
    row({ id: "pass403-alibaba", rank: 1093, symbol: "9988.HK", name: "Alibaba", assetClass: "stock", riskPressure: 56, sparkTone: "watch" }),
    row({ id: "pass403-tencent", rank: 1094, symbol: "0700.HK", name: "Tencent", assetClass: "stock", riskPressure: 47, sparkTone: "watch" }),
    row({ id: "pass403-samsung", rank: 1095, symbol: "005930.KS", name: "Samsung Electronics", assetClass: "stock", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass403-eurnok", rank: 1096, symbol: "EUR/NOK", name: "Euro / Norwegian Krone", assetClass: "fx", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass403-usdnok", rank: 1097, symbol: "USD/NOK", name: "Dollar / Norwegian Krone", assetClass: "fx", riskPressure: 38, sparkTone: "flat" }),
    row({ id: "pass403-eursek", rank: 1098, symbol: "EUR/SEK", name: "Euro / Swedish Krona", assetClass: "fx", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass403-usdsek", rank: 1099, symbol: "USD/SEK", name: "Dollar / Swedish Krona", assetClass: "fx", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass403-usdsgd", rank: 1100, symbol: "USD/SGD", name: "Dollar / Singapore Dollar", assetClass: "fx", riskPressure: 28, sparkTone: "flat" }),
    row({ id: "pass403-eursgd", rank: 1101, symbol: "EUR/SGD", name: "Euro / Singapore Dollar", assetClass: "fx", riskPressure: 29, sparkTone: "flat" }),
    row({ id: "pass403-brent", rank: 1102, symbol: "BZ=F", name: "Brent Crude Futures", assetClass: "commodity", riskPressure: 56, sparkTone: "watch" }),
    row({ id: "pass403-heating-oil", rank: 1103, symbol: "HO=F", name: "Heating Oil Futures", assetClass: "commodity", riskPressure: 53, sparkTone: "watch" }),
    row({ id: "pass403-orange-juice", rank: 1104, symbol: "OJ=F", name: "Orange Juice Futures", assetClass: "commodity", riskPressure: 62, sparkTone: "watch" }),
    row({ id: "pass403-cotton", rank: 1105, symbol: "CT=F", name: "Cotton Futures", assetClass: "commodity", riskPressure: 46, sparkTone: "watch" }),
    row({ id: "pass403-vnq", rank: 1106, symbol: "VNQ", name: "Vanguard Real Estate ETF", assetClass: "real_estate", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass403-xlre", rank: 1107, symbol: "XLRE", name: "Real Estate Select Sector ETF", assetClass: "real_estate", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass403-public-storage", rank: 1108, symbol: "PSA", name: "Public Storage", assetClass: "real_estate", riskPressure: 32, sparkTone: "flat" }),
    row({ id: "pass403-realty-income", rank: 1109, symbol: "O", name: "Realty Income", assetClass: "real_estate", riskPressure: 39, sparkTone: "watch" }),
    row({ id: "pass403-digital-realty", rank: 1110, symbol: "DLR", name: "Digital Realty", assetClass: "real_estate", riskPressure: 37, sparkTone: "flat" }),
    row({ id: "pass403-equinix", rank: 1111, symbol: "EQIX", name: "Equinix", assetClass: "real_estate", riskPressure: 31, sparkTone: "flat" }),
    row({ id: "pass403-ibkr", rank: 1112, symbol: "IBKR", name: "Interactive Brokers", assetClass: "stock", riskPressure: 33, sparkTone: "flat" }),
  ];
}

export const pass403SecurityOnePageCopy = [
  "Public Security remains one page: private keys never leave the user, signatures prove control and sensitive report details are redacted before export.",
  "Provider truth appears before AI tone: timestamp, cache age, fallback flag, reconnect state, logo authority and second-source drift are separated.",
  "Research Lab remains an audit and replication lane for prime/RNG/entropy work, not a public shortcut to break wallets or a final theorem claim.",
] as const;

export const pass403Supersedes = pass402TerminalCleanOrbit.version;
void PASS402_RUNTIME_CLOSE_EVENT;
