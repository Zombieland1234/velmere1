import type { UniversalAssetRow } from "./universal-asset-market-matrix";
import {
  PASS408_RUNTIME_CLOSE_EVENT,
  buildPass408TerminalSourceProofReadout,
  pass408TerminalSourceProofOrbit,
  type Pass408AuditMode,
} from "./pass408-terminal-source-proof-orbit";

export const PASS409_RUNTIME_CLOSE_EVENT = "velmere:pass409:terminal-source-truth-orbit-close";
export type Pass409AuditMode = Pass408AuditMode;
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
    sourceRhythm: input.sourceRhythm ?? `${lane} provider cadence · terminal source truth · reconnect guard · payload hash · locale lock`,
    priceLane: input.priceLane ?? `${lane} Shield-grade candles · wick/body/volume grammar · timeframe lock · Orbit 360 modal mirror`,
    volumeLane: input.volumeLane ?? `${lane} liquidity, spread proxy, session rhythm, fallback flag and data age stay visible before AI tone`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${lane} issuer, venue, methodology, icon authority, provider timestamp and payload exactness are shown before confidence`,
    secondSourceLane: input.secondSourceLane ?? "provider ↔ second source ↔ close bus ↔ Brain modal ↔ preview ↔ PDF exact payload ↔ checksum",
    confidenceFloor: input.confidenceFloor ?? 93,
    adapterState: input.adapterState ?? "provider_required",
    humanCopy: input.humanCopy ?? `${input.symbol} is routed through PASS409: terminal source truth, one close bus, Shield-grade chart, Orbit 360 Brain and exact locale payload across preview/download.`,
    nextAdapterStep: input.nextAdapterStep ?? "Wire live OHLCV, official icon authority, session calendar, payload checksum and second-source drift before increasing live confidence.",
    ...input,
  };
}

export const pass409TerminalSourceTruthOrbit = {
  version: "PASS409.terminal_source_truth_orbit",
  runtimeRule: "One close bus shuts Browser, Shield, Shield Map and Real Markets suggestions before modal open, PDF forge, preview, download, scroll, tab switch and route handoff.",
  marketRule: "Real Markets mirrors Shield: trusted icon, advanced candles, timeframe, Basic/Pro/Advanced, Orbit 360 Brain, concise output fields and provider-required live boundary.",
  pdfRule: "Preview and downloaded PDF must be rendered from the exact same resolved payload: symbol, locale, asset class, field order, source proof, copy and disclaimer boundary.",
  brainRule: "The VLM coin receives source truth, candle state, second-source drift, security boundary, research boundary and payload exactness before morphing into Basic 10, Pro 14 or Advanced 20 fields.",
  copyRule: "Public copy stays compact: source, chart, proof, security boundary, research boundary, locale, payload checksum and next verification step only.",
  securityRule: "Security copy stays simple and premium: private-key boundary, signature proof, entropy quality, redaction, provider truth and withheld internal methods.",
  launchRule: "Status is earned by exact payload, traceability and calm proof, never by fake scarcity, profit language or debug pass-history.",
  inheritedCloseBus: PASS408_RUNTIME_CLOSE_EVENT,
  previousVersion: pass408TerminalSourceProofOrbit.version,
} as const;

export const pass409SourceTruthTimeline = [
  { id: "close", label: "close bus", seconds: 0.02, copy: "Suggestions close before search submit, modal open, PDF forge, preview, download, scroll, tab switch and route handoff." },
  { id: "resolve", label: "resolve once", seconds: 0.10, copy: "Symbol, locale, asset class, title, provider state, fallback flags and output order resolve once." },
  { id: "checksum", label: "payload checksum", seconds: 0.18, copy: "The same resolved payload is tagged for search, modal, brain, preview and PDF download." },
  { id: "identity", label: "identity seal", seconds: 0.28, copy: "Icon, venue, market lane and source route lock before the AI Brain writes copy." },
  { id: "candles", label: "Shield candles", seconds: 0.44, copy: "Stocks, FX, ETF, commodities and REIT proxies use the same candle grammar as Shield." },
  { id: "freshness", label: "freshness rail", seconds: 0.66, copy: "Timestamp, cache age, reconnect state and second-source drift stay separate from narrative tone." },
  { id: "depth", label: "depth context", seconds: 0.92, copy: "Order-book depth and volume are treated as context, never as a hidden trading instruction." },
  { id: "orbit", label: "Orbit 360", seconds: 1.18, copy: "Blue source packets feed the VLM coin and neural shell instead of random cards." },
  { id: "security", label: "security boundary", seconds: 1.52, copy: "Private keys, signatures, entropy and redaction are explained without exposing internal scoring." },
  { id: "research", label: "research boundary", seconds: 1.88, copy: "Prime/RNG work remains framed as audit, replication and falsification." },
  { id: "locale", label: "locale lock", seconds: 2.26, copy: "PL, EN and DE labels resolve once and mirror into preview and downloaded PDF." },
  { id: "morph", label: "field morph", seconds: 2.76, copy: "The brain morphs into Basic 10, Pro 14 or Advanced 20 fields." },
  { id: "clean", label: "clean public UI", seconds: 3.28, copy: "Old pass-history stays hidden; only the newest public terminal remains visible." },
  { id: "proof", label: "proof first", seconds: 3.92, copy: "Premium pressure comes from proof, freshness and traceability instead of hype." },
  { id: "pdf", label: "PDF mirror", seconds: 4.58, copy: "Preview and download keep the same payload, order, language and proof boundary." },
  { id: "provider", label: "provider ready", seconds: 5.30, copy: "The next production step is provider wiring, not fake-live placeholders." },
  { id: "seal", label: "source truth seal", seconds: 6.08, copy: "The same resolved payload feeds search, modal, Brain, preview and download." },
] as const;

const localeLine: Record<"pl" | "en" | "de", string> = {
  pl: "Jeden payload zasila wyszukiwarkę, modal, Orbit Brain, podgląd i PDF; widok publiczny pokazuje źródła, wykres, dowód, granice i krótkie pola bez losowego copy.",
  en: "One payload powers search, modal, Orbit Brain, preview and PDF; the public surface shows source, chart, proof, boundaries and concise fields without random copy.",
  de: "Ein Payload speist Suche, Modal, Orbit Brain, Vorschau und PDF; die öffentliche Oberfläche zeigt Quelle, Chart, Nachweis, Grenzen und kurze Felder ohne Zufallstexte.",
};

export function buildPass409TerminalSourceTruthReadout(input: {
  symbol: string;
  name: string;
  type: string;
  risk: number;
  source: string;
  mode: Pass409AuditMode;
  locale?: "pl" | "en" | "de";
}) {
  const base = buildPass408TerminalSourceProofReadout(input);
  const count = input.mode === "advanced" ? 20 : input.mode === "pro" ? 14 : 10;
  const locale = input.locale ?? "en";
  return {
    version: pass409TerminalSourceTruthOrbit.version,
    count,
    seconds: Math.max(base.seconds, 6.08) + 0.18,
    headline: `${input.symbol} · source truth orbit`,
    body: `${input.mode.toUpperCase()} uses one resolved payload, one close bus, one Shield-grade chart, one Orbit 360 VLM Brain and one locale-exact PDF mirror before ${count} fields appear. ${localeLine[locale]}`,
    fields: base.fields.slice(0, count).map((field, index) => ({
      ...field,
      value: index === 0 ? `${input.symbol} · source truth` : index === 1 ? `${input.source} · reconnect/freshness rail` : index === 2 ? `${input.mode.toUpperCase()} · ${count} fields` : index === 3 ? `${input.type} · Shield mirror` : index === 4 ? `${locale.toUpperCase()} · locale lock` : index === 5 ? "preview = download" : index === 6 ? "payload checksum" : field.value,
      copy: index === 0 ? `${input.name}: ${pass409TerminalSourceTruthOrbit.pdfRule}` : index === 1 ? pass409TerminalSourceTruthOrbit.runtimeRule : index === 2 ? pass409TerminalSourceTruthOrbit.brainRule : index === 3 ? pass409TerminalSourceTruthOrbit.marketRule : index === 4 ? localeLine[locale] : index === 5 ? "Preview, downloaded PDF and modal readout share one payload order, not a separate text generator." : index === 6 ? "Depth, spread, volume and fallback state inform boundaries but never become a hidden trading instruction." : field.copy,
    })),
  };
}

export const pass409AssetVisualPatch: Record<string, VisualPatch> = {
  CRWD: { label: "CrowdStrike", glyph: "CS", primary: "#dc2626", secondary: "#111827" },
  NET: { label: "Cloudflare", glyph: "CF", primary: "#f48120", secondary: "#111827", text: "#111" },
  DDOG: { label: "Datadog", glyph: "DD", primary: "#632ca6", secondary: "#f8fafc" },
  SNOW: { label: "Snowflake", glyph: "SF", primary: "#29b5e8", secondary: "#111827", text: "#111" },
  PLTR: { label: "Palantir", glyph: "PL", primary: "#111827", secondary: "#e5e7eb" },
  MDB: { label: "MongoDB", glyph: "DB", primary: "#13aa52", secondary: "#111827", text: "#111" },
  ANET: { label: "Arista", glyph: "AN", primary: "#2563eb", secondary: "#f8fafc" },
  VRT: { label: "Vertiv", glyph: "VT", primary: "#0f172a", secondary: "#60a5fa" },
  ASML: { label: "ASML", glyph: "AS", primary: "#ff6a00", secondary: "#111827", text: "#111" },
  TSM: { label: "TSMC", glyph: "TS", primary: "#b91c1c", secondary: "#f8fafc" },
  "6758.T": { label: "Sony", glyph: "SO", primary: "#111827", secondary: "#e5e7eb" },
  "9984.T": { label: "SoftBank", glyph: "SB", primary: "#e60012", secondary: "#f8fafc" },
  "7203.T": { label: "Toyota", glyph: "TY", primary: "#eb0a1e", secondary: "#111827" },
  "AIR.PA": { label: "Airbus", glyph: "AB", primary: "#00205b", secondary: "#f8fafc" },
  "SAF.PA": { label: "Safran", glyph: "SF", primary: "#00539f", secondary: "#f8fafc" },
  "KER.PA": { label: "Kering", glyph: "KG", primary: "#111827", secondary: "#d6b56d" },
  "ZAL.DE": { label: "Zalando", glyph: "ZA", primary: "#ff6900", secondary: "#111827", text: "#111" },
  "BAS.DE": { label: "BASF", glyph: "BA", primary: "#004a98", secondary: "#f8fafc" },
  "USD/CNH": { label: "Dollar / Offshore Yuan", glyph: "CNH", primary: "#dc2626", secondary: "#facc15", text: "#111" },
  "EUR/SEK": { label: "Euro / Swedish Krona", glyph: "SEK", primary: "#2563eb", secondary: "#facc15", text: "#111" },
  "USD/SEK": { label: "Dollar / Swedish Krona", glyph: "SEK", primary: "#1d4ed8", secondary: "#facc15", text: "#111" },
  "EUR/NOK": { label: "Euro / Norwegian Krone", glyph: "NOK", primary: "#dc2626", secondary: "#1d4ed8" },
  "USD/NOK": { label: "Dollar / Norwegian Krone", glyph: "NOK", primary: "#b91c1c", secondary: "#1d4ed8" },
  "COFFEE=F": { label: "Coffee Futures", glyph: "CF", primary: "#7c2d12", secondary: "#fbbf24", text: "#111" },
  "COCOA=F": { label: "Cocoa Futures", glyph: "CC", primary: "#4a2c2a", secondary: "#f59e0b" },
  "COTTON=F": { label: "Cotton Futures", glyph: "CT", primary: "#f8fafc", secondary: "#94a3b8", text: "#111" },
  IYR: { label: "iShares US Real Estate", glyph: "YR", primary: "#0f766e", secondary: "#f8fafc" },
  SCHH: { label: "Schwab US REIT", glyph: "SH", primary: "#2563eb", secondary: "#f8fafc" },
  VNQI: { label: "Vanguard Global ex-US Real Estate", glyph: "VQ", primary: "#991b1b", secondary: "#f8fafc" },
  BOTZ: { label: "Global X Robotics AI", glyph: "BZ", primary: "#0f172a", secondary: "#38bdf8" },
  ROBO: { label: "ROBO Global Robotics", glyph: "RB", primary: "#312e81", secondary: "#f8fafc" },
};

export const pass409PseudoPricePatch: Record<string, string> = {
  CRWD: "$356.20", NET: "$92.40", DDOG: "$128.80", SNOW: "$159.30", PLTR: "$24.70", MDB: "$263.40", ANET: "$312.60", VRT: "$93.10", ASML: "€902.50", TSM: "$172.80", "6758.T": "¥13,250", "9984.T": "¥9,860", "7203.T": "¥3,140", "AIR.PA": "€164.20", "SAF.PA": "€213.60", "KER.PA": "€345.10", "ZAL.DE": "€25.40", "BAS.DE": "€46.20", "USD/CNH": "7.24", "EUR/SEK": "11.35", "USD/SEK": "10.53", "EUR/NOK": "11.62", "USD/NOK": "10.78", "COFFEE=F": "$224.10", "COCOA=F": "$8,180", "COTTON=F": "$0.78", IYR: "$88.30", SCHH: "$20.40", VNQI: "$42.80", BOTZ: "$31.90", ROBO: "$56.70",
};

export function buildPass409MarketCoverageUniverse(): UniversalAssetRow[] {
  return [
    row({ id: "pass409-crowdstrike", rank: 1259, symbol: "CRWD", name: "CrowdStrike", assetClass: "stock", riskPressure: 42, sparkTone: "watch" }),
    row({ id: "pass409-cloudflare", rank: 1260, symbol: "NET", name: "Cloudflare", assetClass: "stock", riskPressure: 44, sparkTone: "watch" }),
    row({ id: "pass409-datadog", rank: 1261, symbol: "DDOG", name: "Datadog", assetClass: "stock", riskPressure: 40, sparkTone: "flat" }),
    row({ id: "pass409-snowflake", rank: 1262, symbol: "SNOW", name: "Snowflake", assetClass: "stock", riskPressure: 43, sparkTone: "watch" }),
    row({ id: "pass409-palantir", rank: 1263, symbol: "PLTR", name: "Palantir", assetClass: "stock", riskPressure: 48, sparkTone: "watch" }),
    row({ id: "pass409-mongodb", rank: 1264, symbol: "MDB", name: "MongoDB", assetClass: "stock", riskPressure: 41, sparkTone: "flat" }),
    row({ id: "pass409-arista", rank: 1265, symbol: "ANET", name: "Arista Networks", assetClass: "stock", riskPressure: 38, sparkTone: "flat" }),
    row({ id: "pass409-vertiv", rank: 1266, symbol: "VRT", name: "Vertiv", assetClass: "stock", riskPressure: 45, sparkTone: "watch" }),
    row({ id: "pass409-asml", rank: 1267, symbol: "ASML", name: "ASML", assetClass: "stock", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass409-tsmc", rank: 1268, symbol: "TSM", name: "TSMC", assetClass: "stock", riskPressure: 37, sparkTone: "flat" }),
    row({ id: "pass409-sony", rank: 1269, symbol: "6758.T", name: "Sony", assetClass: "stock", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass409-softbank", rank: 1270, symbol: "9984.T", name: "SoftBank Group", assetClass: "stock", riskPressure: 48, sparkTone: "watch" }),
    row({ id: "pass409-toyota", rank: 1271, symbol: "7203.T", name: "Toyota", assetClass: "stock", riskPressure: 33, sparkTone: "flat" }),
    row({ id: "pass409-airbus", rank: 1272, symbol: "AIR.PA", name: "Airbus", assetClass: "stock", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass409-safran", rank: 1273, symbol: "SAF.PA", name: "Safran", assetClass: "stock", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass409-kering", rank: 1274, symbol: "KER.PA", name: "Kering", assetClass: "stock", riskPressure: 39, sparkTone: "flat" }),
    row({ id: "pass409-zalando", rank: 1275, symbol: "ZAL.DE", name: "Zalando", assetClass: "stock", riskPressure: 44, sparkTone: "watch" }),
    row({ id: "pass409-basf", rank: 1276, symbol: "BAS.DE", name: "BASF", assetClass: "stock", riskPressure: 38, sparkTone: "flat" }),
    row({ id: "pass409-usdcnh", rank: 1277, symbol: "USD/CNH", name: "Dollar / Offshore Yuan", assetClass: "fx", riskPressure: 41, sparkTone: "watch" }),
    row({ id: "pass409-eursek", rank: 1278, symbol: "EUR/SEK", name: "Euro / Swedish Krona", assetClass: "fx", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass409-usdsek", rank: 1279, symbol: "USD/SEK", name: "Dollar / Swedish Krona", assetClass: "fx", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass409-eurnok", rank: 1280, symbol: "EUR/NOK", name: "Euro / Norwegian Krone", assetClass: "fx", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass409-usdnok", rank: 1281, symbol: "USD/NOK", name: "Dollar / Norwegian Krone", assetClass: "fx", riskPressure: 37, sparkTone: "flat" }),
    row({ id: "pass409-coffee", rank: 1282, symbol: "COFFEE=F", name: "Coffee Futures", assetClass: "commodity", riskPressure: 50, sparkTone: "watch" }),
    row({ id: "pass409-cocoa", rank: 1283, symbol: "COCOA=F", name: "Cocoa Futures", assetClass: "commodity", riskPressure: 56, sparkTone: "watch" }),
    row({ id: "pass409-cotton", rank: 1284, symbol: "COTTON=F", name: "Cotton Futures", assetClass: "commodity", riskPressure: 42, sparkTone: "watch" }),
    row({ id: "pass409-iyr", rank: 1285, symbol: "IYR", name: "iShares US Real Estate ETF", assetClass: "real_estate", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass409-schh", rank: 1286, symbol: "SCHH", name: "Schwab US REIT ETF", assetClass: "real_estate", riskPressure: 33, sparkTone: "flat" }),
    row({ id: "pass409-vnqi", rank: 1287, symbol: "VNQI", name: "Vanguard Global ex-US Real Estate", assetClass: "real_estate", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass409-botz", rank: 1288, symbol: "BOTZ", name: "Global X Robotics & AI ETF", assetClass: "etf", riskPressure: 41, sparkTone: "watch" }),
    row({ id: "pass409-robo", rank: 1289, symbol: "ROBO", name: "ROBO Global Robotics ETF", assetClass: "etf", riskPressure: 39, sparkTone: "flat" }),
  ];
}

export const pass409SecurityOnePageCopy = [
  "Private keys never enter the report; the public layer shows signature boundaries, redaction and source class only.",
  "Provider truth stays separate from AI tone: timestamp, cache age, fallback state, reconnect status and second-source drift remain visible.",
  "Preview, modal and downloaded PDF share one resolved payload; separate random text generation is not allowed.",
  "Internal scoring methods stay withheld; the public surface shows source class, proof lane, redaction and next verification step.",
] as const;

export const pass409ResearchBridge = {
  headline: "Research Lab as source-truth discipline",
  lanes: ["finite numerical audit", "RNG/entropy testing", "signature boundary education", "replication pack", "falsification queue", "payload checksum mirror"],
  publicBoundary: "Velmere Research Lab can describe tests, reductions and hypotheses, but public copy must stay in audit/replication/falsification language until independent review exists.",
} as const;
