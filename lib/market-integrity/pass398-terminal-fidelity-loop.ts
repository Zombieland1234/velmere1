import type { UniversalAssetRow } from "./universal-asset-market-matrix";
import { buildPass397UnifiedTerminalReadout, pass397UnifiedTerminalContract, type Pass397AuditMode } from "./pass397-unified-search-pdf-brain";

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
    sourceRhythm: input.sourceRhythm ?? `${lane} provider lane · quote timestamp · session calendar · cache age · fallback flag`,
    priceLane: input.priceLane ?? `${lane} Shield-grade candle lane · same modal grammar as crypto · 1H / 4H / 1D / 1W`,
    volumeLane: input.volumeLane ?? `${lane} volume, spread and market-session lane separated from narrative confidence`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${lane} issuer / methodology / venue passport before public confidence`,
    secondSourceLane: input.secondSourceLane ?? "primary provider ↔ second source diff ↔ Browser PDF mirror",
    confidenceFloor: input.confidenceFloor ?? 82,
    adapterState: input.adapterState ?? "provider_required",
    humanCopy: input.humanCopy ?? `${input.symbol} uses PASS398 terminal fidelity: one search close loop, one Shield-grade chart modal, one Orbit 360 brain and one exact PDF payload.`,
    nextAdapterStep: input.nextAdapterStep ?? "Attach live OHLCV provider, logo authority, provider timestamp, cache age and second-source diff before live confidence is raised.",
    ...input,
  };
}

export type Pass398AuditMode = Pass397AuditMode;

export const pass398TerminalFidelityContract = {
  version: "PASS398.terminal_fidelity_loop",
  searchRule: "Browser, Shield, Shield Map and Real Markets emit one close loop before PDF generation, download, modal open, row click, tab switch and scroll-anchor loss.",
  marketRule: "Real Markets must behave like Shield: logo, clean row, advanced candles, timeframe switch, Basic/Pro/Advanced, Orbit 360 brain and compact field readout.",
  pdfRule: "Preview and downloaded PDF must use one exact resolved payload per locale; Polish page gives Polish PDF, English page gives English PDF, German page gives German PDF.",
  brainRule: "VLM coin gathers identity, OHLCV, depth proxy, provider proof, security boundary and research lane, then morphs into 10 / 14 / 20 concise fields.",
  copyRule: "AI copy should be deterministic, asset-specific and short: no repeated filler, no debug pass dump, no random hype and no hidden trade command.",
} as const;

export const pass398BrainTimeline = [
  { id: "close", label: "search close loop", seconds: 0.18, copy: "Stale suggestions close before any modal or PDF action." },
  { id: "identity", label: "identity seal", seconds: 0.54, copy: "Symbol, name, logo, route and locale lock once." },
  { id: "chart", label: "Shield chart mirror", seconds: 0.96, copy: "Real Markets receives the same candle grammar as Shield." },
  { id: "provider", label: "provider proof", seconds: 1.42, copy: "Timestamp, cache age, fallback and second source remain visible." },
  { id: "orbit", label: "Orbit 360 brain", seconds: 2.04, copy: "The VLM coin pushes blue neural lanes into a stable brain shell." },
  { id: "security", label: "security boundary", seconds: 2.68, copy: "Keys, signatures, entropy and redaction stay separated." },
  { id: "research", label: "Research Lab bridge", seconds: 3.16, copy: "Prime/RNG work is framed as audit, falsification and replication." },
  { id: "fields", label: "field morph", seconds: 3.74, copy: "The brain morphs into Basic 10, Pro 14 or Advanced 20 fields." },
  { id: "pdf", label: "PDF exact mirror", seconds: 4.26, copy: "Preview and download keep the same payload and language." },
] as const;

export function buildPass398TerminalFidelityReadout(input: {
  symbol: string;
  name: string;
  type: string;
  risk: number;
  source: string;
  mode: Pass398AuditMode;
  locale?: "pl" | "en" | "de";
}) {
  const base = buildPass397UnifiedTerminalReadout(input);
  const count = input.mode === "advanced" ? 20 : input.mode === "pro" ? 14 : 10;
  const locale = input.locale ?? "en";
  const languageLine = locale === "pl"
    ? "Ten sam obiekt zasila podgląd, pobranie PDF i modal, więc znika losowość oraz powtarzalny filler."
    : locale === "de"
      ? "Dasselbe Objekt speist Vorschau, PDF-Download und Modal, damit Zufallstext und Wiederholungen verschwinden."
      : "The same object powers preview, PDF download and modal, removing random copy and repeated filler.";
  return {
    version: pass398TerminalFidelityContract.version,
    count,
    seconds: base.seconds + 0.28,
    headline: `${input.symbol} · Shield-grade terminal fidelity`,
    body: `${input.mode.toUpperCase()} locks identity, chart, provider proof, security and Research Lab bridge before ${count} fields appear. ${languageLine}`,
    fields: base.fields.slice(0, count).map((field, index) => ({
      ...field,
      value: index === 0 ? `${input.symbol} · exact payload` : field.value,
      copy: index === 0 ? `${input.name}: ${pass398TerminalFidelityContract.pdfRule}` : field.copy,
    })),
  };
}

export const pass398AssetVisualPatch: Record<string, VisualPatch> = {
  V: { label: "Visa", glyph: "V", primary: "#1434cb", secondary: "#f7b600", text: "#111" },
  MA: { label: "Mastercard", glyph: "MC", primary: "#eb001b", secondary: "#f79e1b", text: "#111" },
  AXP: { label: "American Express", glyph: "AX", primary: "#2e77bc", secondary: "#e8f2ff", text: "#111" },
  PYPL: { label: "PayPal", glyph: "PP", primary: "#003087", secondary: "#009cde" },
  SHOP: { label: "Shopify", glyph: "SH", primary: "#95bf47", secondary: "#0b2d12", text: "#111" },
  SQ: { label: "Block", glyph: "SQ", primary: "#111827", secondary: "#e5e7eb" },
  SNOW: { label: "Snowflake", glyph: "SF", primary: "#29b5e8", secondary: "#052d3f" },
  DDOG: { label: "Datadog", glyph: "DD", primary: "#632ca6", secondary: "#f8fafc" },
  CRWD: { label: "CrowdStrike", glyph: "CS", primary: "#e01f27", secondary: "#111827" },
  NET: { label: "Cloudflare", glyph: "CF", primary: "#f38020", secondary: "#111827" },
  PANW: { label: "Palo Alto Networks", glyph: "PA", primary: "#fa582d", secondary: "#111827" },
  FTNT: { label: "Fortinet", glyph: "FT", primary: "#ee3124", secondary: "#111827" },
  TEAM: { label: "Atlassian", glyph: "AT", primary: "#0052cc", secondary: "#e8f1ff", text: "#111" },
  NOW: { label: "ServiceNow", glyph: "SN", primary: "#81b5a1", secondary: "#111827" },
  INTU: { label: "Intuit", glyph: "IN", primary: "#365ebf", secondary: "#f8fafc", text: "#111" },
  UBER: { label: "Uber", glyph: "UB", primary: "#111827", secondary: "#f8fafc" },
  ABNB: { label: "Airbnb", glyph: "AB", primary: "#ff385c", secondary: "#111827" },
  BKNG: { label: "Booking", glyph: "BK", primary: "#003580", secondary: "#feba02", text: "#111" },
  "AIR.PA": { label: "Airbus", glyph: "AI", primary: "#00205b", secondary: "#6ea8ff" },
  "OR.PA": { label: "L'Oreal", glyph: "LO", primary: "#111827", secondary: "#d6b263" },
  "MC.PA": { label: "LVMH", glyph: "LV", primary: "#111827", secondary: "#c8a96a" },
  "RI.PA": { label: "Pernod Ricard", glyph: "PR", primary: "#154734", secondary: "#d6b263" },
  "KER.PA": { label: "Kering", glyph: "KG", primary: "#111827", secondary: "#f8fafc" },
  "RMS.PA": { label: "Hermes", glyph: "HE", primary: "#f37021", secondary: "#111827" },
  "USD/SGD": { label: "Dollar / Singapore Dollar", glyph: "SG", primary: "#0f8d61", secondary: "#ef3340" },
  "EUR/SGD": { label: "Euro / Singapore Dollar", glyph: "EG", primary: "#225eea", secondary: "#ef3340" },
  "USD/HKD": { label: "Dollar / Hong Kong Dollar", glyph: "HK", primary: "#0f8d61", secondary: "#de2910" },
  "EUR/HKD": { label: "Euro / Hong Kong Dollar", glyph: "EH", primary: "#225eea", secondary: "#de2910" },
  "ZC=F": { label: "Corn", glyph: "CR", primary: "#facc15", secondary: "#3f2d05", text: "#111" },
  "ZS=F": { label: "Soybeans", glyph: "SB", primary: "#84cc16", secondary: "#1a2e05", text: "#111" },
  "ZW=F": { label: "Wheat", glyph: "WH", primary: "#d6b263", secondary: "#111827" },
  IYR: { label: "US Real Estate ETF", glyph: "YR", primary: "#a98256", secondary: "#251709" },
};

export const pass398PseudoPricePatch: Record<string, string> = {
  V: "$284.10", MA: "$456.20", AXP: "$236.40", PYPL: "$64.80", SHOP: "$72.50", SQ: "$75.20", SNOW: "$132.40", DDOG: "$118.10", CRWD: "$314.60", NET: "$91.80", PANW: "$318.00", FTNT: "$72.10", TEAM: "$172.60", NOW: "$746.30", INTU: "$621.40", UBER: "$68.70", ABNB: "$147.90", BKNG: "$3,825.00", "AIR.PA": "€154.40", "OR.PA": "€421.00", "MC.PA": "€734.00", "RI.PA": "€128.00", "KER.PA": "€286.00", "RMS.PA": "€2,085.00", "USD/SGD": "1.35", "EUR/SGD": "1.46", "USD/HKD": "7.81", "EUR/HKD": "8.46", "ZC=F": "462.00", "ZS=F": "1,150.00", "ZW=F": "610.00", IYR: "$89.10",
};

export function buildPass398MarketCoverageUniverse(): UniversalAssetRow[] {
  return [
    row({ id: "pass398-visa", rank: 930, symbol: "V", name: "Visa", assetClass: "stock", riskPressure: 27, sparkTone: "flat" }),
    row({ id: "pass398-mastercard", rank: 931, symbol: "MA", name: "Mastercard", assetClass: "stock", riskPressure: 28, sparkTone: "flat" }),
    row({ id: "pass398-amex", rank: 932, symbol: "AXP", name: "American Express", assetClass: "stock", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass398-paypal", rank: 933, symbol: "PYPL", name: "PayPal", assetClass: "stock", riskPressure: 48, sparkTone: "watch" }),
    row({ id: "pass398-shopify", rank: 934, symbol: "SHOP", name: "Shopify", assetClass: "stock", riskPressure: 45, sparkTone: "watch" }),
    row({ id: "pass398-block", rank: 935, symbol: "SQ", name: "Block", assetClass: "stock", riskPressure: 51, sparkTone: "watch" }),
    row({ id: "pass398-snow", rank: 936, symbol: "SNOW", name: "Snowflake", assetClass: "stock", riskPressure: 46, sparkTone: "watch" }),
    row({ id: "pass398-datadog", rank: 937, symbol: "DDOG", name: "Datadog", assetClass: "stock", riskPressure: 43, sparkTone: "watch" }),
    row({ id: "pass398-crowdstrike", rank: 938, symbol: "CRWD", name: "CrowdStrike", assetClass: "stock", riskPressure: 42, sparkTone: "watch" }),
    row({ id: "pass398-cloudflare", rank: 939, symbol: "NET", name: "Cloudflare", assetClass: "stock", riskPressure: 47, sparkTone: "watch" }),
    row({ id: "pass398-paloalto", rank: 940, symbol: "PANW", name: "Palo Alto Networks", assetClass: "stock", riskPressure: 38, sparkTone: "flat" }),
    row({ id: "pass398-fortinet", rank: 941, symbol: "FTNT", name: "Fortinet", assetClass: "stock", riskPressure: 40, sparkTone: "flat" }),
    row({ id: "pass398-atlassian", rank: 942, symbol: "TEAM", name: "Atlassian", assetClass: "stock", riskPressure: 45, sparkTone: "watch" }),
    row({ id: "pass398-servicenow", rank: 943, symbol: "NOW", name: "ServiceNow", assetClass: "stock", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass398-intuit", rank: 944, symbol: "INTU", name: "Intuit", assetClass: "stock", riskPressure: 31, sparkTone: "flat" }),
    row({ id: "pass398-uber", rank: 945, symbol: "UBER", name: "Uber", assetClass: "stock", riskPressure: 43, sparkTone: "watch" }),
    row({ id: "pass398-airbnb", rank: 946, symbol: "ABNB", name: "Airbnb", assetClass: "stock", riskPressure: 44, sparkTone: "watch" }),
    row({ id: "pass398-booking", rank: 947, symbol: "BKNG", name: "Booking Holdings", assetClass: "stock", riskPressure: 32, sparkTone: "flat" }),
    row({ id: "pass398-airbus", rank: 948, symbol: "AIR.PA", name: "Airbus", assetClass: "stock", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass398-loreal", rank: 949, symbol: "OR.PA", name: "L'Oreal", assetClass: "stock", riskPressure: 30, sparkTone: "flat" }),
    row({ id: "pass398-lvmh", rank: 950, symbol: "MC.PA", name: "LVMH", assetClass: "stock", riskPressure: 31, sparkTone: "flat" }),
    row({ id: "pass398-pernod", rank: 951, symbol: "RI.PA", name: "Pernod Ricard", assetClass: "stock", riskPressure: 37, sparkTone: "flat" }),
    row({ id: "pass398-kering", rank: 952, symbol: "KER.PA", name: "Kering", assetClass: "stock", riskPressure: 41, sparkTone: "watch" }),
    row({ id: "pass398-hermes", rank: 953, symbol: "RMS.PA", name: "Hermes", assetClass: "stock", riskPressure: 29, sparkTone: "flat" }),
    row({ id: "pass398-usdsgd", rank: 954, symbol: "USD/SGD", name: "Dollar / Singapore Dollar", assetClass: "fx", riskPressure: 28, sparkTone: "flat" }),
    row({ id: "pass398-eursgd", rank: 955, symbol: "EUR/SGD", name: "Euro / Singapore Dollar", assetClass: "fx", riskPressure: 30, sparkTone: "flat" }),
    row({ id: "pass398-usdhkd", rank: 956, symbol: "USD/HKD", name: "Dollar / Hong Kong Dollar", assetClass: "fx", riskPressure: 24, sparkTone: "flat" }),
    row({ id: "pass398-eurhkd", rank: 957, symbol: "EUR/HKD", name: "Euro / Hong Kong Dollar", assetClass: "fx", riskPressure: 29, sparkTone: "flat" }),
    row({ id: "pass398-corn", rank: 958, symbol: "ZC=F", name: "Corn Futures", assetClass: "commodity", riskPressure: 42, sparkTone: "watch" }),
    row({ id: "pass398-soy", rank: 959, symbol: "ZS=F", name: "Soybean Futures", assetClass: "commodity", riskPressure: 41, sparkTone: "watch" }),
    row({ id: "pass398-wheat", rank: 960, symbol: "ZW=F", name: "Wheat Futures", assetClass: "commodity", riskPressure: 43, sparkTone: "watch" }),
    row({ id: "pass398-iyr", rank: 961, symbol: "IYR", name: "US Real Estate ETF", assetClass: "real_estate", riskPressure: 35, sparkTone: "flat" }),
  ];
}

export const pass398ResearchLabPlainCopy = [
  "Research Lab keeps prime-number, RNG and cryptography work in an audit lane: replication, falsification and bounded security testing.",
  "Public copy describes what is protected: key custody boundary, signature proof, entropy quality and redacted evidence, without publishing exploitable internals.",
  "The terminal treats luxury status as proof depth: verified source chain, exact PDF mirror and calm expert readout.",
] as const;
