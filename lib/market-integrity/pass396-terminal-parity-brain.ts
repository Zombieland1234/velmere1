import type { UniversalAssetClass, UniversalAssetRow } from "./universal-asset-market-matrix";
import { buildPass395NeuralOrbitReadout, pass395CollectionSeconds, pass395ReadoutLimit, type Pass395AuditMode } from "./pass395-neural-orbit-search-contract";

export type Pass396AuditMode = Pass395AuditMode;
type VisualPatch = { label: string; glyph: string; primary: string; secondary: string; text?: string; logoUrl?: string };
type MarketRowInput = Partial<UniversalAssetRow> & Pick<UniversalAssetRow, "id" | "rank" | "symbol" | "name" | "assetClass" | "riskPressure" | "sparkTone">;

function assetFamily(assetClass: UniversalAssetClass) {
  if (assetClass === "fx") return "FX";
  if (assetClass === "commodity") return "commodity";
  if (assetClass === "real_estate") return "real-estate proxy";
  if (assetClass === "etf") return "ETF";
  if (assetClass === "exchange_token") return "exchange venue";
  if (assetClass === "crypto") return "crypto";
  return "equity";
}

function row(input: MarketRowInput): UniversalAssetRow {
  const family = assetFamily(input.assetClass);
  return {
    sourceRhythm: input.sourceRhythm ?? `${family} provider lane · timestamp · OHLCV · cache age · fallback · session calendar · second source`,
    priceLane: input.priceLane ?? `${family} Shield-grade candles 1H / 4H / 1D / 1W · same modal grammar as crypto Shield`,
    volumeLane: input.volumeLane ?? `${family} volume/session/spread lane separated from confidence and public copy`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${family} reference / issuer / methodology proof lane with redacted public output`,
    secondSourceLane: input.secondSourceLane ?? "primary provider ↔ second source ↔ PDF mirror before public confidence rises",
    confidenceFloor: input.confidenceFloor ?? 78,
    adapterState: input.adapterState ?? "provider_required",
    humanCopy: input.humanCopy ?? `${input.symbol} is provider-ready inside PASS396: logo, Shield-grade candles, Basic/Pro/Advanced brain, source truth and the exact Browser PDF mirror stay on one resolved object.`,
    nextAdapterStep: input.nextAdapterStep ?? "Attach live provider key, OHLCV timestamp, cache age, fallback flag, second-source compare and locale-locked PDF parity QA.",
    ...input,
  };
}

export const pass396TerminalParityContract = {
  version: "PASS396.terminal_parity_brain",
  searchRule: "Browser, Shield, Shield Map and Real Markets close stale suggestion portals before PDF forge, download, modal open, tab switch or row selection.",
  marketRule: "Real Markets mirrors Shield: logo/glyph, wide table, Shield-grade candles, timeframe, Basic/Pro/Advanced, VLM neural collector and one clean output readout.",
  pdfRule: "Lens preview and downloaded PDF use one resolved payload, one locale, one section order and one source-confidence model.",
  brainRule: "Orbit 360 starts as a VLM coin, routes blue neural lanes into a brain shell, shows collection seconds and expands to 10/14/20 fields.",
  legalRule: "Public copy sells access, craft and proof depth without price promises, fake scarcity or hidden investment commands.",
} as const;

export const pass396NeuralSequence = [
  { id: "coin", label: "VLM coin", seconds: 0.42, copy: "The selected asset is locked to one symbol, logo and route." },
  { id: "source", label: "Source stream", seconds: 0.88, copy: "Provider timestamp, cache age and fallback state enter the brain." },
  { id: "candles", label: "Shield candles", seconds: 1.24, copy: "OHLCV timeframe state is reused from the Shield chart grammar." },
  { id: "depth", label: "Liquidity lane", seconds: 1.74, copy: "Depth, spread, session and volume pressure stay separate from public confidence." },
  { id: "security", label: "Security bridge", seconds: 2.38, copy: "Signature, entropy and redaction boundaries are prepared for the public report." },
  { id: "research", label: "Research lab", seconds: 3.02, copy: "Prime/RNG work is framed as numerical audit and replication path." },
  { id: "collapse", label: "Readout collapse", seconds: 3.76, copy: "The neural map compresses into 10, 14 or 20 short fields." },
  { id: "mirror", label: "PDF mirror", seconds: 4.34, copy: "Preview and download keep the same resolved object and locale." },
] as const;

export function buildPass396TerminalBrain(input: {
  symbol: string;
  name: string;
  type: string;
  risk: number;
  source: string;
  mode: Pass396AuditMode;
}) {
  const base = buildPass395NeuralOrbitReadout(input);
  const count = pass395ReadoutLimit(input.mode);
  const seconds = pass395CollectionSeconds(input.mode) + 0.6;
  const fields = base.fields.map((field, index) => ({
    ...field,
    label: field.label,
    value: field.value,
    copy: index === 0
      ? `${input.symbol} is locked once for table, chart, modal, Browser preview and downloaded PDF.`
      : field.copy,
  }));
  return {
    version: pass396TerminalParityContract.version,
    count,
    seconds,
    headline: `${input.symbol} · Orbit 360 neural audit`,
    body: `${input.mode.toUpperCase()} collects source, candles, liquidity, security and research lanes before showing ${count} concise fields.`,
    fields,
  };
}

export const pass396AssetVisualPatch: Record<string, VisualPatch> = {
  BRK_B: { label: "Berkshire Hathaway", glyph: "BH", primary: "#111827", secondary: "#d6b263" },
  JNJ: { label: "Johnson & Johnson", glyph: "JN", primary: "#d71920", secondary: "#f8fafc", text: "#111" },
  PG: { label: "Procter & Gamble", glyph: "PG", primary: "#003da5", secondary: "#f8fafc", text: "#111" },
  HD: { label: "Home Depot", glyph: "HD", primary: "#f96302", secondary: "#111827" },
  MCD: { label: "McDonald's", glyph: "MC", primary: "#ffc72c", secondary: "#da291c", text: "#111" },
  MRK: { label: "Merck", glyph: "MR", primary: "#00857c", secondary: "#062b2a" },
  ABBV: { label: "AbbVie", glyph: "AB", primary: "#071d49", secondary: "#f8fafc" },
  TMO: { label: "Thermo Fisher", glyph: "TF", primary: "#e71316", secondary: "#111827" },
  LIN: { label: "Linde", glyph: "LI", primary: "#005bbb", secondary: "#e6f2ff" },
  ACN: { label: "Accenture", glyph: "AC", primary: "#a100ff", secondary: "#111827" },
  NOW: { label: "ServiceNow", glyph: "NW", primary: "#81b5a1", secondary: "#071c14" },
  SNOW: { label: "Snowflake", glyph: "SF", primary: "#29b5e8", secondary: "#071a2d" },
  CRWD: { label: "CrowdStrike", glyph: "CS", primary: "#e01f2d", secondary: "#111827" },
  PANW: { label: "Palo Alto Networks", glyph: "PA", primary: "#fa582d", secondary: "#111827" },
  FTNT: { label: "Fortinet", glyph: "FT", primary: "#ee3124", secondary: "#111827" },
  NET: { label: "Cloudflare", glyph: "CF", primary: "#f48120", secondary: "#111827" },
  DDOG: { label: "Datadog", glyph: "DD", primary: "#632ca6", secondary: "#111827" },
  ZS: { label: "Zscaler", glyph: "ZS", primary: "#0d4ea6", secondary: "#06183b" },
  "ADS.DE": { label: "Adidas", glyph: "AD", primary: "#111827", secondary: "#f8fafc" },
  "RMS.PA": { label: "Hermes", glyph: "HM", primary: "#f37021", secondary: "#2a1204" },
  "OR.PA": { label: "L'Oreal", glyph: "OR", primary: "#c9a65a", secondary: "#111827" },
  "KER.PA": { label: "Kering", glyph: "KR", primary: "#111827", secondary: "#c9a65a" },
  "AIR.PA": { label: "Airbus", glyph: "AI", primary: "#00205b", secondary: "#70a7ff" },
  "SIE.DE": { label: "Siemens", glyph: "SI", primary: "#009999", secondary: "#061f1f" },
  "DTE.DE": { label: "Deutsche Telekom", glyph: "DT", primary: "#e20074", secondary: "#250018" },
  "BMW.DE": { label: "BMW", glyph: "BM", primary: "#0066b1", secondary: "#f8fafc", text: "#111" },
  "MBG.DE": { label: "Mercedes-Benz", glyph: "MB", primary: "#111827", secondary: "#cbd5e1" },
  "7203.T": { label: "Toyota Motor", glyph: "TY", primary: "#eb0a1e", secondary: "#111827" },
  "9984.T": { label: "SoftBank Group", glyph: "SB", primary: "#d71920", secondary: "#111827" },
  "005930.KS": { label: "Samsung Electronics", glyph: "SS", primary: "#1428a0", secondary: "#f8fafc", text: "#111" },
  "HSBA.L": { label: "HSBC", glyph: "HS", primary: "#db0011", secondary: "#f8fafc", text: "#111" },
  "VOD.L": { label: "Vodafone", glyph: "VO", primary: "#e60000", secondary: "#111827" },
  "EUR/AUD": { label: "Euro / Australian Dollar", glyph: "EA", primary: "#225eea", secondary: "#1d9a64" },
  "EUR/CAD": { label: "Euro / Canadian Dollar", glyph: "EC", primary: "#225eea", secondary: "#d52b1e" },
  "GBP/JPY": { label: "Pound / Yen", glyph: "GJ", primary: "#314a9f", secondary: "#d94d4d" },
  "AUD/JPY": { label: "Aussie / Yen", glyph: "AJ", primary: "#1d9a64", secondary: "#d94d4d" },
  "NZD/JPY": { label: "Kiwi / Yen", glyph: "NJ", primary: "#1d4e89", secondary: "#d94d4d" },
  "CAD/JPY": { label: "Canadian Dollar / Yen", glyph: "CJ", primary: "#d52b1e", secondary: "#d94d4d" },
  "USD/SGD": { label: "Dollar / Singapore Dollar", glyph: "SG", primary: "#0f8d61", secondary: "#e11d48" },
  "USD/HKD": { label: "Dollar / Hong Kong Dollar", glyph: "HK", primary: "#0f8d61", secondary: "#dc2626" },
  "USD/CNY": { label: "Dollar / Yuan", glyph: "CN", primary: "#0f8d61", secondary: "#b91c1c" },
  "EUR/CHF": { label: "Euro / Franc", glyph: "EF", primary: "#225eea", secondary: "#d52b1e" },
  "CL=F": { label: "WTI Crude Oil", glyph: "WT", primary: "#111827", secondary: "#c49a43" },
  "BZ=F": { label: "Brent Crude", glyph: "BR", primary: "#18181b", secondary: "#d6b263" },
  "GC=F": { label: "Gold", glyph: "AU", primary: "#d6b263", secondary: "#111827" },
  "SI=F": { label: "Silver", glyph: "AG", primary: "#cbd5e1", secondary: "#111827", text: "#111" },
  "PL=F": { label: "Platinum", glyph: "PT", primary: "#dbeafe", secondary: "#111827", text: "#111" },
  "PA=F": { label: "Palladium", glyph: "PD", primary: "#e2e8f0", secondary: "#334155", text: "#111" },
  "ZC=F": { label: "Corn", glyph: "CR", primary: "#facc15", secondary: "#3f2f00", text: "#111" },
  "ZW=F": { label: "Wheat", glyph: "WH", primary: "#eab308", secondary: "#3f2f00", text: "#111" },
  "ZS=F": { label: "Soybeans", glyph: "SO", primary: "#65a30d", secondary: "#1a2e05" },
  IYR: { label: "US Real Estate ETF", glyph: "IR", primary: "#a98256", secondary: "#251709" },
  SCHH: { label: "Schwab US REIT", glyph: "SR", primary: "#1d4ed8", secondary: "#06183b" },
  XLRE: { label: "Real Estate Select Sector", glyph: "XR", primary: "#c49a43", secondary: "#111827" },
  REM: { label: "Mortgage REIT ETF", glyph: "MR", primary: "#8b5cf6", secondary: "#1d0b38" },
  VNQ: { label: "Vanguard Real Estate", glyph: "VQ", primary: "#b99d72", secondary: "#24170d" },
};

export const pass396PseudoPricePatch: Record<string, string> = {
  BRK_B: "$512.40", JNJ: "$183.10", PG: "$168.20", HD: "$382.80", MCD: "$304.20", MRK: "$101.50", ABBV: "$191.40", TMO: "$562.30", LIN: "$469.70", ACN: "$301.20", NOW: "$1,020.50", SNOW: "$218.60", CRWD: "$487.90", PANW: "$202.80", FTNT: "$103.40", NET: "$178.20", DDOG: "$142.10", ZS: "$315.40",
  "ADS.DE": "€221.80", "RMS.PA": "€2,340.00", "OR.PA": "€387.40", "KER.PA": "€274.30", "AIR.PA": "€189.20", "SIE.DE": "€228.40", "DTE.DE": "€30.80", "BMW.DE": "€84.20", "MBG.DE": "€56.40", "7203.T": "¥2,890", "9984.T": "¥11,420", "005930.KS": "₩79,500", "HSBA.L": "£9.82", "VOD.L": "£0.78",
  "EUR/AUD": "1.77", "EUR/CAD": "1.58", "GBP/JPY": "205.20", "AUD/JPY": "98.40", "NZD/JPY": "89.70", "CAD/JPY": "106.80", "USD/SGD": "1.28", "USD/HKD": "7.80", "USD/CNY": "7.14",
  "CL=F": "$74.80", "BZ=F": "$78.20", "GC=F": "$3,390", "SI=F": "$36.80", "PL=F": "$1,055", "PA=F": "$968", "ZC=F": "$4.62", "ZW=F": "$5.78", "ZS=F": "$10.54",
  IYR: "$99.20", SCHH: "$22.80", XLRE: "$43.60", REM: "$24.70", VNQ: "$91.30",
};

export function buildPass396MarketCoverageUniverse(): UniversalAssetRow[] {
  return [
    row({ id: "pass396-brk", rank: 39601, symbol: "BRK_B", name: "Berkshire Hathaway", assetClass: "stock", riskPressure: 23, sparkTone: "flat" }),
    row({ id: "pass396-jj", rank: 39602, symbol: "JNJ", name: "Johnson & Johnson", assetClass: "stock", riskPressure: 24, sparkTone: "flat" }),
    row({ id: "pass396-pg", rank: 39603, symbol: "PG", name: "Procter & Gamble", assetClass: "stock", riskPressure: 23, sparkTone: "flat" }),
    row({ id: "pass396-hd", rank: 39604, symbol: "HD", name: "Home Depot", assetClass: "stock", riskPressure: 31, sparkTone: "flat" }),
    row({ id: "pass396-mcd", rank: 39605, symbol: "MCD", name: "McDonald's", assetClass: "stock", riskPressure: 28, sparkTone: "flat" }),
    row({ id: "pass396-mrk", rank: 39606, symbol: "MRK", name: "Merck", assetClass: "stock", riskPressure: 29, sparkTone: "flat" }),
    row({ id: "pass396-abbv", rank: 39607, symbol: "ABBV", name: "AbbVie", assetClass: "stock", riskPressure: 32, sparkTone: "watch" }),
    row({ id: "pass396-tmo", rank: 39608, symbol: "TMO", name: "Thermo Fisher Scientific", assetClass: "stock", riskPressure: 30, sparkTone: "flat" }),
    row({ id: "pass396-lin", rank: 39609, symbol: "LIN", name: "Linde", assetClass: "stock", riskPressure: 27, sparkTone: "flat" }),
    row({ id: "pass396-acn", rank: 39610, symbol: "ACN", name: "Accenture", assetClass: "stock", riskPressure: 34, sparkTone: "watch" }),
    row({ id: "pass396-now", rank: 39611, symbol: "NOW", name: "ServiceNow", assetClass: "stock", riskPressure: 43, sparkTone: "watch" }),
    row({ id: "pass396-snow", rank: 39612, symbol: "SNOW", name: "Snowflake", assetClass: "stock", riskPressure: 48, sparkTone: "watch" }),
    row({ id: "pass396-crwd", rank: 39613, symbol: "CRWD", name: "CrowdStrike", assetClass: "stock", riskPressure: 44, sparkTone: "watch" }),
    row({ id: "pass396-panw", rank: 39614, symbol: "PANW", name: "Palo Alto Networks", assetClass: "stock", riskPressure: 41, sparkTone: "watch" }),
    row({ id: "pass396-ftnt", rank: 39615, symbol: "FTNT", name: "Fortinet", assetClass: "stock", riskPressure: 39, sparkTone: "watch" }),
    row({ id: "pass396-net", rank: 39616, symbol: "NET", name: "Cloudflare", assetClass: "stock", riskPressure: 47, sparkTone: "watch" }),
    row({ id: "pass396-ddog", rank: 39617, symbol: "DDOG", name: "Datadog", assetClass: "stock", riskPressure: 45, sparkTone: "watch" }),
    row({ id: "pass396-zs", rank: 39618, symbol: "ZS", name: "Zscaler", assetClass: "stock", riskPressure: 44, sparkTone: "watch" }),
    row({ id: "pass396-adidas", rank: 39619, symbol: "ADS.DE", name: "Adidas", assetClass: "stock", riskPressure: 32, sparkTone: "flat" }),
    row({ id: "pass396-hermes", rank: 39620, symbol: "RMS.PA", name: "Hermes", assetClass: "stock", riskPressure: 26, sparkTone: "flat" }),
    row({ id: "pass396-loreal", rank: 39621, symbol: "OR.PA", name: "L'Oreal", assetClass: "stock", riskPressure: 28, sparkTone: "flat" }),
    row({ id: "pass396-kering", rank: 39622, symbol: "KER.PA", name: "Kering", assetClass: "stock", riskPressure: 36, sparkTone: "watch" }),
    row({ id: "pass396-airbus", rank: 39623, symbol: "AIR.PA", name: "Airbus", assetClass: "stock", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass396-siemens", rank: 39624, symbol: "SIE.DE", name: "Siemens", assetClass: "stock", riskPressure: 31, sparkTone: "flat" }),
    row({ id: "pass396-dtelekom", rank: 39625, symbol: "DTE.DE", name: "Deutsche Telekom", assetClass: "stock", riskPressure: 25, sparkTone: "flat" }),
    row({ id: "pass396-bmw", rank: 39626, symbol: "BMW.DE", name: "BMW", assetClass: "stock", riskPressure: 35, sparkTone: "watch" }),
    row({ id: "pass396-mercedes", rank: 39627, symbol: "MBG.DE", name: "Mercedes-Benz", assetClass: "stock", riskPressure: 35, sparkTone: "watch" }),
    row({ id: "pass396-toyota", rank: 39628, symbol: "7203.T", name: "Toyota Motor", assetClass: "stock", riskPressure: 30, sparkTone: "flat" }),
    row({ id: "pass396-softbank", rank: 39629, symbol: "9984.T", name: "SoftBank Group", assetClass: "stock", riskPressure: 50, sparkTone: "watch" }),
    row({ id: "pass396-samsung", rank: 39630, symbol: "005930.KS", name: "Samsung Electronics", assetClass: "stock", riskPressure: 33, sparkTone: "flat" }),
    row({ id: "pass396-hsbc", rank: 39631, symbol: "HSBA.L", name: "HSBC", assetClass: "stock", riskPressure: 29, sparkTone: "flat" }),
    row({ id: "pass396-vodafone", rank: 39632, symbol: "VOD.L", name: "Vodafone", assetClass: "stock", riskPressure: 38, sparkTone: "watch" }),
    row({ id: "pass396-euraud", rank: 39633, symbol: "EUR/AUD", name: "Euro / Australian Dollar", assetClass: "fx", riskPressure: 32, sparkTone: "flat" }),
    row({ id: "pass396-eurcad", rank: 39634, symbol: "EUR/CAD", name: "Euro / Canadian Dollar", assetClass: "fx", riskPressure: 31, sparkTone: "flat" }),
    row({ id: "pass396-gbpjpy", rank: 39635, symbol: "GBP/JPY", name: "Pound / Yen", assetClass: "fx", riskPressure: 42, sparkTone: "watch" }),
    row({ id: "pass396-audjpy", rank: 39636, symbol: "AUD/JPY", name: "Aussie / Yen", assetClass: "fx", riskPressure: 39, sparkTone: "watch" }),
    row({ id: "pass396-nzdjpy", rank: 39637, symbol: "NZD/JPY", name: "Kiwi / Yen", assetClass: "fx", riskPressure: 40, sparkTone: "watch" }),
    row({ id: "pass396-cadjpy", rank: 39638, symbol: "CAD/JPY", name: "Canadian Dollar / Yen", assetClass: "fx", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass396-usdsgd", rank: 39639, symbol: "USD/SGD", name: "Dollar / Singapore Dollar", assetClass: "fx", riskPressure: 25, sparkTone: "flat" }),
    row({ id: "pass396-usdhkd", rank: 39640, symbol: "USD/HKD", name: "Dollar / Hong Kong Dollar", assetClass: "fx", riskPressure: 26, sparkTone: "flat" }),
    row({ id: "pass396-usdcny", rank: 39641, symbol: "USD/CNY", name: "Dollar / Yuan", assetClass: "fx", riskPressure: 36, sparkTone: "watch" }),
    row({ id: "pass396-cl", rank: 39642, symbol: "CL=F", name: "WTI Crude Oil", assetClass: "commodity", riskPressure: 46, sparkTone: "watch" }),
    row({ id: "pass396-brent", rank: 39643, symbol: "BZ=F", name: "Brent Crude", assetClass: "commodity", riskPressure: 45, sparkTone: "watch" }),
    row({ id: "pass396-gold", rank: 39644, symbol: "GC=F", name: "Gold", assetClass: "commodity", riskPressure: 33, sparkTone: "flat" }),
    row({ id: "pass396-silver", rank: 39645, symbol: "SI=F", name: "Silver", assetClass: "commodity", riskPressure: 43, sparkTone: "watch" }),
    row({ id: "pass396-platinum", rank: 39646, symbol: "PL=F", name: "Platinum", assetClass: "commodity", riskPressure: 42, sparkTone: "watch" }),
    row({ id: "pass396-palladium", rank: 39647, symbol: "PA=F", name: "Palladium", assetClass: "commodity", riskPressure: 48, sparkTone: "watch" }),
    row({ id: "pass396-corn", rank: 39648, symbol: "ZC=F", name: "Corn", assetClass: "commodity", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass396-wheat", rank: 39649, symbol: "ZW=F", name: "Wheat", assetClass: "commodity", riskPressure: 39, sparkTone: "watch" }),
    row({ id: "pass396-soy", rank: 39650, symbol: "ZS=F", name: "Soybeans", assetClass: "commodity", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass396-iyr", rank: 39651, symbol: "IYR", name: "US Real Estate ETF", assetClass: "real_estate", riskPressure: 33, sparkTone: "flat" }),
    row({ id: "pass396-schh", rank: 39652, symbol: "SCHH", name: "Schwab US REIT", assetClass: "real_estate", riskPressure: 31, sparkTone: "flat" }),
    row({ id: "pass396-xlre", rank: 39653, symbol: "XLRE", name: "Real Estate Select Sector", assetClass: "real_estate", riskPressure: 32, sparkTone: "flat" }),
    row({ id: "pass396-rem", rank: 39654, symbol: "REM", name: "Mortgage REIT ETF", assetClass: "real_estate", riskPressure: 46, sparkTone: "watch" }),
    row({ id: "pass396-vnq", rank: 39655, symbol: "VNQ", name: "Vanguard Real Estate", assetClass: "real_estate", riskPressure: 32, sparkTone: "flat" }),
  ];
}
