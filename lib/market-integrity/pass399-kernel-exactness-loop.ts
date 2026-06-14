import type { UniversalAssetRow } from "./universal-asset-market-matrix";
import { buildPass398TerminalFidelityReadout, pass398TerminalFidelityContract, type Pass398AuditMode } from "./pass398-terminal-fidelity-loop";

export const PASS399_RUNTIME_CLOSE_EVENT = "velmere:runtime-close:search-pdf-modal";

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
    sourceRhythm: input.sourceRhythm ?? `${lane} provider heartbeat · session calendar · timestamp · cache age · reconnect state`,
    priceLane: input.priceLane ?? `${lane} Shield mirror candles · OHLCV-ready · 1H / 4H / 1D / 1W · no text wall`,
    volumeLane: input.volumeLane ?? `${lane} spread, volume and depth proxy stay separate from AI copy confidence`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${lane} issuer, venue, methodology, logo authority and disclosure passport before confidence`,
    secondSourceLane: input.secondSourceLane ?? "primary provider ↔ second source diff ↔ Browser preview ↔ downloaded PDF exact mirror",
    confidenceFloor: input.confidenceFloor ?? 83,
    adapterState: input.adapterState ?? "provider_required",
    humanCopy: input.humanCopy ?? `${input.symbol} uses PASS399 kernel exactness: same modal grammar as Shield, deterministic readout and shared PDF payload.`,
    nextAdapterStep: input.nextAdapterStep ?? "Attach live provider OHLCV, logo authority, market session calendar, cache age and second-source diff before live confidence is raised.",
    ...input,
  };
}

export type Pass399AuditMode = Pass398AuditMode;

export const pass399KernelExactnessContract = {
  version: "PASS399.kernel_exactness_loop",
  runtimeRule: "One close controller controls Browser, Shield, Shield Map and Real Markets before search, scroll, PDF forge, preview, download, modal open and tab switch.",
  marketRule: "Real Markets mirrors Shield: real logo fallback, candle chart, timeframe, Basic/Pro/Advanced, Orbit 360 VLM Brain and compact 10/14/20 fields.",
  pdfRule: "PDF preview and download must be generated from the same resolved payload and the same locale branch; there is no second random copy engine.",
  aiRule: "AI copy is deterministic, asset-specific and short: identity, chart, provider proof, source freshness, security boundary, research bridge and human field output.",
  brainRule: "VLM coin gathers source packets into a blue neural brain, then morphs into a clean field panel; old card walls and debug pass history remain hidden.",
  securityRule: "Public Security page explains private key boundary, signature proof, entropy quality and redacted reports without exposing internal safeguards.",
} as const;

export const pass399KernelTimeline = [
  { id: "close", label: "runtime close", seconds: 0.12, copy: "All floating search portals are closed before modal/PDF actions." },
  { id: "identity", label: "identity lock", seconds: 0.42, copy: "Symbol, name, route, logo and locale lock into one object." },
  { id: "chart", label: "Shield candles", seconds: 0.84, copy: "Real Stocks receives the same visual grammar as Shield." },
  { id: "provider", label: "provider proof", seconds: 1.26, copy: "Freshness, cache age, fallback flag and second-source lane are visible." },
  { id: "orbit", label: "Orbit 360 brain", seconds: 1.74, copy: "VLM coin sends blue neural packets into a stable brain shell." },
  { id: "security", label: "security bridge", seconds: 2.18, copy: "Key boundary, signature proof and redaction remain separated." },
  { id: "research", label: "Research Lab", seconds: 2.64, copy: "Prime/RNG work stays framed as bounded audit and replication." },
  { id: "morph", label: "field morph", seconds: 3.18, copy: "The brain turns into Basic 10, Pro 14 or Advanced 20 fields." },
  { id: "pdf", label: "exact PDF mirror", seconds: 3.66, copy: "Preview/download keep identical locale and section order." },
] as const;

const localeLine: Record<"pl" | "en" | "de", string> = {
  pl: "Podgląd, pobranie PDF i terminal używają tego samego obiektu: mniej losowości, mniej powtórzeń, więcej konkretu.",
  en: "Preview, PDF download and terminal use the same object: less randomness, less repetition, more signal.",
  de: "Vorschau, PDF-Download und Terminal nutzen dasselbe Objekt: weniger Zufall, weniger Wiederholung, mehr Signal.",
};

export function buildPass399KernelExactnessReadout(input: {
  symbol: string;
  name: string;
  type: string;
  risk: number;
  source: string;
  mode: Pass399AuditMode;
  locale?: "pl" | "en" | "de";
}) {
  const base = buildPass398TerminalFidelityReadout(input);
  const count = input.mode === "advanced" ? 20 : input.mode === "pro" ? 14 : 10;
  const locale = input.locale ?? "en";
  return {
    version: pass399KernelExactnessContract.version,
    count,
    seconds: Math.max(base.seconds, 3.66) + 0.24,
    headline: `${input.symbol} · kernel exactness terminal`,
    body: `${input.mode.toUpperCase()} locks search, chart, provider proof, security and Research Lab before the final ${count} fields appear. ${localeLine[locale]}`,
    fields: base.fields.slice(0, count).map((field, index) => ({
      ...field,
      value: index === 0 ? `${input.symbol} · one payload` : field.value,
      copy: index === 0 ? `${input.name}: ${pass399KernelExactnessContract.pdfRule}` : field.copy,
    })),
  };
}

export const pass399AssetVisualPatch: Record<string, VisualPatch> = {
  AVGO: { label: "Broadcom", glyph: "BG", primary: "#cc092f", secondary: "#111827" },
  AMD: { label: "AMD", glyph: "AM", primary: "#111827", secondary: "#ed1c24" },
  MU: { label: "Micron", glyph: "MU", primary: "#2b5c9e", secondary: "#f8fafc", text: "#111" },
  ARM: { label: "Arm Holdings", glyph: "AR", primary: "#00a2e0", secondary: "#111827" },
  PLTR: { label: "Palantir", glyph: "PL", primary: "#111827", secondary: "#e5e7eb" },
  ANET: { label: "Arista", glyph: "AN", primary: "#0055a4", secondary: "#f8fafc", text: "#111" },
  GOOGL: { label: "Alphabet", glyph: "G", primary: "#4285f4", secondary: "#fbbc05", text: "#111" },
  META: { label: "Meta", glyph: "ME", primary: "#0866ff", secondary: "#111827" },
  SAP: { label: "SAP", glyph: "SAP", primary: "#0f6ab4", secondary: "#f8fafc", text: "#111" },
  ASML: { label: "ASML", glyph: "AS", primary: "#0a2f73", secondary: "#ff6a00" },
  TSM: { label: "TSMC", glyph: "TS", primary: "#b91c1c", secondary: "#111827" },
  BABA: { label: "Alibaba", glyph: "BA", primary: "#ff6a00", secondary: "#111827" },
  TCEHY: { label: "Tencent", glyph: "TC", primary: "#0052d9", secondary: "#f8fafc", text: "#111" },
  PDD: { label: "PDD", glyph: "PD", primary: "#e02b20", secondary: "#111827" },
  "USD/NOK": { label: "Dollar / Norwegian Krone", glyph: "NO", primary: "#0f8d61", secondary: "#ba0c2f" },
  "EUR/NOK": { label: "Euro / Norwegian Krone", glyph: "EN", primary: "#225eea", secondary: "#ba0c2f" },
  "USD/SEK": { label: "Dollar / Swedish Krona", glyph: "SE", primary: "#0f8d61", secondary: "#006aa7" },
  "EUR/SEK": { label: "Euro / Swedish Krona", glyph: "ES", primary: "#225eea", secondary: "#006aa7" },
  "USD/DKK": { label: "Dollar / Danish Krone", glyph: "DK", primary: "#0f8d61", secondary: "#c60c30" },
  "EUR/DKK": { label: "Euro / Danish Krone", glyph: "ED", primary: "#225eea", secondary: "#c60c30" },
  "NG=F": { label: "Natural Gas", glyph: "NG", primary: "#38bdf8", secondary: "#0f172a" },
  "HG=F": { label: "Copper", glyph: "CU", primary: "#b87333", secondary: "#111827" },
  "RB=F": { label: "Gasoline", glyph: "RB", primary: "#0f766e", secondary: "#facc15", text: "#111" },
  VNQ: { label: "Vanguard Real Estate", glyph: "VN", primary: "#8b5e34", secondary: "#111827" },
  XLRE: { label: "Real Estate Select", glyph: "XR", primary: "#a98256", secondary: "#251709" },
  SCHH: { label: "Schwab REIT", glyph: "SH", primary: "#0f5ea8", secondary: "#f8fafc", text: "#111" },
};

export const pass399PseudoPricePatch: Record<string, string> = {
  AVGO: "$1,412.00", AMD: "$158.40", MU: "$124.20", ARM: "$118.80", PLTR: "$27.60", ANET: "$302.10", GOOGL: "$176.20", META: "$492.40", SAP: "$196.00", ASML: "$942.00", TSM: "$169.70", BABA: "$78.20", TCEHY: "$45.40", PDD: "$132.80", "USD/NOK": "10.62", "EUR/NOK": "11.48", "USD/SEK": "10.44", "EUR/SEK": "11.29", "USD/DKK": "6.88", "EUR/DKK": "7.46", "NG=F": "2.78", "HG=F": "4.56", "RB=F": "2.42", VNQ: "$84.30", XLRE: "$39.20", SCHH: "$20.10",
};

export function buildPass399MarketCoverageUniverse(): UniversalAssetRow[] {
  return [
    row({ id: "pass399-broadcom", rank: 962, symbol: "AVGO", name: "Broadcom", assetClass: "stock", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass399-amd", rank: 963, symbol: "AMD", name: "Advanced Micro Devices", assetClass: "stock", riskPressure: 42, sparkTone: "watch" }),
    row({ id: "pass399-micron", rank: 964, symbol: "MU", name: "Micron Technology", assetClass: "stock", riskPressure: 46, sparkTone: "watch" }),
    row({ id: "pass399-arm", rank: 965, symbol: "ARM", name: "Arm Holdings", assetClass: "stock", riskPressure: 45, sparkTone: "watch" }),
    row({ id: "pass399-palantir", rank: 966, symbol: "PLTR", name: "Palantir", assetClass: "stock", riskPressure: 49, sparkTone: "watch" }),
    row({ id: "pass399-arista", rank: 967, symbol: "ANET", name: "Arista Networks", assetClass: "stock", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass399-alphabet", rank: 968, symbol: "GOOGL", name: "Alphabet", assetClass: "stock", riskPressure: 31, sparkTone: "flat" }),
    row({ id: "pass399-meta", rank: 969, symbol: "META", name: "Meta Platforms", assetClass: "stock", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass399-sap", rank: 970, symbol: "SAP", name: "SAP", assetClass: "stock", riskPressure: 30, sparkTone: "flat" }),
    row({ id: "pass399-asml", rank: 971, symbol: "ASML", name: "ASML", assetClass: "stock", riskPressure: 33, sparkTone: "flat" }),
    row({ id: "pass399-tsmc", rank: 972, symbol: "TSM", name: "Taiwan Semiconductor", assetClass: "stock", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass399-alibaba", rank: 973, symbol: "BABA", name: "Alibaba", assetClass: "stock", riskPressure: 52, sparkTone: "watch" }),
    row({ id: "pass399-tencent", rank: 974, symbol: "TCEHY", name: "Tencent", assetClass: "stock", riskPressure: 49, sparkTone: "watch" }),
    row({ id: "pass399-pdd", rank: 975, symbol: "PDD", name: "PDD Holdings", assetClass: "stock", riskPressure: 51, sparkTone: "watch" }),
    row({ id: "pass399-usdnok", rank: 976, symbol: "USD/NOK", name: "Dollar / Norwegian Krone", assetClass: "fx", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass399-eurnok", rank: 977, symbol: "EUR/NOK", name: "Euro / Norwegian Krone", assetClass: "fx", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass399-usdsek", rank: 978, symbol: "USD/SEK", name: "Dollar / Swedish Krona", assetClass: "fx", riskPressure: 33, sparkTone: "flat" }),
    row({ id: "pass399-eursek", rank: 979, symbol: "EUR/SEK", name: "Euro / Swedish Krona", assetClass: "fx", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass399-usddkk", rank: 980, symbol: "USD/DKK", name: "Dollar / Danish Krone", assetClass: "fx", riskPressure: 25, sparkTone: "flat" }),
    row({ id: "pass399-eurdkk", rank: 981, symbol: "EUR/DKK", name: "Euro / Danish Krone", assetClass: "fx", riskPressure: 24, sparkTone: "flat" }),
    row({ id: "pass399-naturalgas", rank: 982, symbol: "NG=F", name: "Natural Gas Futures", assetClass: "commodity", riskPressure: 58, sparkTone: "watch" }),
    row({ id: "pass399-copper", rank: 983, symbol: "HG=F", name: "Copper Futures", assetClass: "commodity", riskPressure: 44, sparkTone: "watch" }),
    row({ id: "pass399-gasoline", rank: 984, symbol: "RB=F", name: "Gasoline Futures", assetClass: "commodity", riskPressure: 55, sparkTone: "watch" }),
    row({ id: "pass399-vnq", rank: 985, symbol: "VNQ", name: "Vanguard Real Estate ETF", assetClass: "real_estate", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass399-xlre", rank: 986, symbol: "XLRE", name: "Real Estate Select Sector SPDR", assetClass: "real_estate", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass399-schh", rank: 987, symbol: "SCHH", name: "Schwab U.S. REIT ETF", assetClass: "real_estate", riskPressure: 36, sparkTone: "flat" }),
  ];
}

export const pass399SecurityOnePageCopy = [
  "Private key boundary: Velmere can verify signatures and redacted evidence without asking the user to expose private keys.",
  "Provider truth: public confidence waits for timestamp, cache age, fallback flag, second-source diff and session context.",
  "Research Lab boundary: prime/RNG work is published as bounded audit, replication and falsification, not as an unverified miracle claim.",
] as const;
