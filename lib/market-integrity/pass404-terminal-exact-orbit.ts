import type { UniversalAssetRow } from "./universal-asset-market-matrix";
import {
  PASS403_RUNTIME_CLOSE_EVENT,
  buildPass403TerminalTruthOrbitReadout,
  pass403TerminalTruthOrbit,
  type Pass403AuditMode,
} from "./pass403-terminal-truth-orbit";

export const PASS404_RUNTIME_CLOSE_EVENT = "velmere:pass404:terminal-exact-orbit-close";
export type Pass404AuditMode = Pass403AuditMode;
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
    sourceRhythm: input.sourceRhythm ?? `${lane} provider cadence · session calendar · reconnect guard · cache-age badge · second-source drift`,
    priceLane: input.priceLane ?? `${lane} Shield mirror candles · wick/body/volume grammar · timeframe lock · compact terminal view`,
    volumeLane: input.volumeLane ?? `${lane} liquidity, spread proxy, session volume, fallback flag and data age stay visible before AI tone`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${lane} issuer, venue, methodology, logo authority and provider timestamp are shown before confidence`,
    secondSourceLane: input.secondSourceLane ?? "primary provider ↔ second source ↔ Browser modal ↔ preview ↔ PDF download exact payload",
    confidenceFloor: input.confidenceFloor ?? 89,
    adapterState: input.adapterState ?? "provider_required",
    humanCopy: input.humanCopy ?? `${input.symbol} is routed through PASS404: one close controller, one Shield-grade chart modal, one Orbit 360 VLM Brain and one exact PDF payload.`,
    nextAdapterStep: input.nextAdapterStep ?? "Attach live OHLCV provider, logo authority, market calendar, cache-age badge, reconnect guard and second-source drift before raising live confidence.",
    ...input,
  };
}

export const pass404TerminalExactOrbit = {
  version: "PASS404.terminal_exact_orbit",
  runtimeRule: "One close controller shuts Browser, Shield, Shield Map and Real Markets suggestions before modal open, PDF preview, PDF download, scroll, tab switch and route handoff.",
  marketRule: "Real Markets mirrors Shield: identity, trusted icon, advanced candles, timeframe, Basic/Pro/Advanced, Orbit 360 Brain and compact field output share one path.",
  pdfRule: "HTML preview and downloaded PDF must use the same resolved report object, locale, section order and deterministic copy; no second text generator is allowed.",
  brainRule: "The VLM coin receives provider freshness, candle context, second source, security boundary and research boundary before morphing into Basic 10, Pro 14 or Advanced 20 fields.",
  copyRule: "Public copy is compact and premium: source truth, chart state, proof lane, security boundary, research boundary and next verification step only.",
  securityRule: "Security stays simple: private-key boundary, signature proof, entropy quality, redaction, provider truth and withheld internal methods.",
  launchRule: "Status is earned by exactness and traceability, never by fake scarcity, profit language or debug pass-history.",
  inheritedCloseBus: PASS403_RUNTIME_CLOSE_EVENT,
} as const;

export const pass404TruthOrbitTimeline = [
  { id: "close", label: "runtime close", seconds: 0.04, copy: "All floating search portals close before modal, PDF, scroll, tab and route actions." },
  { id: "identity", label: "identity lock", seconds: 0.16, copy: "Symbol, route, locale, class, icon, provider state and title lock into one object." },
  { id: "chart", label: "Shield chart", seconds: 0.38, copy: "Real Stocks, FX, ETF and commodities use the same candle/timeframe language as Shield." },
  { id: "provider", label: "provider truth", seconds: 0.64, copy: "Timestamp, cache age, fallback flag and second-source drift stay separate from AI copy." },
  { id: "orbit", label: "Orbit 360", seconds: 0.96, copy: "Blue source packets feed the VLM coin and neural shell instead of showing debug cards." },
  { id: "security", label: "security boundary", seconds: 1.30, copy: "Private key, signature proof, entropy and redaction stay visible without exposing internals." },
  { id: "research", label: "research boundary", seconds: 1.70, copy: "Prime/RNG work remains framed as audit, replication and falsification." },
  { id: "locale", label: "locale exactness", seconds: 2.06, copy: "PL, EN and DE labels are resolved once and mirrored into preview and downloaded PDF." },
  { id: "morph", label: "field morph", seconds: 2.52, copy: "The brain morphs into Basic 10, Pro 14 or Advanced 20 readable fields." },
  { id: "clean", label: "clean terminal", seconds: 3.08, copy: "Old pass-history remains hidden from the public surface; one current terminal stays visible." },
  { id: "proof", label: "proof first", seconds: 3.76, copy: "Premium pressure comes from proof, freshness and traceability, not hype." },
  { id: "download", label: "PDF mirror", seconds: 4.40, copy: "Preview and download keep the same payload, same order and same language." },
  { id: "ready", label: "launch ready", seconds: 4.92, copy: "The next step is live provider wiring, not fake-live placeholders." },
] as const;

const localeLine: Record<"pl" | "en" | "de", string> = {
  pl: "Jeden kontroler zamyka wyszukiwarkę, jeden payload zasila modal, Orbit Brain, podgląd i PDF, a publiczny widok pokazuje tylko źródła, wykres, dowód i krótkie pola.",
  en: "One controller closes search, one payload powers modal, Orbit Brain, preview and PDF, and the public surface shows only source, chart, proof and concise fields.",
  de: "Ein Controller schließt die Suche, ein Payload speist Modal, Orbit Brain, Vorschau und PDF; die öffentliche Oberfläche zeigt nur Quelle, Chart, Nachweis und kurze Felder.",
};

export function buildPass404TerminalExactOrbitReadout(input: {
  symbol: string;
  name: string;
  type: string;
  risk: number;
  source: string;
  mode: Pass404AuditMode;
  locale?: "pl" | "en" | "de";
}) {
  const base = buildPass403TerminalTruthOrbitReadout(input);
  const count = input.mode === "advanced" ? 20 : input.mode === "pro" ? 14 : 10;
  const locale = input.locale ?? "en";
  return {
    version: pass404TerminalExactOrbit.version,
    count,
    seconds: Math.max(base.seconds, 4.92) + 0.18,
    headline: `${input.symbol} · terminal exact orbit`,
    body: `${input.mode.toUpperCase()} uses one close controller, one Shield-grade chart path, one Orbit 360 VLM Brain and one exact PDF payload before ${count} fields appear. ${localeLine[locale]}`,
    fields: base.fields.slice(0, count).map((field, index) => ({
      ...field,
      value: index === 0 ? `${input.symbol} · exact payload` : index === 1 ? `${input.source} · close bus` : index === 2 ? `${input.mode.toUpperCase()} · ${count} fields` : index === 3 ? `${input.type} · Shield mirror` : field.value,
      copy: index === 0 ? `${input.name}: ${pass404TerminalExactOrbit.pdfRule}` : index === 1 ? pass404TerminalExactOrbit.runtimeRule : index === 2 ? pass404TerminalExactOrbit.brainRule : index === 3 ? pass404TerminalExactOrbit.marketRule : field.copy,
    })),
  };
}

export const pass404AssetVisualPatch: Record<string, VisualPatch> = {
  INTU: { label: "Intuit", glyph: "IN", primary: "#236cfe", secondary: "#111827" },
  ADBE: { label: "Adobe", glyph: "AD", primary: "#ff0000", secondary: "#111827" },
  NOW: { label: "ServiceNow", glyph: "NW", primary: "#00a862", secondary: "#111827", text: "#111" },
  PANW: { label: "Palo Alto Networks", glyph: "PN", primary: "#fa582d", secondary: "#111827", text: "#111" },
  CRWD: { label: "CrowdStrike", glyph: "CS", primary: "#e01f3d", secondary: "#111827" },
  NET: { label: "Cloudflare", glyph: "CF", primary: "#f38020", secondary: "#111827", text: "#111" },
  SHOP: { label: "Shopify", glyph: "SH", primary: "#95bf47", secondary: "#111827", text: "#111" },
  SPOT: { label: "Spotify", glyph: "SP", primary: "#1db954", secondary: "#111827", text: "#111" },
  "RACE.MI": { label: "Ferrari", glyph: "FR", primary: "#dc0000", secondary: "#ffd700", text: "#111" },
  "RMS.PA": { label: "Hermes", glyph: "HM", primary: "#f37021", secondary: "#111827", text: "#111" },
  "ADS.DE": { label: "Adidas", glyph: "AD", primary: "#111827", secondary: "#f8fafc" },
  "BMW.DE": { label: "BMW", glyph: "BM", primary: "#0066b1", secondary: "#f8fafc" },
  "7203.T": { label: "Toyota", glyph: "TY", primary: "#eb0a1e", secondary: "#111827" },
  "6758.T": { label: "Sony", glyph: "SN", primary: "#111827", secondary: "#f8fafc" },
  "EUR/CNH": { label: "Euro / Offshore Yuan", glyph: "CN", primary: "#de2910", secondary: "#ffde00", text: "#111" },
  "USD/CNH": { label: "Dollar / Offshore Yuan", glyph: "UC", primary: "#de2910", secondary: "#2563eb" },
  "EUR/HKD": { label: "Euro / Hong Kong Dollar", glyph: "HK", primary: "#de2910", secondary: "#f8fafc", text: "#111" },
  "USD/HKD": { label: "Dollar / Hong Kong Dollar", glyph: "UH", primary: "#2563eb", secondary: "#de2910" },
  "EUR/ILS": { label: "Euro / Israeli Shekel", glyph: "IL", primary: "#0038b8", secondary: "#f8fafc" },
  "USD/ILS": { label: "Dollar / Israeli Shekel", glyph: "US", primary: "#0038b8", secondary: "#2563eb" },
  "LE=F": { label: "Live Cattle", glyph: "LC", primary: "#92400e", secondary: "#f8fafc" },
  "GF=F": { label: "Feeder Cattle", glyph: "GF", primary: "#78350f", secondary: "#facc15" },
  "LBS=F": { label: "Lumber", glyph: "LB", primary: "#166534", secondary: "#fbbf24", text: "#111" },
  "PA=F": { label: "Palladium", glyph: "PD", primary: "#94a3b8", secondary: "#111827", text: "#111" },
  IYR: { label: "US Real Estate ETF", glyph: "IY", primary: "#0f766e", secondary: "#111827" },
  SCHH: { label: "Schwab US REIT ETF", glyph: "SC", primary: "#0f172a", secondary: "#38bdf8" },
  VEA: { label: "Developed Markets ETF", glyph: "VE", primary: "#96151d", secondary: "#f8fafc" },
  EEM: { label: "Emerging Markets ETF", glyph: "EM", primary: "#14532d", secondary: "#facc15", text: "#111" },
  QQQ: { label: "Nasdaq 100 ETF", glyph: "QQ", primary: "#2563eb", secondary: "#111827" },
  DIA: { label: "Dow Jones ETF", glyph: "DJ", primary: "#111827", secondary: "#38bdf8" },
  ENB: { label: "Enbridge", glyph: "EN", primary: "#ffb81c", secondary: "#111827", text: "#111" },
  TTE: { label: "TotalEnergies", glyph: "TE", primary: "#e31b23", secondary: "#2563eb" },
};

export const pass404PseudoPricePatch: Record<string, string> = {
  INTU: "$641.20", ADBE: "$512.40", NOW: "$742.10", PANW: "$321.60", CRWD: "$386.90", NET: "$92.40", SHOP: "$68.70", SPOT: "$318.10",
  "RACE.MI": "€391.20", "RMS.PA": "€2,285.00", "ADS.DE": "€226.40", "BMW.DE": "€91.30", "7203.T": "¥3,141", "6758.T": "¥13,220",
  "EUR/CNH": "CN¥7.82", "USD/CNH": "CN¥7.24", "EUR/HKD": "HK$8.43", "USD/HKD": "HK$7.80", "EUR/ILS": "₪4.02", "USD/ILS": "₪3.71",
  "LE=F": "$185.40", "GF=F": "$256.10", "LBS=F": "$542.00", "PA=F": "$918.00", IYR: "$87.20", SCHH: "$20.45", VEA: "$51.10", EEM: "$43.80", QQQ: "$462.30", DIA: "$390.20", ENB: "$36.60", TTE: "€64.80",
};

export function buildPass404MarketCoverageUniverse(): UniversalAssetRow[] {
  return [
    row({ id: "pass404-intuit", rank: 1113, symbol: "INTU", name: "Intuit", assetClass: "stock", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass404-adobe", rank: 1114, symbol: "ADBE", name: "Adobe", assetClass: "stock", riskPressure: 38, sparkTone: "flat" }),
    row({ id: "pass404-servicenow", rank: 1115, symbol: "NOW", name: "ServiceNow", assetClass: "stock", riskPressure: 41, sparkTone: "watch" }),
    row({ id: "pass404-panw", rank: 1116, symbol: "PANW", name: "Palo Alto Networks", assetClass: "stock", riskPressure: 44, sparkTone: "watch" }),
    row({ id: "pass404-crowdstrike", rank: 1117, symbol: "CRWD", name: "CrowdStrike", assetClass: "stock", riskPressure: 49, sparkTone: "watch" }),
    row({ id: "pass404-cloudflare", rank: 1118, symbol: "NET", name: "Cloudflare", assetClass: "stock", riskPressure: 47, sparkTone: "watch" }),
    row({ id: "pass404-shopify", rank: 1119, symbol: "SHOP", name: "Shopify", assetClass: "stock", riskPressure: 45, sparkTone: "watch" }),
    row({ id: "pass404-spotify", rank: 1120, symbol: "SPOT", name: "Spotify", assetClass: "stock", riskPressure: 39, sparkTone: "flat" }),
    row({ id: "pass404-ferrari", rank: 1121, symbol: "RACE.MI", name: "Ferrari", assetClass: "stock", riskPressure: 30, sparkTone: "flat" }),
    row({ id: "pass404-hermes", rank: 1122, symbol: "RMS.PA", name: "Hermes", assetClass: "stock", riskPressure: 27, sparkTone: "flat" }),
    row({ id: "pass404-adidas", rank: 1123, symbol: "ADS.DE", name: "Adidas", assetClass: "stock", riskPressure: 32, sparkTone: "flat" }),
    row({ id: "pass404-bmw", rank: 1124, symbol: "BMW.DE", name: "BMW", assetClass: "stock", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass404-toyota", rank: 1125, symbol: "7203.T", name: "Toyota", assetClass: "stock", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass404-sony", rank: 1126, symbol: "6758.T", name: "Sony", assetClass: "stock", riskPressure: 33, sparkTone: "flat" }),
    row({ id: "pass404-eurcnh", rank: 1127, symbol: "EUR/CNH", name: "Euro / Offshore Yuan", assetClass: "fx", riskPressure: 42, sparkTone: "watch" }),
    row({ id: "pass404-usdcnh", rank: 1128, symbol: "USD/CNH", name: "Dollar / Offshore Yuan", assetClass: "fx", riskPressure: 44, sparkTone: "watch" }),
    row({ id: "pass404-eurhkd", rank: 1129, symbol: "EUR/HKD", name: "Euro / Hong Kong Dollar", assetClass: "fx", riskPressure: 31, sparkTone: "flat" }),
    row({ id: "pass404-usdhkd", rank: 1130, symbol: "USD/HKD", name: "Dollar / Hong Kong Dollar", assetClass: "fx", riskPressure: 30, sparkTone: "flat" }),
    row({ id: "pass404-eurils", rank: 1131, symbol: "EUR/ILS", name: "Euro / Israeli Shekel", assetClass: "fx", riskPressure: 46, sparkTone: "watch" }),
    row({ id: "pass404-usdils", rank: 1132, symbol: "USD/ILS", name: "Dollar / Israeli Shekel", assetClass: "fx", riskPressure: 47, sparkTone: "watch" }),
    row({ id: "pass404-live-cattle", rank: 1133, symbol: "LE=F", name: "Live Cattle Futures", assetClass: "commodity", riskPressure: 49, sparkTone: "watch" }),
    row({ id: "pass404-feeder-cattle", rank: 1134, symbol: "GF=F", name: "Feeder Cattle Futures", assetClass: "commodity", riskPressure: 48, sparkTone: "watch" }),
    row({ id: "pass404-lumber", rank: 1135, symbol: "LBS=F", name: "Lumber Futures", assetClass: "commodity", riskPressure: 52, sparkTone: "watch" }),
    row({ id: "pass404-palladium", rank: 1136, symbol: "PA=F", name: "Palladium Futures", assetClass: "commodity", riskPressure: 50, sparkTone: "watch" }),
    row({ id: "pass404-iyr", rank: 1137, symbol: "IYR", name: "iShares US Real Estate ETF", assetClass: "real_estate", riskPressure: 38, sparkTone: "flat" }),
    row({ id: "pass404-schh", rank: 1138, symbol: "SCHH", name: "Schwab US REIT ETF", assetClass: "real_estate", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass404-vea", rank: 1139, symbol: "VEA", name: "Developed Markets ETF", assetClass: "etf", riskPressure: 29, sparkTone: "flat" }),
    row({ id: "pass404-eem", rank: 1140, symbol: "EEM", name: "Emerging Markets ETF", assetClass: "etf", riskPressure: 43, sparkTone: "watch" }),
    row({ id: "pass404-qqq", rank: 1141, symbol: "QQQ", name: "Nasdaq 100 ETF", assetClass: "etf", riskPressure: 39, sparkTone: "watch" }),
    row({ id: "pass404-dia", rank: 1142, symbol: "DIA", name: "Dow Jones ETF", assetClass: "etf", riskPressure: 31, sparkTone: "flat" }),
    row({ id: "pass404-enbridge", rank: 1143, symbol: "ENB", name: "Enbridge", assetClass: "stock", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass404-totalenergies", rank: 1144, symbol: "TTE", name: "TotalEnergies", assetClass: "stock", riskPressure: 37, sparkTone: "flat" }),
  ];
}

export const pass404SecurityOnePageCopy = [
  "Private keys never enter the public report; the user proves control through signature boundaries only.",
  "Provider truth is separated from AI tone: timestamp, cache age, fallback state and second-source drift stay visible.",
  "Entropy and RNG research is described as verification and audit work, not as a claim that secrets can be recovered.",
  "Internal scoring methods stay withheld; the public surface shows only source class, proof lane, redaction and next verification step.",
] as const;

export const pass404ResearchBridge = {
  headline: "Prime Lab as verification research, not a miracle claim",
  lanes: ["finite numerical audit", "RNG/entropy testing", "signature boundary education", "replication pack", "falsification queue"],
  publicBoundary: "Velmere Research Lab can describe tests, reductions and hypotheses, but public copy must not claim formal proof without independent replication.",
} as const;
