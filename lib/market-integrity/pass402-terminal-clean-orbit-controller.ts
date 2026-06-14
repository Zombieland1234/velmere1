import type { UniversalAssetRow } from "./universal-asset-market-matrix";
import {
  PASS401_RUNTIME_CLOSE_EVENT,
  buildPass401TerminalExactnessReadout,
  pass401TerminalExactnessMatrix,
  type Pass401AuditMode,
} from "./pass401-terminal-exactness-matrix";

export const PASS402_RUNTIME_CLOSE_EVENT = "velmere:pass402:terminal-clean-orbit-close";

export type Pass402AuditMode = Pass401AuditMode;
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
    confidenceFloor: input.confidenceFloor ?? 87,
    adapterState: input.adapterState ?? "provider_required",
    humanCopy: input.humanCopy ?? `${input.symbol} is routed through PASS402: one close controller, one Shield-grade modal, one Orbit 360 Brain and one PDF payload.`,
    nextAdapterStep: input.nextAdapterStep ?? "Attach live OHLCV provider, logo authority, market calendar, cache-age badge, reconnect guard and second-source drift before raising live confidence.",
    ...input,
  };
}

export const pass402TerminalCleanOrbit = {
  version: "PASS402.terminal_clean_orbit_controller",
  runtimeRule: "Browser, Shield, Shield Map and Real Markets share one hard-close controller before search, scroll, modal, PDF preview and download actions.",
  marketRule: "Real Markets behaves like Shield: logo identity, exchange-grade candles, timeframe, Basic/Pro/Advanced and Orbit 360 VLM Brain stay in one modal path.",
  pdfRule: "Preview and downloaded PDF use the same resolved report payload, locale, section order and deterministic field copy; no second copy engine is allowed.",
  brainRule: "The VLM coin collects identity, provider, candle, security and research packets into a blue neural shell before morphing into 10/14/20 fields.",
  copyRule: "Public output is concise: identity, chart state, provider freshness, proof lane, security boundary and Research Lab boundary only.",
  securityRule: "Security page copy stays simple and premium: private-key boundary, signature proof, entropy quality, source freshness, redaction and withheld internals.",
  launchRule: "Luxury pressure is proof-first: traceability, authenticity, exact payload parity and source truth replace fake scarcity and hidden debug history.",
} as const;

export const pass402BrainTimeline = [
  { id: "runtime", label: "runtime close", seconds: 0.06, copy: "All floating search portals close before modal, PDF, scroll, tab and download actions." },
  { id: "identity", label: "identity lock", seconds: 0.22, copy: "Symbol, name, route, locale, asset class and visual seal lock into one object." },
  { id: "candles", label: "Shield candles", seconds: 0.48, copy: "Real Stocks and FX reuse Shield candle grammar: wick, body, volume and timeframe." },
  { id: "provider", label: "provider freshness", seconds: 0.78, copy: "Timestamp, cache age, fallback flag and reconnect state are visible before confidence." },
  { id: "second", label: "second source", seconds: 1.10, copy: "Primary provider and second-source drift feed the same Browser/PDF payload." },
  { id: "orbit", label: "Orbit 360", seconds: 1.48, copy: "Blue source packets orbit the VLM coin before entering the brain shell." },
  { id: "security", label: "security bridge", seconds: 1.88, copy: "Private key boundary, signature proof, entropy quality and redaction stay separated." },
  { id: "research", label: "research boundary", seconds: 2.26, copy: "Prime/RNG work stays framed as audit, replication and falsification." },
  { id: "morph", label: "field morph", seconds: 2.72, copy: "The brain transforms into Basic 10, Pro 14 or Advanced 20 readable fields." },
  { id: "locale", label: "locale mirror", seconds: 3.18, copy: "PL/EN/DE text is selected once and reused for preview and download." },
  { id: "pdf", label: "PDF exactness", seconds: 3.66, copy: "The HTML preview and binary PDF stay on the same section order." },
  { id: "launch", label: "premium proof", seconds: 4.20, copy: "Status comes from source truth and traceability, not random hype." },
] as const;

const localeLine: Record<"pl" | "en" | "de", string> = {
  pl: "Jedna decyzja runtime zasila wyszukiwarkę, modal, Orbit Brain, podgląd i pobrany PDF: bez losowych zdań i bez pływających sugestii.",
  en: "One runtime decision powers search, modal, Orbit Brain, preview and PDF download: no random sentences and no floating suggestions.",
  de: "Eine Runtime-Entscheidung speist Suche, Modal, Orbit Brain, Vorschau und PDF-Download: keine Zufallssätze und keine schwebenden Vorschläge.",
};

