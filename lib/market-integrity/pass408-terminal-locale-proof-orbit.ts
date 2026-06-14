import type { UniversalAssetRow } from "./universal-asset-market-matrix";
import {
  PASS407_RUNTIME_CLOSE_EVENT,
  buildPass407TerminalPayloadIntegrityReadout,
  pass407TerminalPayloadIntegrityOrbit,
  type Pass407AuditMode,
} from "./pass407-terminal-exact-payload-orbit";

export const PASS408_RUNTIME_CLOSE_EVENT = "velmere:pass408:terminal-locale-proof-orbit-close";
export type Pass408AuditMode = Pass407AuditMode;
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
    sourceRhythm: input.sourceRhythm ?? `${lane} provider cadence · exact payload · reconnect guard · cache-age badge · second-source drift`,
    priceLane: input.priceLane ?? `${lane} Shield-grade candles · wick/body/volume grammar · timeframe lock · modal mirror · PDF parity`,
    volumeLane: input.volumeLane ?? `${lane} liquidity, session volume, spread proxy, fallback flag and data age stay visible before AI tone`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${lane} issuer, venue, methodology, icon authority and provider timestamp are shown before confidence`,
    secondSourceLane: input.secondSourceLane ?? "provider ↔ second source ↔ search close bus ↔ Brain modal ↔ preview ↔ PDF locale proof exactness",
    confidenceFloor: input.confidenceFloor ?? 91,
    adapterState: input.adapterState ?? "provider_required",
    humanCopy: input.humanCopy ?? `${input.symbol} is routed through PASS408: locale proof exactness, one close bus, Shield-grade chart, Orbit 360 Brain and locale-exact PDF preview/download parity.`,
    nextAdapterStep: input.nextAdapterStep ?? "Attach live OHLCV provider, official icon authority, session calendar, locale proof exactness and second-source drift before raising live confidence.",
    ...input,
  };
}

export const pass408TerminalPayloadIntegrityOrbit = {
  version: "PASS408.terminal_locale_proof_orbit",
  runtimeRule: "One close bus shuts Browser, Shield, Shield Map and Real Markets suggestions before modal open, PDF forge, PDF preview, PDF download, scroll, tab switch and route handoff.",
  marketRule: "Real Markets mirrors Shield: trusted icon, advanced candles, timeframe, Basic/Pro/Advanced, Orbit 360 Brain, concise field output and provider-required live boundary.",
  pdfRule: "Preview and downloaded PDF must be rendered from the same resolved payload with a locale proof exactness mindset: same symbol, locale, section order, fields and deterministic copy.",
  brainRule: "The VLM coin receives search intent, provider identity, candle state, freshness, second-source drift, language lock, security boundary and PDF checksum before morphing into Basic 10, Pro 14 or Advanced 20 fields.",
  copyRule: "Public copy stays compact: source, chart, proof, security boundary, research boundary, payload parity and next verification step only.",
  securityRule: "Security copy stays simple and premium: private-key boundary, signature proof, entropy quality, redaction, provider truth and withheld internal methods.",
  launchRule: "Status is earned by exact payload, traceability and calm proof, never by fake scarcity, profit language or debug pass-history.",
  inheritedCloseBus: PASS407_RUNTIME_CLOSE_EVENT,
  previousVersion: pass407TerminalPayloadIntegrityOrbit.version,
} as const;

export const pass408TruthOrbitTimeline = [
  { id: "close", label: "close bus", seconds: 0.02, copy: "Suggestions close before search submit, modal open, PDF forge, preview, download, scroll, tab switch and route handoff." },
  { id: "payload", label: "locale proof exactness", seconds: 0.11, copy: "Symbol, locale, asset class, title, provider state, fallback flags and output order resolve once." },
  { id: "identity", label: "identity seal", seconds: 0.20, copy: "Icon, name, market lane and source route lock before the AI Brain starts copy." },
  { id: "chart", label: "Shield candles", seconds: 0.36, copy: "Real Stocks, FX, ETF, commodities and REIT proxies use the same candle grammar as Shield." },
  { id: "freshness", label: "freshness rail", seconds: 0.62, copy: "Timestamp, cache age, reconnect state and second-source drift stay separate from narrative tone." },
  { id: "orbit", label: "Orbit 360", seconds: 0.94, copy: "Blue packets feed the VLM coin and neural shell instead of showing random cards." },
  { id: "security", label: "security boundary", seconds: 1.26, copy: "Private keys, signatures, entropy and redaction are explained without exposing internal scoring." },
  { id: "research", label: "research boundary", seconds: 1.60, copy: "Prime/RNG work remains framed as audit, replication and falsification." },
  { id: "locale", label: "locale lock", seconds: 1.96, copy: "PL, EN and DE labels resolve once and mirror into preview HTML and downloaded PDF." },
  { id: "morph", label: "field morph", seconds: 2.38, copy: "The brain morphs into Basic 10, Pro 14 or Advanced 20 fields." },
  { id: "clean", label: "clean surface", seconds: 2.92, copy: "Old pass-history stays hidden; only the newest public terminal remains visible." },
  { id: "proof", label: "proof first", seconds: 3.48, copy: "Premium pressure comes from proof, freshness and traceability instead of hype." },
  { id: "pdf", label: "PDF mirror", seconds: 4.08, copy: "Preview and download keep the same payload, order and language." },
  { id: "provider", label: "provider ready", seconds: 4.74, copy: "The next production step is provider wiring, not fake-live placeholders." },
  { id: "exactness", label: "integrity seal", seconds: 5.42, copy: "The same resolved payload feeds search, modal, Brain, preview and download." },
] as const;

const localeLine: Record<"pl" | "en" | "de", string> = {
  pl: "Jeden payload zasila wyszukiwarkę, modal, Orbit Brain, podgląd i PDF; publiczny widok pokazuje źródła, wykres, dowód, granice i krótkie pola bez losowego copy.",
  en: "One payload powers search, modal, Orbit Brain, preview and PDF; the public surface shows source, chart, proof, boundaries and concise fields without random copy.",
  de: "Ein Payload speist Suche, Modal, Orbit Brain, Vorschau und PDF; die öffentliche Oberfläche zeigt Quelle, Chart, Nachweis, Grenzen und kurze Felder ohne Zufallstexte.",
};

export function buildPass408TerminalLocaleProofReadout(input: {
  symbol: string;
  name: string;
  type: string;
  risk: number;
  source: string;
  mode: Pass408AuditMode;
  locale?: "pl" | "en" | "de";
}) {
  const base = buildPass407TerminalPayloadIntegrityReadout(input);
  const count = input.mode === "advanced" ? 20 : input.mode === "pro" ? 14 : 10;
  const locale = input.locale ?? "en";
  return {
    version: pass408TerminalPayloadIntegrityOrbit.version,
    count,
    seconds: Math.max(base.seconds, 5.42) + 0.18,
    headline: `${input.symbol} · locale proof orbit`,
    body: `${input.mode.toUpperCase()} uses one canonical payload, one close bus, one Shield-grade chart, one Orbit 360 VLM Brain and one locale-checksummed PDF mirror before ${count} fields appear. ${localeLine[locale]}`,
    fields: base.fields.slice(0, count).map((field, index) => ({
      ...field,
      value: index === 0 ? `${input.symbol} · locale proof exactness` : index === 1 ? `${input.source} · freshness rail` : index === 2 ? `${input.mode.toUpperCase()} · ${count} fields` : index === 3 ? `${input.type} · Shield mirror` : index === 4 ? `${locale.toUpperCase()} · locale lock` : index === 5 ? "preview = download" : field.value,
      copy: index === 0 ? `${input.name}: ${pass408TerminalPayloadIntegrityOrbit.pdfRule}` : index === 1 ? pass408TerminalPayloadIntegrityOrbit.runtimeRule : index === 2 ? pass408TerminalPayloadIntegrityOrbit.brainRule : index === 3 ? pass408TerminalPayloadIntegrityOrbit.marketRule : index === 4 ? localeLine[locale] : index === 5 ? "Preview, downloaded PDF and modal readout share one payload order, not a separate text generator." : field.copy,
    })),
  };
}

export const pass408AssetVisualPatch: Record<string, VisualPatch> = {
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
  PLTR: { label: "Palantir", glyph: "PL", primary: "#111827", secondary: "#38bdf8" },
  CRWD: { label: "CrowdStrike", glyph: "CS", primary: "#dc2626", secondary: "#111827" },
  DDOG: { label: "Datadog", glyph: "DD", primary: "#632ca6", secondary: "#f8fafc" },
  SNOW: { label: "Snowflake", glyph: "SN", primary: "#29b5e8", secondary: "#111827", text: "#111" },
  MDB: { label: "MongoDB", glyph: "DB", primary: "#13aa52", secondary: "#111827", text: "#111" },
  TTD: { label: "The Trade Desk", glyph: "TD", primary: "#0f172a", secondary: "#38bdf8" },
  CPNG: { label: "Coupang", glyph: "CP", primary: "#e11d48", secondary: "#facc15", text: "#111" },
  SE: { label: "Sea Limited", glyph: "SE", primary: "#ea580c", secondary: "#111827", text: "#111" },
  TSM: { label: "TSMC", glyph: "TS", primary: "#dc2626", secondary: "#111827" },
  ASML: { label: "ASML", glyph: "AS", primary: "#0f172a", secondary: "#f97316" },
  "KER.PA": { label: "Kering", glyph: "KE", primary: "#111827", secondary: "#c8a96a" },
  "ZAL.DE": { label: "Zalando", glyph: "ZA", primary: "#ff6900", secondary: "#111827", text: "#111" },
  "EUR/NOK": { label: "Euro / Norwegian Krone", glyph: "NO", primary: "#ba0c2f", secondary: "#00205b" },
  "USD/NOK": { label: "Dollar / Norwegian Krone", glyph: "NO", primary: "#00205b", secondary: "#ba0c2f" },
  "EUR/SEK": { label: "Euro / Swedish Krona", glyph: "SE", primary: "#006aa7", secondary: "#fecc00", text: "#111" },
  "USD/SEK": { label: "Dollar / Swedish Krona", glyph: "SE", primary: "#fecc00", secondary: "#006aa7", text: "#111" },
  "RB=F": { label: "RBOB Gasoline", glyph: "RB", primary: "#f97316", secondary: "#111827", text: "#111" },
  "HO=F": { label: "Heating Oil", glyph: "HO", primary: "#0ea5e9", secondary: "#111827" },
  "SB=F": { label: "Sugar Futures", glyph: "SB", primary: "#f8fafc", secondary: "#7c3aed", text: "#111" },
  "CC=F": { label: "Cocoa Futures", glyph: "CC", primary: "#92400e", secondary: "#facc15", text: "#111" },
  IYR: { label: "iShares US Real Estate", glyph: "IY", primary: "#111827", secondary: "#22c55e" },
  SCHH: { label: "Schwab US REIT ETF", glyph: "SC", primary: "#1d4ed8", secondary: "#f8fafc" },
  NOW: { label: "ServiceNow", glyph: "NW", primary: "#81b5a1", secondary: "#111827", text: "#111" },
  ZS: { label: "Zscaler", glyph: "ZS", primary: "#2563eb", secondary: "#f8fafc" },
  PANW: { label: "Palo Alto Networks", glyph: "PA", primary: "#f97316", secondary: "#111827", text: "#111" },
  OKTA: { label: "Okta", glyph: "OK", primary: "#00297a", secondary: "#f8fafc" },
  TEAM: { label: "Atlassian", glyph: "AT", primary: "#0052cc", secondary: "#f8fafc" },
  WDAY: { label: "Workday", glyph: "WD", primary: "#0875e1", secondary: "#f8fafc" },
  FICO: { label: "Fair Isaac", glyph: "FI", primary: "#0f172a", secondary: "#38bdf8" },
  SPGI: { label: "S&P Global", glyph: "SP", primary: "#111827", secondary: "#dc2626" },
  MSCI: { label: "MSCI", glyph: "MS", primary: "#111827", secondary: "#22c55e" },
  ICE: { label: "Intercontinental Exchange", glyph: "IC", primary: "#005bbb", secondary: "#f8fafc" },
  CME: { label: "CME Group", glyph: "CM", primary: "#0f172a", secondary: "#60a5fa" },
  AON: { label: "Aon", glyph: "AO", primary: "#e11d48", secondary: "#f8fafc" },
  ACN: { label: "Accenture", glyph: "AC", primary: "#a100ff", secondary: "#111827" },
  "SAP.DE": { label: "SAP", glyph: "SA", primary: "#0faaff", secondary: "#111827", text: "#111" },
  "DTE.DE": { label: "Deutsche Telekom", glyph: "DT", primary: "#e20074", secondary: "#f8fafc" },
  "ENEL.MI": { label: "Enel", glyph: "EN", primary: "#00a443", secondary: "#111827", text: "#111" },
  "EON.DE": { label: "E.ON", glyph: "EO", primary: "#ea1b2d", secondary: "#f8fafc" },
  "IBE.MC": { label: "Iberdrola", glyph: "IB", primary: "#65a30d", secondary: "#111827", text: "#111" },
  "NESN.SW": { label: "Nestlé", glyph: "NE", primary: "#6b3f2a", secondary: "#f8fafc" },
  "NOVN.SW": { label: "Novartis", glyph: "NO", primary: "#ea580c", secondary: "#111827", text: "#111" },
  "ROG.SW": { label: "Roche", glyph: "RO", primary: "#0057b8", secondary: "#f8fafc" },
  SONY: { label: "Sony", glyph: "SO", primary: "#111827", secondary: "#f8fafc" },
  TM: { label: "Toyota", glyph: "TY", primary: "#dc2626", secondary: "#f8fafc" },
  HMC: { label: "Honda", glyph: "HO", primary: "#dc2626", secondary: "#111827" },
  "USD/CZK": { label: "Dollar / Czech Koruna", glyph: "CZ", primary: "#11457e", secondary: "#d7141a" },
  "EUR/CZK": { label: "Euro / Czech Koruna", glyph: "CZ", primary: "#d7141a", secondary: "#11457e" },
  "USD/HUF": { label: "Dollar / Hungarian Forint", glyph: "HU", primary: "#436f4d", secondary: "#cd2a3e" },
  "EUR/HUF": { label: "Euro / Hungarian Forint", glyph: "HU", primary: "#cd2a3e", secondary: "#436f4d" },
  "SI=F": { label: "Silver Futures", glyph: "SI", primary: "#cbd5e1", secondary: "#111827", text: "#111" },
  "PL=F": { label: "Platinum Futures", glyph: "PT", primary: "#94a3b8", secondary: "#111827", text: "#111" },
  "PA=F": { label: "Palladium Futures", glyph: "PD", primary: "#64748b", secondary: "#f8fafc" },
  VNQ: { label: "Vanguard Real Estate ETF", glyph: "VQ", primary: "#111827", secondary: "#22c55e" },
  XLRE: { label: "Real Estate Select Sector", glyph: "XR", primary: "#7c3aed", secondary: "#f8fafc" },
};

export const pass408PseudoPricePatch: Record<string, string> = {
  SHOP: "$63.80", UBER: "$71.40", ABNB: "$145.30", MELI: "$1,641.00", ARM: "$129.60", MU: "$131.20", LRCX: "$927.00", KLAC: "$812.50", MRVL: "$77.30", DELL: "$144.90", HPE: "$21.40", INTU: "$618.00", ADSK: "$245.20", ANET: "$89.30", NET: "$83.10",
  "RACE.MI": "€392.40", "MBG.DE": "€64.20", "BMW.DE": "€92.30", "VOW3.DE": "€118.80", "AIR.DE": "€154.60",
  "JPY/PLN": "zł0.026", "CHF/PLN": "zł4.55", "GBP/PLN": "zł5.13", "NOK/PLN": "zł0.37", "SEK/PLN": "zł0.39",
  "NG=F": "$2.79", "ZC=F": "$4.48", "ZS=F": "$11.82", "ZW=F": "$6.12", RWR: "$92.40", USRT: "$52.80",
  PLTR: "$22.70", CRWD: "$346.00", DDOG: "$119.60", SNOW: "$134.20", MDB: "$251.30", TTD: "$92.40", CPNG: "$22.10", SE: "$72.80", TSM: "$174.20", ASML: "$934.10",
  "KER.PA": "€318.60", "ZAL.DE": "€24.80", "EUR/NOK": "kr11.54", "USD/NOK": "kr10.62", "EUR/SEK": "kr11.18", "USD/SEK": "kr10.28",
  "RB=F": "$2.43", "HO=F": "$2.37", "SB=F": "$0.19", "CC=F": "$7,850", IYR: "$86.40", SCHH: "$20.90",
  NOW: "$742.00", ZS: "$184.60", PANW: "$318.40", OKTA: "$91.20", TEAM: "$172.30", WDAY: "$235.80", FICO: "$1,432.00", SPGI: "$436.10", MSCI: "$492.30", ICE: "$141.40", CME: "$212.60", AON: "$296.80", ACN: "$304.10",
  "SAP.DE": "€178.40", "DTE.DE": "€22.80", "ENEL.MI": "€6.70", "EON.DE": "€12.40", "IBE.MC": "€11.95", "NESN.SW": "CHF 96.20", "NOVN.SW": "CHF 88.40", "ROG.SW": "CHF 246.50", SONY: "$82.40", TM: "$202.30", HMC: "$32.40",
  "USD/CZK": "Kč22.80", "EUR/CZK": "Kč24.70", "USD/HUF": "Ft358.00", "EUR/HUF": "Ft389.00", "SI=F": "$30.20", "PL=F": "$1,038", "PA=F": "$945", VNQ: "$84.10", XLRE: "$39.40",
};

export function buildPass407MarketCoverageUniverse(): UniversalAssetRow[] {
  return [
    row({ id: "pass408-shopify", rank: 1176, symbol: "SHOP", name: "Shopify", assetClass: "stock", riskPressure: 42, sparkTone: "watch" }),
    row({ id: "pass408-uber", rank: 1177, symbol: "UBER", name: "Uber", assetClass: "stock", riskPressure: 39, sparkTone: "flat" }),
    row({ id: "pass408-airbnb", rank: 1178, symbol: "ABNB", name: "Airbnb", assetClass: "stock", riskPressure: 41, sparkTone: "watch" }),
    row({ id: "pass408-mercadolibre", rank: 1179, symbol: "MELI", name: "MercadoLibre", assetClass: "stock", riskPressure: 44, sparkTone: "watch" }),
    row({ id: "pass408-arm", rank: 1180, symbol: "ARM", name: "Arm Holdings", assetClass: "stock", riskPressure: 48, sparkTone: "watch" }),
    row({ id: "pass408-micron", rank: 1181, symbol: "MU", name: "Micron", assetClass: "stock", riskPressure: 46, sparkTone: "watch" }),
    row({ id: "pass408-lam", rank: 1182, symbol: "LRCX", name: "Lam Research", assetClass: "stock", riskPressure: 39, sparkTone: "flat" }),
    row({ id: "pass408-kla", rank: 1183, symbol: "KLAC", name: "KLA", assetClass: "stock", riskPressure: 38, sparkTone: "flat" }),
    row({ id: "pass408-marvell", rank: 1184, symbol: "MRVL", name: "Marvell", assetClass: "stock", riskPressure: 45, sparkTone: "watch" }),
    row({ id: "pass408-dell", rank: 1185, symbol: "DELL", name: "Dell Technologies", assetClass: "stock", riskPressure: 40, sparkTone: "flat" }),
    row({ id: "pass408-hpe", rank: 1186, symbol: "HPE", name: "Hewlett Packard Enterprise", assetClass: "stock", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass408-intuit", rank: 1187, symbol: "INTU", name: "Intuit", assetClass: "stock", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass408-autodesk", rank: 1188, symbol: "ADSK", name: "Autodesk", assetClass: "stock", riskPressure: 37, sparkTone: "flat" }),
    row({ id: "pass408-arista", rank: 1189, symbol: "ANET", name: "Arista Networks", assetClass: "stock", riskPressure: 43, sparkTone: "watch" }),
    row({ id: "pass408-cloudflare", rank: 1190, symbol: "NET", name: "Cloudflare", assetClass: "stock", riskPressure: 47, sparkTone: "watch" }),
    row({ id: "pass408-ferrari", rank: 1191, symbol: "RACE.MI", name: "Ferrari Milan", assetClass: "stock", riskPressure: 30, sparkTone: "flat" }),
    row({ id: "pass408-mercedes", rank: 1192, symbol: "MBG.DE", name: "Mercedes-Benz Group", assetClass: "stock", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass408-bmw", rank: 1193, symbol: "BMW.DE", name: "BMW", assetClass: "stock", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass408-volkswagen", rank: 1194, symbol: "VOW3.DE", name: "Volkswagen Preference", assetClass: "stock", riskPressure: 42, sparkTone: "watch" }),
    row({ id: "pass408-airbus-de", rank: 1195, symbol: "AIR.DE", name: "Airbus Germany Proxy", assetClass: "stock", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass408-jpypln", rank: 1196, symbol: "JPY/PLN", name: "Yen / Polish Zloty", assetClass: "fx", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass408-chfpln", rank: 1197, symbol: "CHF/PLN", name: "Swiss Franc / Polish Zloty", assetClass: "fx", riskPressure: 39, sparkTone: "watch" }),
    row({ id: "pass408-gbppln", rank: 1198, symbol: "GBP/PLN", name: "Pound / Polish Zloty", assetClass: "fx", riskPressure: 37, sparkTone: "flat" }),
    row({ id: "pass408-nokpln", rank: 1199, symbol: "NOK/PLN", name: "Norwegian Krone / Polish Zloty", assetClass: "fx", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass408-sekpln", rank: 1200, symbol: "SEK/PLN", name: "Swedish Krona / Polish Zloty", assetClass: "fx", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass408-natural-gas", rank: 1201, symbol: "NG=F", name: "Natural Gas Futures", assetClass: "commodity", riskPressure: 56, sparkTone: "watch" }),
    row({ id: "pass408-corn", rank: 1202, symbol: "ZC=F", name: "Corn Futures", assetClass: "commodity", riskPressure: 43, sparkTone: "watch" }),
    row({ id: "pass408-soybean", rank: 1203, symbol: "ZS=F", name: "Soybean Futures", assetClass: "commodity", riskPressure: 41, sparkTone: "watch" }),
    row({ id: "pass408-wheat", rank: 1204, symbol: "ZW=F", name: "Wheat Futures", assetClass: "commodity", riskPressure: 42, sparkTone: "watch" }),
    row({ id: "pass408-rwr", rank: 1205, symbol: "RWR", name: "SPDR Dow Jones REIT ETF", assetClass: "real_estate", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass408-usrt", rank: 1206, symbol: "USRT", name: "iShares Core US REIT ETF", assetClass: "real_estate", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass408-palantir", rank: 1207, symbol: "PLTR", name: "Palantir", assetClass: "stock", riskPressure: 50, sparkTone: "watch" }),
    row({ id: "pass408-crowdstrike", rank: 1208, symbol: "CRWD", name: "CrowdStrike", assetClass: "stock", riskPressure: 46, sparkTone: "watch" }),
    row({ id: "pass408-datadog", rank: 1209, symbol: "DDOG", name: "Datadog", assetClass: "stock", riskPressure: 41, sparkTone: "flat" }),
    row({ id: "pass408-snowflake", rank: 1210, symbol: "SNOW", name: "Snowflake", assetClass: "stock", riskPressure: 45, sparkTone: "watch" }),
    row({ id: "pass408-mongodb", rank: 1211, symbol: "MDB", name: "MongoDB", assetClass: "stock", riskPressure: 44, sparkTone: "watch" }),
    row({ id: "pass408-tradedesk", rank: 1212, symbol: "TTD", name: "The Trade Desk", assetClass: "stock", riskPressure: 42, sparkTone: "watch" }),
    row({ id: "pass408-coupang", rank: 1213, symbol: "CPNG", name: "Coupang", assetClass: "stock", riskPressure: 39, sparkTone: "flat" }),
    row({ id: "pass408-sea", rank: 1214, symbol: "SE", name: "Sea Limited", assetClass: "stock", riskPressure: 47, sparkTone: "watch" }),
    row({ id: "pass408-tsmc", rank: 1215, symbol: "TSM", name: "TSMC", assetClass: "stock", riskPressure: 41, sparkTone: "watch" }),
    row({ id: "pass408-asml", rank: 1216, symbol: "ASML", name: "ASML Holding", assetClass: "stock", riskPressure: 39, sparkTone: "flat" }),
    row({ id: "pass408-kering", rank: 1217, symbol: "KER.PA", name: "Kering", assetClass: "stock", riskPressure: 38, sparkTone: "flat" }),
    row({ id: "pass408-zalando", rank: 1218, symbol: "ZAL.DE", name: "Zalando", assetClass: "stock", riskPressure: 43, sparkTone: "watch" }),
    row({ id: "pass408-eurnok", rank: 1219, symbol: "EUR/NOK", name: "Euro / Norwegian Krone", assetClass: "fx", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass408-usdnok", rank: 1220, symbol: "USD/NOK", name: "Dollar / Norwegian Krone", assetClass: "fx", riskPressure: 38, sparkTone: "flat" }),
    row({ id: "pass408-eursek", rank: 1221, symbol: "EUR/SEK", name: "Euro / Swedish Krona", assetClass: "fx", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass408-usdsek", rank: 1222, symbol: "USD/SEK", name: "Dollar / Swedish Krona", assetClass: "fx", riskPressure: 37, sparkTone: "flat" }),
    row({ id: "pass408-gasoline", rank: 1223, symbol: "RB=F", name: "RBOB Gasoline Futures", assetClass: "commodity", riskPressure: 49, sparkTone: "watch" }),
    row({ id: "pass408-heating-oil", rank: 1224, symbol: "HO=F", name: "Heating Oil Futures", assetClass: "commodity", riskPressure: 48, sparkTone: "watch" }),
    row({ id: "pass408-sugar", rank: 1225, symbol: "SB=F", name: "Sugar Futures", assetClass: "commodity", riskPressure: 40, sparkTone: "flat" }),
    row({ id: "pass408-cocoa", rank: 1226, symbol: "CC=F", name: "Cocoa Futures", assetClass: "commodity", riskPressure: 57, sparkTone: "watch" }),
    row({ id: "pass408-iyr", rank: 1227, symbol: "IYR", name: "iShares US Real Estate ETF", assetClass: "real_estate", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass408-schh", rank: 1228, symbol: "SCHH", name: "Schwab US REIT ETF", assetClass: "real_estate", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass408-servicenow", rank: 1229, symbol: "NOW", name: "ServiceNow", assetClass: "stock", riskPressure: 38, sparkTone: "flat" }),
    row({ id: "pass408-zscaler", rank: 1230, symbol: "ZS", name: "Zscaler", assetClass: "stock", riskPressure: 46, sparkTone: "watch" }),
    row({ id: "pass408-panw", rank: 1231, symbol: "PANW", name: "Palo Alto Networks", assetClass: "stock", riskPressure: 44, sparkTone: "watch" }),
    row({ id: "pass408-okta", rank: 1232, symbol: "OKTA", name: "Okta", assetClass: "stock", riskPressure: 45, sparkTone: "watch" }),
    row({ id: "pass408-atlassian", rank: 1233, symbol: "TEAM", name: "Atlassian", assetClass: "stock", riskPressure: 41, sparkTone: "flat" }),
    row({ id: "pass408-workday", rank: 1234, symbol: "WDAY", name: "Workday", assetClass: "stock", riskPressure: 39, sparkTone: "flat" }),
    row({ id: "pass408-fico", rank: 1235, symbol: "FICO", name: "Fair Isaac", assetClass: "stock", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass408-spglobal", rank: 1236, symbol: "SPGI", name: "S&P Global", assetClass: "stock", riskPressure: 32, sparkTone: "flat" }),
    row({ id: "pass408-msci", rank: 1237, symbol: "MSCI", name: "MSCI", assetClass: "stock", riskPressure: 33, sparkTone: "flat" }),
    row({ id: "pass408-ice", rank: 1238, symbol: "ICE", name: "Intercontinental Exchange", assetClass: "stock", riskPressure: 31, sparkTone: "flat" }),
    row({ id: "pass408-cme", rank: 1239, symbol: "CME", name: "CME Group", assetClass: "stock", riskPressure: 32, sparkTone: "flat" }),
    row({ id: "pass408-aon", rank: 1240, symbol: "AON", name: "Aon", assetClass: "stock", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass408-accenture", rank: 1241, symbol: "ACN", name: "Accenture", assetClass: "stock", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass408-sap", rank: 1242, symbol: "SAP.DE", name: "SAP", assetClass: "stock", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass408-telekom", rank: 1243, symbol: "DTE.DE", name: "Deutsche Telekom", assetClass: "stock", riskPressure: 30, sparkTone: "flat" }),
    row({ id: "pass408-enel", rank: 1244, symbol: "ENEL.MI", name: "Enel", assetClass: "stock", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass408-eon", rank: 1245, symbol: "EON.DE", name: "E.ON", assetClass: "stock", riskPressure: 33, sparkTone: "flat" }),
    row({ id: "pass408-iberdrola", rank: 1246, symbol: "IBE.MC", name: "Iberdrola", assetClass: "stock", riskPressure: 32, sparkTone: "flat" }),
    row({ id: "pass408-nestle", rank: 1247, symbol: "NESN.SW", name: "Nestle", assetClass: "stock", riskPressure: 29, sparkTone: "flat" }),
    row({ id: "pass408-novartis", rank: 1248, symbol: "NOVN.SW", name: "Novartis", assetClass: "stock", riskPressure: 31, sparkTone: "flat" }),
    row({ id: "pass408-roche", rank: 1249, symbol: "ROG.SW", name: "Roche", assetClass: "stock", riskPressure: 31, sparkTone: "flat" }),
    row({ id: "pass408-sony", rank: 1250, symbol: "SONY", name: "Sony", assetClass: "stock", riskPressure: 37, sparkTone: "flat" }),
    row({ id: "pass408-toyota", rank: 1251, symbol: "TM", name: "Toyota", assetClass: "stock", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass408-honda", rank: 1252, symbol: "HMC", name: "Honda", assetClass: "stock", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass408-usdczk", rank: 1253, symbol: "USD/CZK", name: "Dollar / Czech Koruna", assetClass: "fx", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass408-eurczk", rank: 1254, symbol: "EUR/CZK", name: "Euro / Czech Koruna", assetClass: "fx", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass408-usdhuf", rank: 1255, symbol: "USD/HUF", name: "Dollar / Hungarian Forint", assetClass: "fx", riskPressure: 38, sparkTone: "flat" }),
    row({ id: "pass408-eurhuf", rank: 1256, symbol: "EUR/HUF", name: "Euro / Hungarian Forint", assetClass: "fx", riskPressure: 37, sparkTone: "flat" }),
    row({ id: "pass408-silver", rank: 1257, symbol: "SI=F", name: "Silver Futures", assetClass: "commodity", riskPressure: 45, sparkTone: "watch" }),
    row({ id: "pass408-platinum", rank: 1258, symbol: "PL=F", name: "Platinum Futures", assetClass: "commodity", riskPressure: 42, sparkTone: "watch" }),
    row({ id: "pass408-palladium", rank: 1259, symbol: "PA=F", name: "Palladium Futures", assetClass: "commodity", riskPressure: 48, sparkTone: "watch" }),
    row({ id: "pass408-vnq", rank: 1260, symbol: "VNQ", name: "Vanguard Real Estate ETF", assetClass: "real_estate", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass408-xlre", rank: 1261, symbol: "XLRE", name: "Real Estate Select Sector SPDR", assetClass: "real_estate", riskPressure: 33, sparkTone: "flat" }),
  ];
}

export const pass408SecurityOnePageCopy = [
  "Private keys never enter the report; the public layer shows signature boundaries and redaction only.",
  "Provider truth stays separate from AI tone: timestamp, cache age, fallback state, reconnect status and second-source drift remain visible.",
  "Preview, modal and downloaded PDF share one resolved payload; separate random text generation is not allowed.",
  "Internal scoring methods stay withheld; the public surface shows source class, proof lane, redaction and next verification step.",
] as const;

export const pass408ResearchBridge = {
  headline: "Research Lab as exact-payload discipline",
  lanes: ["finite numerical audit", "RNG/entropy testing", "signature boundary education", "replication pack", "falsification queue", "payload parity mirror"],
  publicBoundary: "Velmere Research Lab can describe tests, reductions and hypotheses, but public copy must stay in audit/replication/falsification language until independent review exists.",
} as const;
