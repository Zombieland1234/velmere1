import type { UniversalAssetRow } from "./universal-asset-market-matrix";

export type Pass385Mode = "basic" | "pro" | "advanced";
type VisualPatch = { label: string; glyph: string; primary: string; secondary: string; text?: string; logoUrl?: string };

function row(input: Partial<UniversalAssetRow> & Pick<UniversalAssetRow, "id" | "rank" | "symbol" | "name" | "assetClass" | "riskPressure" | "sparkTone">): UniversalAssetRow {
  const family = input.assetClass === "fx" ? "FX" : input.assetClass === "commodity" ? "commodity" : input.assetClass === "real_estate" ? "real-estate proxy" : input.assetClass === "etf" ? "ETF" : input.assetClass === "exchange_token" ? "exchange-linked" : "equity";
  return {
    sourceRhythm: input.sourceRhythm ?? `${family} provider lane · quote timestamp · cache age · fallback flag · market calendar`,
    priceLane: input.priceLane ?? `${family} Shield-grade candle shell: 1H / 4H / 1D / 1W with OHLCV after provider attach`,
    volumeLane: input.volumeLane ?? `${family} volume, session gap, spread, volatility and second-source drift`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${family} issuer/reference/methodology lane`,
    secondSourceLane: input.secondSourceLane ?? "primary provider ↔ second reference before stronger confidence",
    confidenceFloor: input.confidenceFloor ?? 68,
    adapterState: input.adapterState ?? "provider_required",
    humanCopy: input.humanCopy ?? `${input.symbol} uses the PASS385 production closure contract: real icon, Shield-style chart, provider truth, AI Brain and exact PDF mirror without filler text.`,
    nextAdapterStep: input.nextAdapterStep ?? "Attach live provider key, quote timestamp, OHLCV cache, fallback flag, issuer/reference lane, second source compare and locale-locked report object.",
    ...input,
  };
}

export const pass385ProductionClosureContract = {
  version: "PASS385.production_closure_brain",
  publicRule: "The page should feel like one clean product: search, table, chart modal, AI Brain and PDF mirror. Historical implementation panels stay hidden from the customer surface.",
  marketRule: "Every real-market instrument follows the same Shield contract: logo/glyph, candles, timeframe, provider truth, source freshness, Basic/Pro/Advanced and VLM Brain.",
  pdfRule: "Browser preview, modal preview and binary PDF must read the same resolved report object, in the selected locale, with the same sections and no duplicate generator.",
  brainRule: "The brain shows a neural collection animation first, then transforms into a readable field deck: 10 fields for Basic, 14 for Pro and 20 for Advanced.",
  securityRule: "Public security copy stays short: private keys stay private, signatures prove control, entropy quality is measured and reports are redacted.",
  researchRule: "Prime/Riemann content is positioned as numerical audit, falsification and replication, while the deterministic/ontology story remains a visual research narrative.",
} as const;

export const pass385ProviderClosureDeck = [
  { id: "quote", label: "Quote truth", state: "timestamp-first", copy: "Live wording requires quote time, cache age and fallback flag. Preview data is labelled as preview." },
  { id: "candles", label: "Candle parity", state: "Shield 1:1", copy: "Crypto, stock, FX, ETF, commodity and real-estate proxies use the same candle modal grammar." },
  { id: "issuer", label: "Issuer / reference", state: "mapped", copy: "Equities connect to filings; FX, commodities and proxies connect to reference methodology." },
  { id: "second", label: "Second source", state: "required", copy: "Confidence rises only after a second venue, filing or reference source supports the reading." },
  { id: "brain", label: "AI Brain", state: "10/14/20", copy: "Mode changes depth, not the source of truth. Basic is quick, Pro is contextual, Advanced is full audit." },
  { id: "pdf", label: "PDF mirror", state: "same object", copy: "Preview and download render the same locale-locked report object with no random filler." },
] as const;

export const pass385BrainPhases = [
  { id: "identity", label: "Identity seal", seconds: 0.8, copy: "Symbol, market class, locale and visual mark lock first." },
  { id: "provider", label: "Provider lock", seconds: 1.0, copy: "Timestamp, OHLCV, cache age and fallback state decide confidence." },
  { id: "chart", label: "Candle forge", seconds: 1.2, copy: "The Shield-style candle surface renders before the AI readout." },
  { id: "flow", label: "Neural flow", seconds: 1.6, copy: "Provider, liquidity, issuer, macro and second source travel into the VLM core." },
  { id: "security", label: "Security bridge", seconds: 1.1, copy: "Signature proof, private-key boundary, entropy quality and redaction are translated plainly." },
  { id: "prime", label: "Prime Lab", seconds: 1.2, copy: "Numerical audit, zeta resonance and falsification are shown as research, not a theorem claim." },
  { id: "readout", label: "Readout field", seconds: 1.4, copy: "The field deck replaces debug cards with useful short information." },
  { id: "mirror", label: "PDF mirror", seconds: 0.8, copy: "The same object renders preview, modal and downloaded PDF." },
] as const;

const fields = [
  { id: "identity", label: "Identity", value: "locked", copy: "Name, symbol, family and visual mark are resolved once." },
  { id: "locale", label: "Language", value: "PL/EN/DE", copy: "The selected page language controls modal and PDF copy." },
  { id: "chart", label: "Chart", value: "Shield-style", copy: "The modal uses the same candle grammar as Shield." },
  { id: "provider", label: "Provider", value: "timestamp-first", copy: "No strong live language without quote time and cache age." },
  { id: "fallback", label: "Fallback", value: "visible", copy: "Preview, stale and provider-required states are labelled." },
  { id: "second", label: "Second source", value: "compare", copy: "A second source is required before confidence rises." },
  { id: "risk", label: "Risk", value: "human", copy: "Risk explains uncertainty; it does not command action." },
  { id: "liquidity", label: "Liquidity", value: "separate", copy: "Volume, depth and spread stay separate from social hype." },
  { id: "issuer", label: "Issuer/ref", value: "mapped", copy: "Stocks, FX, commodities and proxies use the right reference lane." },
  { id: "pdf", label: "PDF", value: "same object", copy: "Preview and download cannot create different text." },
  { id: "security", label: "Security", value: "plain", copy: "Private key boundary, signature proof and redaction stay simple." },
  { id: "entropy", label: "Entropy", value: "measured", copy: "RNG/TRNG is shown as quality of randomness, not wallet instructions." },
  { id: "ecc", label: "ECC/BTC", value: "conceptual", copy: "Signing is explained without exposing or generating keys." },
  { id: "prime", label: "Prime Lab", value: "audit", copy: "Bajak Protocol is benchmark, falsification and replication." },
  { id: "macro", label: "Macro", value: "context", copy: "FX, rates, commodities and real estate are context lanes." },
  { id: "session", label: "Session", value: "calendar", copy: "Market hours and reference dates stay visible." },
  { id: "copy", label: "AI copy", value: "specific", copy: "Repeated filler is treated as a bug." },
  { id: "operator", label: "Operator", value: "hidden", copy: "Sensitive thresholds and payloads stay private." },
  { id: "launch", label: "Launch", value: "clean", copy: "Only one customer-facing surface stays visible." },
  { id: "proof", label: "Proof", value: "redacted", copy: "The user sees sources, gaps and result; not hidden rules." },
] as const;

export function buildPass385ProductionClosureReadout(input: { symbol: string; name: string; type: string; risk: number; source: string; mode: Pass385Mode }) {
  const count = input.mode === "advanced" ? 20 : input.mode === "pro" ? 14 : 10;
  const seconds = pass385BrainPhases.reduce((sum, phase) => sum + phase.seconds, 0) + (input.mode === "advanced" ? 2.4 : input.mode === "pro" ? 1.2 : 0.5);
  const band = input.risk >= 62 ? "operator-review" : input.risk >= 42 ? "provider-watch" : "clean-preview";
  return {
    version: "PASS385.production_closure_readout",
    count,
    seconds: Number(seconds.toFixed(1)),
    band,
    headline: `${input.symbol} przechodzi jedną ścieżkę Velmère: provider truth, wykres Shield, VLM Brain, Security bridge, Prime Lab boundary i PDF mirror.`,
    body: `${input.name} (${input.type}) zwraca ${count} krótkich pól. Source lane: ${input.source}. Jeżeli brakuje providera lub drugiego źródła, AI obniża pewność zamiast pisać losowy filler.`,
    fields: fields.slice(0, count),
  };
}

export const pass385AssetVisualPatch: Record<string, VisualPatch> = {
  BLK: { label: "BlackRock", glyph: "BR", primary: "#111827", secondary: "#d1d5db" },
  BX: { label: "Blackstone", glyph: "BX", primary: "#0f172a", secondary: "#94a3b8" },
  TROW: { label: "T. Rowe Price", glyph: "TR", primary: "#1e3a8a", secondary: "#dbeafe", text: "#0f172a" },
  APO: { label: "Apollo", glyph: "AP", primary: "#111827", secondary: "#f59e0b" },
  KKR: { label: "KKR", glyph: "KK", primary: "#111827", secondary: "#60a5fa" },
  TEAM: { label: "Atlassian", glyph: "AT", primary: "#0052cc", secondary: "#061b3a" },
  ZS: { label: "Zscaler", glyph: "ZS", primary: "#0099ff", secondary: "#062033" },
  OKTA: { label: "Okta", glyph: "OK", primary: "#00297a", secondary: "#e5f0ff", text: "#061438" },
  MDB: { label: "MongoDB", glyph: "MG", primary: "#13aa52", secondary: "#082f1a" },
  NOW: { label: "ServiceNow", glyph: "NW", primary: "#86ed78", secondary: "#0a2b12", text: "#071107" },
  "AUD/NZD": { label: "Aussie Kiwi", glyph: "AN", primary: "#012169", secondary: "#00247d" },
  "EUR/CAD": { label: "Euro Loonie", glyph: "EC", primary: "#225eea", secondary: "#d80621" },
  "GBP/CAD": { label: "Pound Loonie", glyph: "GC", primary: "#012169", secondary: "#d80621" },
  "CHF/JPY": { label: "Franc Yen", glyph: "F¥", primary: "#d52b1e", secondary: "#bc002d" },
  "PLN/JPY": { label: "Zloty Yen", glyph: "Z¥", primary: "#dc143c", secondary: "#bc002d" },
  XME: { label: "Metals ETF", glyph: "XM", primary: "#64748b", secondary: "#111827" },
  XLE: { label: "Energy ETF", glyph: "XE", primary: "#14532d", secondary: "#052e16" },
  XLF: { label: "Financials ETF", glyph: "XF", primary: "#1d4ed8", secondary: "#081d48" },
  XLK: { label: "Technology ETF", glyph: "XK", primary: "#2563eb", secondary: "#061637" },
  WOOD: { label: "Timber ETF", glyph: "WD", primary: "#854d0e", secondary: "#1c1208" },
  ALUMINUM: { label: "Aluminum", glyph: "Al", primary: "#cbd5e1", secondary: "#334155", text: "#0f172a" },
  ZINC: { label: "Zinc", glyph: "Zn", primary: "#94a3b8", secondary: "#1e293b" },
  LEAD: { label: "Lead", glyph: "Pb", primary: "#64748b", secondary: "#0f172a" },
  TIN: { label: "Tin", glyph: "Sn", primary: "#cbd5e1", secondary: "#334155", text: "#0f172a" },
  "RETAIL-REIT": { label: "Retail REIT", glyph: "RR", primary: "#d8b36a", secondary: "#23150a" },
  "INDUSTRIAL-REIT": { label: "Industrial REIT", glyph: "IR", primary: "#b99d72", secondary: "#211407" },
  "HEALTHCARE-REIT": { label: "Healthcare REIT", glyph: "HR", primary: "#38bdf8", secondary: "#082f49" },
  "HOTEL-REIT": { label: "Hotel REIT", glyph: "HT", primary: "#f59e0b", secondary: "#231507" },
};

export const pass385PseudoPricePatch: Record<string, string> = {
  BLK: "$1,109", BX: "$173.40", TROW: "$118.60", APO: "$113.80", KKR: "$128.20", TEAM: "$168.90", ZS: "$298.40", OKTA: "$96.20", MDB: "$355.80", NOW: "$884.50",
  "AUD/NZD": "1.0840", "EUR/CAD": "1.5980", "GBP/CAD": "1.8380", "CHF/JPY": "192.20", "PLN/JPY": "42.10",
  XME: "$74.30", XLE: "$84.80", XLF: "$53.20", XLK: "$281.70", WOOD: "$83.60", ALUMINUM: "$2,580", ZINC: "$3,090", LEAD: "$1,980", TIN: "$34,100", "RETAIL-REIT": "proxy", "INDUSTRIAL-REIT": "proxy", "HEALTHCARE-REIT": "proxy", "HOTEL-REIT": "proxy",
};

export const pass385SecurityOnePageCopy = [
  "Klucz prywatny zostaje prywatny. Velmère publicznie pokazuje tylko zasadę kontroli, podpisu i redakcji raportu.",
  "Źródła rynkowe są timestamp-first: quote time, cache age, OHLCV, fallback i second source zanim UI brzmi pewniej.",
  "Entropia/RNG to jakość losowości i walidacja źródła, nie instrukcja tworzenia portfela ani odzyskiwania sekretów.",
  "Raport dla ludzi pokazuje wynik, źródła i braki. Operatorowe progi, payloady i reguły bezpieczeństwa zostają prywatne.",
] as const;

export const pass385ResearchStory = [
  { id: "banks", label: "Banki", copy: "Banki opierają zaufanie na kontrolach: sesja, podpis, limit, log, audyt i wykrywanie nadużyć." },
  { id: "ecc", label: "ECC / BTC", copy: "Podpis potwierdza kontrolę klucza bez ujawniania sekretu; to edukacja koncepcyjna, nie instrukcja operacyjna." },
  { id: "entropy", label: "Real RNG", copy: "Losowość ma źródło fizyczne, ale w produkcji liczy się pomiar entropii, health testy i dokumentacja." },
  { id: "prime", label: "Liczby pierwsze", copy: "Prime Lab wyjaśnia, dlaczego rozkład liczb pierwszych jest ważny dla kryptografii i audytu matematycznego." },
  { id: "bajak", label: "Bajak Protocol", copy: "Publiczna rama: finite numerical reconstruction, benchmark, negative controls, falsyfikacja i niezależna replikacja." },
  { id: "determinism", label: "Determinism animation", copy: "Animacja prowadzi: noise field → zeta resonance → correction lane → falsification gate → human readout." },
] as const;

const expansion: UniversalAssetRow[] = [
  row({ id: "blk", rank: 950, symbol: "BLK", name: "BlackRock", assetClass: "stock", riskPressure: 29, sparkTone: "flat" }),
  row({ id: "bx", rank: 951, symbol: "BX", name: "Blackstone", assetClass: "stock", riskPressure: 39, sparkTone: "watch" }),
  row({ id: "trow", rank: 952, symbol: "TROW", name: "T. Rowe Price", assetClass: "stock", riskPressure: 33, sparkTone: "flat" }),
  row({ id: "apo", rank: 953, symbol: "APO", name: "Apollo Global Management", assetClass: "stock", riskPressure: 38, sparkTone: "watch" }),
  row({ id: "kkr", rank: 954, symbol: "KKR", name: "KKR", assetClass: "stock", riskPressure: 37, sparkTone: "watch" }),
  row({ id: "team", rank: 955, symbol: "TEAM", name: "Atlassian", assetClass: "stock", riskPressure: 43, sparkTone: "watch" }),
  row({ id: "zs", rank: 956, symbol: "ZS", name: "Zscaler", assetClass: "stock", riskPressure: 47, sparkTone: "watch" }),
  row({ id: "okta", rank: 957, symbol: "OKTA", name: "Okta", assetClass: "stock", riskPressure: 41, sparkTone: "watch" }),
  row({ id: "mdb", rank: 958, symbol: "MDB", name: "MongoDB", assetClass: "stock", riskPressure: 44, sparkTone: "watch" }),
  row({ id: "now", rank: 959, symbol: "NOW", name: "ServiceNow", assetClass: "stock", riskPressure: 34, sparkTone: "flat" }),
  row({ id: "aud-nzd", rank: 960, symbol: "AUD/NZD", name: "Australian Dollar / New Zealand Dollar", assetClass: "fx", riskPressure: 32, sparkTone: "flat" }),
  row({ id: "eur-cad", rank: 961, symbol: "EUR/CAD", name: "Euro / Canadian Dollar", assetClass: "fx", riskPressure: 34, sparkTone: "flat" }),
  row({ id: "gbp-cad", rank: 962, symbol: "GBP/CAD", name: "Pound / Canadian Dollar", assetClass: "fx", riskPressure: 39, sparkTone: "watch" }),
  row({ id: "chf-jpy", rank: 963, symbol: "CHF/JPY", name: "Swiss Franc / Japanese Yen", assetClass: "fx", riskPressure: 41, sparkTone: "watch" }),
  row({ id: "pln-jpy", rank: 964, symbol: "PLN/JPY", name: "Polish Zloty / Japanese Yen", assetClass: "fx", riskPressure: 37, sparkTone: "watch" }),
  row({ id: "xme", rank: 965, symbol: "XME", name: "Metals and Mining ETF", assetClass: "etf", riskPressure: 42, sparkTone: "watch" }),
  row({ id: "xle", rank: 966, symbol: "XLE", name: "Energy Select Sector ETF", assetClass: "etf", riskPressure: 38, sparkTone: "watch" }),
  row({ id: "xlf", rank: 967, symbol: "XLF", name: "Financials Select Sector ETF", assetClass: "etf", riskPressure: 32, sparkTone: "flat" }),
  row({ id: "xlk", rank: 968, symbol: "XLK", name: "Technology Select Sector ETF", assetClass: "etf", riskPressure: 36, sparkTone: "watch" }),
  row({ id: "wood", rank: 969, symbol: "WOOD", name: "Timber and forestry ETF", assetClass: "etf", riskPressure: 35, sparkTone: "flat" }),
  row({ id: "aluminum", rank: 970, symbol: "ALUMINUM", name: "Aluminum proxy", assetClass: "commodity", riskPressure: 44, sparkTone: "watch" }),
  row({ id: "zinc", rank: 971, symbol: "ZINC", name: "Zinc proxy", assetClass: "commodity", riskPressure: 43, sparkTone: "watch" }),
  row({ id: "lead", rank: 972, symbol: "LEAD", name: "Lead proxy", assetClass: "commodity", riskPressure: 40, sparkTone: "watch" }),
  row({ id: "tin", rank: 973, symbol: "TIN", name: "Tin proxy", assetClass: "commodity", riskPressure: 45, sparkTone: "watch" }),
  row({ id: "retail-reit", rank: 974, symbol: "RETAIL-REIT", name: "Retail REIT proxy", assetClass: "real_estate", riskPressure: 42, sparkTone: "watch" }),
  row({ id: "industrial-reit", rank: 975, symbol: "INDUSTRIAL-REIT", name: "Industrial REIT proxy", assetClass: "real_estate", riskPressure: 35, sparkTone: "flat" }),
  row({ id: "healthcare-reit", rank: 976, symbol: "HEALTHCARE-REIT", name: "Healthcare REIT proxy", assetClass: "real_estate", riskPressure: 34, sparkTone: "flat" }),
  row({ id: "hotel-reit", rank: 977, symbol: "HOTEL-REIT", name: "Hotel REIT proxy", assetClass: "real_estate", riskPressure: 47, sparkTone: "watch" }),
];

export function buildPass385MarketCoverageUniverse() {
  return expansion;
}