export function buildPass402TerminalCleanOrbitReadout(input: {
  symbol: string;
  name: string;
  type: string;
  risk: number;
  source: string;
  mode: Pass402AuditMode;
  locale?: "pl" | "en" | "de";
}) {
  const base = buildPass401TerminalExactnessReadout(input);
  const count = input.mode === "advanced" ? 20 : input.mode === "pro" ? 14 : 10;
  const locale = input.locale ?? "en";
  return {
    version: pass402TerminalCleanOrbit.version,
    count,
    seconds: Math.max(base.seconds, 4.20) + 0.18,
    headline: `${input.symbol} · clean orbit controller`,
    body: `${input.mode.toUpperCase()} uses one close controller, Shield-grade candles, provider freshness, Orbit 360 and exact PDF parity before ${count} fields appear. ${localeLine[locale]}`,
    fields: base.fields.slice(0, count).map((field, index) => ({
      ...field,
      value: index === 0 ? `${input.symbol} · exact payload` : index === 1 ? `${input.source} · reconnect/freshness` : index === 2 ? `${input.mode.toUpperCase()} · ${count} fields` : field.value,
      copy: index === 0 ? `${input.name}: ${pass402TerminalCleanOrbit.pdfRule}` : index === 1 ? pass402TerminalCleanOrbit.runtimeRule : index === 2 ? pass402TerminalCleanOrbit.brainRule : field.copy,
    })),
  };
}

export const pass402AssetVisualPatch: Record<string, VisualPatch> = {
  NOW: { label: "ServiceNow", glyph: "NW", primary: "#86c440", secondary: "#111827", text: "#111" },
  NET: { label: "Cloudflare", glyph: "CF", primary: "#f6821f", secondary: "#111827", text: "#111" },
  PANW: { label: "Palo Alto Networks", glyph: "PA", primary: "#fa582d", secondary: "#111827", text: "#111" },
  CRWD: { label: "CrowdStrike", glyph: "CS", primary: "#ef4444", secondary: "#111827" },
  OKTA: { label: "Okta", glyph: "OK", primary: "#00297a", secondary: "#f8fafc" },
  TEAM: { label: "Atlassian", glyph: "AT", primary: "#0052cc", secondary: "#f8fafc" },
  WDAY: { label: "Workday", glyph: "WD", primary: "#f59e0b", secondary: "#111827", text: "#111" },
  ANET: { label: "Arista Networks", glyph: "AN", primary: "#0f172a", secondary: "#38bdf8" },
  AVGO: { label: "Broadcom", glyph: "BG", primary: "#cc092f", secondary: "#f8fafc" },
  ASML: { label: "ASML", glyph: "AS", primary: "#1d4ed8", secondary: "#f97316" },
  TSM: { label: "TSMC", glyph: "TS", primary: "#dc2626", secondary: "#111827" },
  "NESN.SW": { label: "Nestle", glyph: "NS", primary: "#6b4f3f", secondary: "#f8fafc" },
  "NOVO-B.CO": { label: "Novo Nordisk", glyph: "NO", primary: "#005ad2", secondary: "#f8fafc" },
  "ULVR.L": { label: "Unilever", glyph: "UL", primary: "#005eef", secondary: "#f8fafc" },
  "SHEL.L": { label: "Shell", glyph: "SH", primary: "#ffd500", secondary: "#dd1d21", text: "#111" },
  "TTE.PA": { label: "TotalEnergies", glyph: "TE", primary: "#e11d48", secondary: "#2563eb" },
  "7203.T": { label: "Toyota", glyph: "TY", primary: "#eb0a1e", secondary: "#111827" },
  "8035.T": { label: "Tokyo Electron", glyph: "TE", primary: "#111827", secondary: "#38bdf8" },
  "USD/CHF": { label: "Dollar / Swiss Franc", glyph: "CH", primary: "#ef3340", secondary: "#f8fafc", text: "#111" },
  "EUR/CHF": { label: "Euro / Swiss Franc", glyph: "EC", primary: "#225eea", secondary: "#ef3340" },
  "NZD/USD": { label: "New Zealand Dollar / Dollar", glyph: "NZ", primary: "#012169", secondary: "#ef3340" },
  "USD/THB": { label: "Dollar / Thai Baht", glyph: "TH", primary: "#a51931", secondary: "#2d2a4a" },
  "USD/PLN": { label: "Dollar / Polish Zloty", glyph: "PL", primary: "#dc143c", secondary: "#f8fafc", text: "#111" },
  "EUR/PLN": { label: "Euro / Polish Zloty", glyph: "EP", primary: "#225eea", secondary: "#dc143c" },
  "NG=F": { label: "Natural Gas", glyph: "NG", primary: "#38bdf8", secondary: "#111827" },
  "RB=F": { label: "RBOB Gasoline", glyph: "RB", primary: "#f97316", secondary: "#111827", text: "#111" },
  "KC=F": { label: "Coffee", glyph: "KC", primary: "#7c2d12", secondary: "#facc15" },
  "CC=F": { label: "Cocoa", glyph: "CC", primary: "#5c2d12", secondary: "#d6a657" },
  IYR: { label: "iShares US Real Estate", glyph: "IY", primary: "#2563eb", secondary: "#111827" },
  REET: { label: "iShares Global REIT", glyph: "RT", primary: "#0f766e", secondary: "#111827" },
  WELL: { label: "Welltower", glyph: "WL", primary: "#14b8a6", secondary: "#111827" },
  PLD: { label: "Prologis", glyph: "PD", primary: "#0f172a", secondary: "#c8a45d" },
};

