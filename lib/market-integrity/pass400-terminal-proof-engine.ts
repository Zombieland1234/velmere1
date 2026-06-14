import type { UniversalAssetRow } from "./universal-asset-market-matrix";
import {
  PASS399_RUNTIME_CLOSE_EVENT,
  buildPass399KernelExactnessReadout,
  pass399KernelExactnessContract,
  type Pass399AuditMode,
} from "./pass399-kernel-exactness-loop";

export const PASS400_RUNTIME_CLOSE_EVENT = PASS399_RUNTIME_CLOSE_EVENT;

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
    sourceRhythm: input.sourceRhythm ?? `${lane} provider heartbeat · market session · reconnect state · cache age · second-source diff`,
    priceLane: input.priceLane ?? `${lane} Shield mirror candles · OHLCV-ready · timeframe parity · no debug text wall`,
    volumeLane: input.volumeLane ?? `${lane} liquidity, volume and spread proxy are separated from AI tone`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${lane} issuer/venue/methodology/logomark proof is shown before confidence`,
    secondSourceLane: input.secondSourceLane ?? "primary provider ↔ second source ↔ Browser preview ↔ PDF download exact mirror",
    confidenceFloor: input.confidenceFloor ?? 84,
    adapterState: input.adapterState ?? "provider_required",
    humanCopy: input.humanCopy ?? `${input.symbol} runs through PASS400 terminal proof: same Shield modal grammar, deterministic copy and exact PDF payload.`,
    nextAdapterStep: input.nextAdapterStep ?? "Attach live OHLCV provider, logo authority, market calendar, cache-age badge and second-source diff before live confidence is raised.",
    ...input,
  };
}

export type Pass400AuditMode = Pass399AuditMode;

export const pass400TerminalProofContract = {
  version: "PASS400.terminal_proof_engine",
  runtimeRule: "Browser, Shield, Shield Map and Real Markets share one close event before every PDF, modal, tab, scroll and search action.",
  marketRule: "Real Markets stays Shield-like: logo, candles, timeframe, Basic/Pro/Advanced, Orbit 360 VLM Brain and concise field readout.",
  pdfRule: "Preview and downloaded PDF use one exact resolved payload, one locale branch and one section order; no random second copy engine.",
  brainRule: "The VLM coin gathers source packets into a blue neural brain, then morphs into Basic 10, Pro 14 or Advanced 20 fields.",
  copyRule: "AI text is short, asset-specific and reusable across Browser, Shield and Real Markets: identity, chart, provider proof, security bridge and Research Lab boundary.",
  launchRule: "Premium status is proof-first: freshness, traceability and signature boundaries replace fake hype and hidden debug pass walls.",
} as const;

export const pass400BrainTimeline = [
  { id: "close", label: "global close", seconds: 0.10, copy: "Search portals close before PDF forge, download, modal open, tab switch and scroll." },
  { id: "identity", label: "identity seal", seconds: 0.32, copy: "Symbol, name, route, locale and logo lock into one resolved object." },
  { id: "chart", label: "Shield chart", seconds: 0.72, copy: "Real Stocks uses the same candle/timeframe grammar as Shield." },
  { id: "provider", label: "provider proof", seconds: 1.08, copy: "Timestamp, cache age, fallback flag and second-source status stay visible." },
  { id: "orbit", label: "Orbit 360", seconds: 1.54, copy: "Blue packets travel into a stable VLM neural shell." },
  { id: "security", label: "security bridge", seconds: 2.02, copy: "Private key boundary, signature proof and redaction remain separated." },
  { id: "research", label: "research lab", seconds: 2.54, copy: "Prime/RNG work is framed as audit, replication and falsification." },
  { id: "morph", label: "brain morph", seconds: 3.10, copy: "The brain transforms into 10, 14 or 20 readable fields." },
  { id: "pdf", label: "PDF exactness", seconds: 3.72, copy: "Preview and download keep identical locale and section order." },
  { id: "operator", label: "operator next", seconds: 4.12, copy: "The next action is one concrete provider/security step, not noisy filler." },
] as const;

const localeLine: Record<"pl" | "en" | "de", string> = {
  pl: "Ten sam payload zasila terminal, podgląd i pobrany PDF: bez losowego tekstu, bez powtórek, bez debugowych ścian.",
  en: "The same payload powers terminal, preview and PDF download: no random copy, no repetition, no debug wall.",
  de: "Dasselbe Payload speist Terminal, Vorschau und PDF-Download: kein Zufallstext, keine Wiederholungen, keine Debug-Wand.",
};

export function buildPass400TerminalProofReadout(input: {
  symbol: string;
  name: string;
  type: string;
  risk: number;
  source: string;
  mode: Pass400AuditMode;
  locale?: "pl" | "en" | "de";
}) {
  const base = buildPass399KernelExactnessReadout(input);
  const count = input.mode === "advanced" ? 20 : input.mode === "pro" ? 14 : 10;
  const locale = input.locale ?? "en";
  return {
    version: pass400TerminalProofContract.version,
    count,
    seconds: Math.max(base.seconds, 4.12) + 0.18,
    headline: `${input.symbol} · terminal proof engine`,
    body: `${input.mode.toUpperCase()} locks search, Shield candles, provider proof, Orbit 360, security and PDF exactness before the ${count} fields appear. ${localeLine[locale]}`,
    fields: base.fields.slice(0, count).map((field, index) => ({
      ...field,
      value: index === 0 ? `${input.symbol} · exact payload` : index === 1 ? `${input.source} · freshness required` : field.value,
      copy: index === 0 ? `${input.name}: ${pass400TerminalProofContract.pdfRule}` : index === 1 ? pass400TerminalProofContract.runtimeRule : field.copy,
    })),
  };
}

export const pass400AssetVisualPatch: Record<string, VisualPatch> = {
  ORCL: { label: "Oracle", glyph: "OR", primary: "#c74634", secondary: "#111827" },
  CRM: { label: "Salesforce", glyph: "SF", primary: "#00a1e0", secondary: "#111827" },
  NOW: { label: "ServiceNow", glyph: "NW", primary: "#62d84e", secondary: "#111827", text: "#111" },
  PANW: { label: "Palo Alto", glyph: "PA", primary: "#fa582d", secondary: "#111827" },
  CRWD: { label: "CrowdStrike", glyph: "CS", primary: "#e11d48", secondary: "#111827" },
  NET: { label: "Cloudflare", glyph: "CF", primary: "#f38020", secondary: "#111827" },
  TEAM: { label: "Atlassian", glyph: "AT", primary: "#0052cc", secondary: "#f8fafc", text: "#111" },
  SHOP: { label: "Shopify", glyph: "SH", primary: "#95bf47", secondary: "#111827", text: "#111" },
  UBER: { label: "Uber", glyph: "UB", primary: "#111827", secondary: "#f8fafc" },
  ABNB: { label: "Airbnb", glyph: "AB", primary: "#ff385c", secondary: "#111827" },
  SPOT: { label: "Spotify", glyph: "SP", primary: "#1db954", secondary: "#111827", text: "#111" },
  RACE: { label: "Ferrari", glyph: "FR", primary: "#dc0000", secondary: "#facc15", text: "#111" },
  "BRK.B": { label: "Berkshire Hathaway", glyph: "BH", primary: "#1e3a8a", secondary: "#e5e7eb" },
  "NESN.SW": { label: "Nestle", glyph: "NE", primary: "#7c4a2d", secondary: "#f8fafc", text: "#111" },
  "NOVO-B.CO": { label: "Novo Nordisk", glyph: "NN", primary: "#0055a4", secondary: "#f8fafc", text: "#111" },
  "7203.T": { label: "Toyota", glyph: "TY", primary: "#eb0a1e", secondary: "#111827" },
  "9984.T": { label: "SoftBank", glyph: "SB", primary: "#111827", secondary: "#e5e7eb" },
  "USD/INR": { label: "Dollar / Indian Rupee", glyph: "IN", primary: "#ff9933", secondary: "#138808", text: "#111" },
  "EUR/INR": { label: "Euro / Indian Rupee", glyph: "EI", primary: "#225eea", secondary: "#ff9933", text: "#111" },
  "USD/BRL": { label: "Dollar / Brazilian Real", glyph: "BR", primary: "#009b3a", secondary: "#ffdf00", text: "#111" },
  "EUR/BRL": { label: "Euro / Brazilian Real", glyph: "EB", primary: "#225eea", secondary: "#009b3a" },
  "USD/KRW": { label: "Dollar / Korean Won", glyph: "KR", primary: "#0f8d61", secondary: "#c60c30" },
  "EUR/KRW": { label: "Euro / Korean Won", glyph: "EK", primary: "#225eea", secondary: "#c60c30" },
  "LBS=F": { label: "Lumber", glyph: "LB", primary: "#8b5e34", secondary: "#111827" },
  "CC=F": { label: "Cocoa", glyph: "CO", primary: "#6b3f22", secondary: "#f8fafc" },
  "SB=F": { label: "Sugar", glyph: "SU", primary: "#f8fafc", secondary: "#111827", text: "#111" },
  IYR: { label: "iShares U.S. Real Estate", glyph: "IY", primary: "#2b5c9e", secondary: "#111827" },
  REM: { label: "iShares Mortgage Real Estate", glyph: "RE", primary: "#475569", secondary: "#f8fafc" },
};

export const pass400PseudoPricePatch: Record<string, string> = {
  ORCL: "$118.20", CRM: "$262.40", NOW: "$748.10", PANW: "$312.60", CRWD: "$356.30", NET: "$86.70", TEAM: "$171.40", SHOP: "$72.80", UBER: "$71.20", ABNB: "$146.10", SPOT: "$298.50", RACE: "$421.00", "BRK.B": "$413.20", "NESN.SW": "CHF 94.10", "NOVO-B.CO": "DKK 884.20", "7203.T": "JPY 3,312", "9984.T": "JPY 8,920", "USD/INR": "83.45", "EUR/INR": "90.22", "USD/BRL": "5.07", "EUR/BRL": "5.48", "USD/KRW": "1,372", "EUR/KRW": "1,484", "LBS=F": "585.40", "CC=F": "7,960", "SB=F": "19.20", IYR: "$87.40", REM: "$23.10",
};

export function buildPass400MarketCoverageUniverse(): UniversalAssetRow[] {
  return [
    row({ id: "pass400-oracle", rank: 988, symbol: "ORCL", name: "Oracle", assetClass: "stock", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass400-salesforce", rank: 989, symbol: "CRM", name: "Salesforce", assetClass: "stock", riskPressure: 37, sparkTone: "flat" }),
    row({ id: "pass400-servicenow", rank: 990, symbol: "NOW", name: "ServiceNow", assetClass: "stock", riskPressure: 40, sparkTone: "watch" }),
    row({ id: "pass400-paloalto", rank: 991, symbol: "PANW", name: "Palo Alto Networks", assetClass: "stock", riskPressure: 42, sparkTone: "watch" }),
    row({ id: "pass400-crowdstrike", rank: 992, symbol: "CRWD", name: "CrowdStrike", assetClass: "stock", riskPressure: 48, sparkTone: "watch" }),
    row({ id: "pass400-cloudflare", rank: 993, symbol: "NET", name: "Cloudflare", assetClass: "stock", riskPressure: 47, sparkTone: "watch" }),
    row({ id: "pass400-atlassian", rank: 994, symbol: "TEAM", name: "Atlassian", assetClass: "stock", riskPressure: 42, sparkTone: "flat" }),
    row({ id: "pass400-shopify", rank: 995, symbol: "SHOP", name: "Shopify", assetClass: "stock", riskPressure: 44, sparkTone: "watch" }),
    row({ id: "pass400-uber", rank: 996, symbol: "UBER", name: "Uber", assetClass: "stock", riskPressure: 39, sparkTone: "flat" }),
    row({ id: "pass400-airbnb", rank: 997, symbol: "ABNB", name: "Airbnb", assetClass: "stock", riskPressure: 41, sparkTone: "flat" }),
    row({ id: "pass400-spotify", rank: 998, symbol: "SPOT", name: "Spotify", assetClass: "stock", riskPressure: 39, sparkTone: "flat" }),
    row({ id: "pass400-ferrari", rank: 999, symbol: "RACE", name: "Ferrari", assetClass: "stock", riskPressure: 32, sparkTone: "flat" }),
    row({ id: "pass400-berkshire", rank: 1000, symbol: "BRK.B", name: "Berkshire Hathaway", assetClass: "stock", riskPressure: 22, sparkTone: "flat" }),
    row({ id: "pass400-nestle", rank: 1001, symbol: "NESN.SW", name: "Nestle", assetClass: "stock", riskPressure: 24, sparkTone: "flat" }),
    row({ id: "pass400-novo", rank: 1002, symbol: "NOVO-B.CO", name: "Novo Nordisk", assetClass: "stock", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass400-toyota", rank: 1003, symbol: "7203.T", name: "Toyota", assetClass: "stock", riskPressure: 30, sparkTone: "flat" }),
    row({ id: "pass400-softbank", rank: 1004, symbol: "9984.T", name: "SoftBank Group", assetClass: "stock", riskPressure: 48, sparkTone: "watch" }),
    row({ id: "pass400-usdinr", rank: 1005, symbol: "USD/INR", name: "Dollar / Indian Rupee", assetClass: "fx", riskPressure: 32, sparkTone: "flat" }),
    row({ id: "pass400-eurinr", rank: 1006, symbol: "EUR/INR", name: "Euro / Indian Rupee", assetClass: "fx", riskPressure: 31, sparkTone: "flat" }),
    row({ id: "pass400-usdbrl", rank: 1007, symbol: "USD/BRL", name: "Dollar / Brazilian Real", assetClass: "fx", riskPressure: 46, sparkTone: "watch" }),
    row({ id: "pass400-eurbrl", rank: 1008, symbol: "EUR/BRL", name: "Euro / Brazilian Real", assetClass: "fx", riskPressure: 45, sparkTone: "watch" }),
    row({ id: "pass400-usdkrw", rank: 1009, symbol: "USD/KRW", name: "Dollar / Korean Won", assetClass: "fx", riskPressure: 37, sparkTone: "flat" }),
    row({ id: "pass400-eurkrw", rank: 1010, symbol: "EUR/KRW", name: "Euro / Korean Won", assetClass: "fx", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass400-lumber", rank: 1011, symbol: "LBS=F", name: "Lumber Futures", assetClass: "commodity", riskPressure: 55, sparkTone: "watch" }),
    row({ id: "pass400-cocoa", rank: 1012, symbol: "CC=F", name: "Cocoa Futures", assetClass: "commodity", riskPressure: 59, sparkTone: "watch" }),
    row({ id: "pass400-sugar", rank: 1013, symbol: "SB=F", name: "Sugar Futures", assetClass: "commodity", riskPressure: 48, sparkTone: "watch" }),
    row({ id: "pass400-iyr", rank: 1014, symbol: "IYR", name: "iShares U.S. Real Estate ETF", assetClass: "real_estate", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass400-rem", rank: 1015, symbol: "REM", name: "iShares Mortgage Real Estate ETF", assetClass: "real_estate", riskPressure: 42, sparkTone: "watch" }),
  ];
}

export const pass400SecurityOnePageCopy = [
  "Public Security explains boundaries, not secret internals: private keys never leave the user, signatures prove control and reports redact sensitive payloads.",
  "Provider truth is visible: timestamp, cache age, fallback flag, logo authority and second source are separated before any confidence claim.",
  "Research Lab stays honest: prime/RNG work is presented as numerical audit, replication and falsification rather than a public formal proof claim.",
] as const;