export const pass402PseudoPricePatch: Record<string, string> = {
  NOW: "$721.40", NET: "$83.70", PANW: "$331.80", CRWD: "$354.10", OKTA: "$92.20", TEAM: "$181.60", WDAY: "$253.40", ANET: "$94.80",
  AVGO: "$1,428", ASML: "€886", TSM: "$162.50", "NESN.SW": "CHF 96.20", "NOVO-B.CO": "DKK 884", "ULVR.L": "£42.70", "SHEL.L": "£28.30", "TTE.PA": "€62.20", "7203.T": "¥3,245", "8035.T": "¥34,800",
  "USD/CHF": "0.89", "EUR/CHF": "0.96", "NZD/USD": "0.61", "USD/THB": "36.4", "USD/PLN": "4.02", "EUR/PLN": "4.32",
  "NG=F": "$2.88", "RB=F": "$2.41", "KC=F": "$224", "CC=F": "$7,120", IYR: "$86.30", REET: "$23.80", WELL: "$103.60", PLD: "$119.20",
};

export function buildPass402MarketCoverageUniverse(): UniversalAssetRow[] {
  return [
    row({ id: "pass402-servicenow", rank: 1049, symbol: "NOW", name: "ServiceNow", assetClass: "stock", riskPressure: 39, sparkTone: "flat" }),
    row({ id: "pass402-cloudflare", rank: 1050, symbol: "NET", name: "Cloudflare", assetClass: "stock", riskPressure: 52, sparkTone: "watch" }),
    row({ id: "pass402-panw", rank: 1051, symbol: "PANW", name: "Palo Alto Networks", assetClass: "stock", riskPressure: 40, sparkTone: "flat" }),
    row({ id: "pass402-crowdstrike", rank: 1052, symbol: "CRWD", name: "CrowdStrike", assetClass: "stock", riskPressure: 47, sparkTone: "watch" }),
    row({ id: "pass402-okta", rank: 1053, symbol: "OKTA", name: "Okta", assetClass: "stock", riskPressure: 55, sparkTone: "watch" }),
    row({ id: "pass402-atlassian", rank: 1054, symbol: "TEAM", name: "Atlassian", assetClass: "stock", riskPressure: 45, sparkTone: "watch" }),
    row({ id: "pass402-workday", rank: 1055, symbol: "WDAY", name: "Workday", assetClass: "stock", riskPressure: 38, sparkTone: "flat" }),
    row({ id: "pass402-arista", rank: 1056, symbol: "ANET", name: "Arista Networks", assetClass: "stock", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass402-broadcom", rank: 1057, symbol: "AVGO", name: "Broadcom", assetClass: "stock", riskPressure: 32, sparkTone: "flat" }),
    row({ id: "pass402-asml", rank: 1058, symbol: "ASML", name: "ASML Holding", assetClass: "stock", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass402-tsmc", rank: 1059, symbol: "TSM", name: "Taiwan Semiconductor", assetClass: "stock", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass402-nestle", rank: 1060, symbol: "NESN.SW", name: "Nestle", assetClass: "stock", riskPressure: 26, sparkTone: "flat" }),
    row({ id: "pass402-novo", rank: 1061, symbol: "NOVO-B.CO", name: "Novo Nordisk", assetClass: "stock", riskPressure: 30, sparkTone: "flat" }),
    row({ id: "pass402-unilever", rank: 1062, symbol: "ULVR.L", name: "Unilever", assetClass: "stock", riskPressure: 27, sparkTone: "flat" }),
    row({ id: "pass402-shell", rank: 1063, symbol: "SHEL.L", name: "Shell", assetClass: "stock", riskPressure: 42, sparkTone: "watch" }),
    row({ id: "pass402-total", rank: 1064, symbol: "TTE.PA", name: "TotalEnergies", assetClass: "stock", riskPressure: 43, sparkTone: "watch" }),
    row({ id: "pass402-toyota", rank: 1065, symbol: "7203.T", name: "Toyota Motor", assetClass: "stock", riskPressure: 31, sparkTone: "flat" }),
    row({ id: "pass402-tokyo-electron", rank: 1066, symbol: "8035.T", name: "Tokyo Electron", assetClass: "stock", riskPressure: 37, sparkTone: "flat" }),
    row({ id: "pass402-usdchf", rank: 1067, symbol: "USD/CHF", name: "Dollar / Swiss Franc", assetClass: "fx", riskPressure: 28, sparkTone: "flat" }),
    row({ id: "pass402-eurchf", rank: 1068, symbol: "EUR/CHF", name: "Euro / Swiss Franc", assetClass: "fx", riskPressure: 29, sparkTone: "flat" }),
    row({ id: "pass402-nzdusd", rank: 1069, symbol: "NZD/USD", name: "New Zealand Dollar / Dollar", assetClass: "fx", riskPressure: 39, sparkTone: "flat" }),
    row({ id: "pass402-usdthb", rank: 1070, symbol: "USD/THB", name: "Dollar / Thai Baht", assetClass: "fx", riskPressure: 40, sparkTone: "watch" }),
    row({ id: "pass402-usdpln", rank: 1071, symbol: "USD/PLN", name: "Dollar / Polish Zloty", assetClass: "fx", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass402-eurpln", rank: 1072, symbol: "EUR/PLN", name: "Euro / Polish Zloty", assetClass: "fx", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass402-natural-gas", rank: 1073, symbol: "NG=F", name: "Natural Gas Futures", assetClass: "commodity", riskPressure: 61, sparkTone: "watch" }),
    row({ id: "pass402-gasoline", rank: 1074, symbol: "RB=F", name: "RBOB Gasoline Futures", assetClass: "commodity", riskPressure: 54, sparkTone: "watch" }),
    row({ id: "pass402-coffee", rank: 1075, symbol: "KC=F", name: "Coffee Futures", assetClass: "commodity", riskPressure: 58, sparkTone: "watch" }),
    row({ id: "pass402-cocoa", rank: 1076, symbol: "CC=F", name: "Cocoa Futures", assetClass: "commodity", riskPressure: 64, sparkTone: "watch" }),
    row({ id: "pass402-iyr", rank: 1077, symbol: "IYR", name: "iShares US Real Estate ETF", assetClass: "real_estate", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass402-reet", rank: 1078, symbol: "REET", name: "iShares Global REIT ETF", assetClass: "real_estate", riskPressure: 37, sparkTone: "flat" }),
    row({ id: "pass402-welltower", rank: 1079, symbol: "WELL", name: "Welltower", assetClass: "real_estate", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass402-prologis", rank: 1080, symbol: "PLD", name: "Prologis", assetClass: "real_estate", riskPressure: 33, sparkTone: "flat" }),
  ];
}

export const pass402SecurityOnePageCopy = [
  "Public Security stays simple: private keys never leave the user, signatures prove control and sensitive report details are redacted before export.",
  "Provider truth stays visible before AI tone: timestamp, cache age, fallback flag, reconnect state, logo authority and second-source drift are separated.",
  "Research Lab remains an audit and replication lane for prime/RNG/entropy work, not a public shortcut to break wallets or a final theorem claim.",
] as const;

export const pass402Supersedes = pass401TerminalExactnessMatrix.version;
void PASS401_RUNTIME_CLOSE_EVENT;
