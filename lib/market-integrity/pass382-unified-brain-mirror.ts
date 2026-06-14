import type { UniversalAssetRow } from "./universal-asset-market-matrix";

export type Pass382Mode = "basic" | "pro" | "advanced";

type VisualPatch = { label: string; glyph: string; primary: string; secondary: string; text?: string };

function marketRow(input: Partial<UniversalAssetRow> & Pick<UniversalAssetRow, "id" | "rank" | "symbol" | "name" | "assetClass" | "riskPressure" | "sparkTone">): UniversalAssetRow {
  const family = input.assetClass === "fx" ? "FX" : input.assetClass === "commodity" ? "commodity" : input.assetClass === "real_estate" ? "real-estate proxy" : input.assetClass === "etf" ? "ETF" : input.assetClass === "exchange_token" ? "exchange-linked asset" : "equity";
  return {
    sourceRhythm: input.sourceRhythm ?? `${family} live/provider lane · timestamp · session calendar · cache age · fallback flag`,
    priceLane: input.priceLane ?? `${family} Shield-grade candle contract: 1H / 4H / 1D / 1W with provider-ready OHLCV`,
    volumeLane: input.volumeLane ?? `${family} volume, spread, session gap, volatility and second-source drift rail`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${family} issuer/reference/methodology disclosure lane`,
    secondSourceLane: input.secondSourceLane ?? "primary provider ↔ second provider/reference before high confidence",
    confidenceFloor: input.confidenceFloor ?? 64,
    adapterState: input.adapterState ?? "provider_required",
    humanCopy: input.humanCopy ?? `${input.symbol} is PASS382-ready for a Shield-mirrored Real Markets screen: logo, candle chart, Basic/Pro/Advanced brain, public-safe security bridge and exact PDF mirror.`,
    nextAdapterStep: input.nextAdapterStep ?? "Attach provider key, live quote timestamp, OHLCV cache, issuer/reference lane, fallback flag, second-source compare, locale report object and PDF mirror field.",
    ...input,
  };
}

export const pass382UnifiedBrainMirrorContract = {
  version: "PASS382.unified_brain_mirror_contract",
  marketRule: "Real Markets mirrors Shield: every instrument gets one visual card, candle modal, timeframe state, Basic/Pro/Advanced AI Brain and PDF mirror. Broad catalog coverage never pretends to be live coverage.",
  aiRule: "One resolved report object powers Shield, Browser preview, PDF download and Real Markets. AI copy must be asset-specific, concise, locale-locked and free from repeated filler.",
  chartRule: "Candles stay identical in layout for crypto, equities, FX, ETFs, commodities and real-estate proxies; provider freshness controls confidence, not visual polish.",
  securityRule: "Security copy explains banks, ECC signatures, entropy/RNG and redaction as public education; it never exposes secrets, seed phrases or operational internals.",
  researchRule: "Prime/Riemann/Bajak content is framed as numerical audit, falsification and replication until independent mathematical proof exists.",
  pdfRule: "Preview and downloaded PDF share the same pages, same language and same field order; no second generator may create different text.",
} as const;

export const pass382ProviderControlDeck = [
  { id: "source-clock", label: "Source clock", cadence: "live/timestamp", boundary: "Fresh confidence waits for provider id, quote time, cache age and fallback state." },
  { id: "equity-filings", label: "Equity filings", cadence: "issuer events", boundary: "Stocks require issuer/company facts or disclosure context before strong public wording." },
  { id: "fx-reference", label: "FX reference", cadence: "session + reference", boundary: "FX pairs show rate context and source cadence; no transaction-price certainty without provider lane." },
  { id: "commodity-method", label: "Commodity method", cadence: "spot/futures method", boundary: "Gold, oil and agriculture require methodology labels and second-reference compare." },
  { id: "exchange-health", label: "Exchange health", cadence: "venue heartbeat", boundary: "Depth, withdrawals, reserves, API stability and social stress stay separate fields." },
  { id: "pdf-mirror", label: "PDF mirror", cadence: "same object", boundary: "The report object cannot fork between on-screen preview and download." },
  { id: "security-education", label: "Security education", cadence: "public-safe", boundary: "ECC, private keys and entropy are explained conceptually without wallet-generation instructions." },
  { id: "research-boundary", label: "Research boundary", cadence: "replication", boundary: "Bajak Protocol stays a reproducible numerical audit with caveats, not a theorem claim." },
] as const;

export const pass382BrainPhases = [
  { id: "intake", label: "Identity intake", seconds: 0.8, copy: "Asset, language, class and visual identity lock before any output." },
  { id: "provider", label: "Provider truth", seconds: 1.1, copy: "Timestamp, cache age, OHLCV and fallback flags decide live confidence." },
  { id: "chart", label: "Shield chart mirror", seconds: 1.1, copy: "The same candle/timeframe grammar appears in Real Markets and Shield." },
  { id: "brain", label: "Neural audit core", seconds: 1.6, copy: "Source, liquidity, issuer, macro and second-source lanes flow through one VLM core." },
  { id: "security", label: "Security explainer", seconds: 1.0, copy: "Bank controls, signatures, entropy and redaction are translated into human language." },
  { id: "research", label: "Prime research lane", seconds: 1.2, copy: "Prime-number research is shown as tests, benchmark, caveat and next replication step." },
  { id: "readout", label: "Human readout", seconds: 1.6, copy: "The brain returns 10, 14 or 20 useful fields, not a wall of debug copy." },
  { id: "pdf", label: "PDF mirror seal", seconds: 0.9, copy: "Preview and download receive the same locale-locked pages and field order." },
] as const;

const pass382Fields = [
  { id: "identity", label: "Identity", value: "locked", copy: "Symbol, market family and visual mark are resolved once." },
  { id: "language", label: "Language", value: "locale-locked", copy: "PL/EN/DE controls modal, preview and PDF download." },
  { id: "chart", label: "Chart", value: "Shield mirror", copy: "Every real-market instrument uses the same candle shell as Shield." },
  { id: "provider", label: "Provider", value: "timestamp-first", copy: "No live wording without provider id, quote time and cache age." },
  { id: "fallback", label: "Fallback", value: "visible", copy: "Cached or preview data is labelled instead of hidden." },
  { id: "second", label: "Second source", value: "required", copy: "Higher confidence waits for a second source/reference lane." },
  { id: "liquidity", label: "Liquidity", value: "separate", copy: "Depth, volume and spread stay separate from hype or social pressure." },
  { id: "issuer", label: "Issuer/ref", value: "mapped", copy: "Stocks map to issuer filings; FX/commodities map to reference methodology." },
  { id: "risk", label: "Risk", value: "review", copy: "Risk labels explain uncertainty without buy/sell commands." },
  { id: "brain", label: "VLM Brain", value: "one core", copy: "Basic/Pro/Advanced output comes from one report object." },
  { id: "bank", label: "Bank controls", value: "explained", copy: "Limits, approvals, logs and audits make security understandable." },
  { id: "ecc", label: "ECC/BTC", value: "conceptual", copy: "Signatures prove control without revealing private keys." },
  { id: "entropy", label: "Real RNG", value: "measured", copy: "Entropy quality is a measured source property, not a marketing phrase." },
  { id: "redaction", label: "Redaction", value: "public-safe", copy: "Public reports hide operational rules and sensitive internals." },
  { id: "prime", label: "Prime Lab", value: "audit", copy: "Prime work is shown as numerical reconstruction and falsification." },
  { id: "determinism", label: "Determinism", value: "research", copy: "The animation shows noise-to-order as hypothesis and test pipeline." },
  { id: "pdf", label: "PDF", value: "same pages", copy: "The downloaded PDF mirrors preview structure and language." },
  { id: "copy", label: "AI copy", value: "specific", copy: "Repeated generic sentences are treated as a blocker." },
  { id: "operator", label: "Operator rules", value: "hidden", copy: "Internal thresholds stay behind the public surface." },
  { id: "launch", label: "Launch", value: "fidelity", copy: "Clean UI, provider truth and exact PDF parity remain launch criteria." },
] as const;

export function buildPass382UnifiedReadout(input: { symbol: string; name: string; type: string; risk: number; source: string; mode: Pass382Mode }) {
  const count = input.mode === "advanced" ? 20 : input.mode === "pro" ? 14 : 10;
  const seconds = pass382BrainPhases.reduce((sum, phase) => sum + phase.seconds, 0) + (input.mode === "advanced" ? 2.4 : input.mode === "pro" ? 1.1 : 0.4);
  const band = input.risk >= 60 ? "operator-review" : input.risk >= 43 ? "provider-watch" : "launch-ready-preview";
  return {
    version: "PASS382.unified_brain_mirror_readout",
    count,
    seconds: Number(seconds.toFixed(1)),
    band,
    headline: `${input.symbol} uses one mirrored Velmère path: identity, provider truth, Shield-grade chart, security explainer, prime-lab boundary and PDF parity.`,
    body: `${input.name} (${input.type}) returns ${count} human fields. Source lane: ${input.source}. Missing provider evidence reduces confidence instead of generating filler text.`,
    fields: pass382Fields.slice(0, count),
  };
}

export const pass382PdfMirror = {
  title: "PASS382 · Unified brain mirror",
  rule: "The same resolved report object renders Browser preview, Real Markets modal and downloaded PDF in PL/EN/DE.",
  pages: ["market identity", "provider truth", "Shield chart", "AI Brain readout", "security explainer", "prime research boundary"],
  noFork: "No separate PDF copy engine may invent random or repeated sections after preview approval.",
} as const;

export const pass382SecurityCopy = [
  "Velmère explains security as layers: private key stays private, signature proves control, session limits reduce abuse, and public reports are redacted.",
  "Real RNG/TRNG is explained as a validated entropy source. The product teaches the concept and never asks for seed phrases or private keys.",
  "Banks and crypto share the same human idea: controls, approvals, signatures, logs and audit trails reduce blind trust.",
] as const;

export const pass382MarketExpansion: UniversalAssetRow[] = [
  marketRow({ id: "pass382-pnc", rank: 531, symbol: "PNC", name: "PNC Financial", assetClass: "stock", riskPressure: 33, sparkTone: "flat", proofOrDisclosureLane: "SEC company facts + bank disclosure lane" }),
  marketRow({ id: "pass382-tfc", rank: 532, symbol: "TFC", name: "Truist Financial", assetClass: "stock", riskPressure: 39, sparkTone: "watch", proofOrDisclosureLane: "SEC company facts + bank disclosure lane" }),
  marketRow({ id: "pass382-usb", rank: 533, symbol: "USB", name: "U.S. Bancorp", assetClass: "stock", riskPressure: 36, sparkTone: "flat", proofOrDisclosureLane: "SEC company facts + bank disclosure lane" }),
  marketRow({ id: "pass382-mco", rank: 534, symbol: "MCO", name: "Moody's", assetClass: "stock", riskPressure: 29, sparkTone: "flat", proofOrDisclosureLane: "SEC filings + ratings-cycle context" }),
  marketRow({ id: "pass382-spgi", rank: 535, symbol: "SPGI", name: "S&P Global", assetClass: "stock", riskPressure: 28, sparkTone: "flat", proofOrDisclosureLane: "SEC filings + index/data-provider context" }),
  marketRow({ id: "pass382-msci", rank: 536, symbol: "MSCI", name: "MSCI", assetClass: "stock", riskPressure: 31, sparkTone: "flat", proofOrDisclosureLane: "SEC filings + index methodology context" }),
  marketRow({ id: "pass382-fico", rank: 537, symbol: "FICO", name: "Fair Isaac", assetClass: "stock", riskPressure: 34, sparkTone: "flat", proofOrDisclosureLane: "SEC filings + credit-scoring context" }),
  marketRow({ id: "pass382-sap", rank: 538, symbol: "SAP", name: "SAP", assetClass: "stock", riskPressure: 30, sparkTone: "flat", proofOrDisclosureLane: "EU issuer disclosure lane" }),
  marketRow({ id: "pass382-asml-na", rank: 539, symbol: "ASML.AS", name: "ASML Amsterdam", assetClass: "stock", riskPressure: 36, sparkTone: "watch", proofOrDisclosureLane: "EU issuer disclosure + semiconductor cycle lane" }),
  marketRow({ id: "pass382-novob", rank: 540, symbol: "NOVO-B.CO", name: "Novo Nordisk B", assetClass: "stock", riskPressure: 33, sparkTone: "flat", proofOrDisclosureLane: "EU issuer disclosure + healthcare sector lane" }),
  marketRow({ id: "pass382-nok", rank: 541, symbol: "NOKIA.HE", name: "Nokia", assetClass: "stock", riskPressure: 41, sparkTone: "watch", proofOrDisclosureLane: "EU issuer disclosure + telecom sector lane" }),
  marketRow({ id: "pass382-shopify", rank: 542, symbol: "SHOP", name: "Shopify", assetClass: "stock", riskPressure: 43, sparkTone: "watch", proofOrDisclosureLane: "issuer filing + commerce-infra lane" }),
  marketRow({ id: "pass382-se", rank: 543, symbol: "SE", name: "Sea Limited", assetClass: "stock", riskPressure: 52, sparkTone: "watch", proofOrDisclosureLane: "issuer filing + ecommerce/fintech lane", confidenceFloor: 55 }),
  marketRow({ id: "pass382-meli", rank: 544, symbol: "MELI", name: "MercadoLibre", assetClass: "stock", riskPressure: 45, sparkTone: "watch", proofOrDisclosureLane: "issuer filing + commerce/fintech lane" }),
  marketRow({ id: "pass382-usd-chf", rank: 545, symbol: "USD/CHF", name: "Dollar / Swiss Franc", assetClass: "fx", riskPressure: 32, sparkTone: "flat", proofOrDisclosureLane: "FX provider + reference calendar lane" }),
  marketRow({ id: "pass382-eur-gbp", rank: 546, symbol: "EUR/GBP", name: "Euro / Pound", assetClass: "fx", riskPressure: 31, sparkTone: "flat", proofOrDisclosureLane: "FX provider + reference calendar lane" }),
  marketRow({ id: "pass382-nzd-usd", rank: 547, symbol: "NZD/USD", name: "New Zealand Dollar / US Dollar", assetClass: "fx", riskPressure: 39, sparkTone: "watch", proofOrDisclosureLane: "FX provider + session volatility lane" }),
  marketRow({ id: "pass382-usd-mxn", rank: 548, symbol: "USD/MXN", name: "Dollar / Mexican Peso", assetClass: "fx", riskPressure: 45, sparkTone: "watch", proofOrDisclosureLane: "FX provider + EM macro lane", confidenceFloor: 56 }),
  marketRow({ id: "pass382-eur-nok", rank: 549, symbol: "EUR/NOK", name: "Euro / Norwegian Krone", assetClass: "fx", riskPressure: 42, sparkTone: "watch", proofOrDisclosureLane: "FX provider + energy sensitivity lane" }),
  marketRow({ id: "pass382-jpy-index", rank: 550, symbol: "JPY-BASKET", name: "Yen basket proxy", assetClass: "fx", riskPressure: 46, sparkTone: "watch", proofOrDisclosureLane: "FX basket methodology lane", confidenceFloor: 53 }),
  marketRow({ id: "pass382-efa", rank: 551, symbol: "EFA", name: "iShares MSCI EAFE ETF", assetClass: "etf", riskPressure: 32, sparkTone: "flat", proofOrDisclosureLane: "ETF holdings/provider lane" }),
  marketRow({ id: "pass382-ief", rank: 552, symbol: "IEF", name: "7-10 Year Treasury ETF", assetClass: "etf", riskPressure: 35, sparkTone: "flat", proofOrDisclosureLane: "ETF holdings + rate sensitivity lane" }),
  marketRow({ id: "pass382-tlt", rank: 553, symbol: "TLT", name: "20+ Year Treasury ETF", assetClass: "etf", riskPressure: 48, sparkTone: "watch", proofOrDisclosureLane: "ETF holdings + duration risk lane" }),
  marketRow({ id: "pass382-uso", rank: 554, symbol: "USO", name: "Oil ETF proxy", assetClass: "etf", riskPressure: 54, sparkTone: "watch", proofOrDisclosureLane: "ETF/futures methodology lane" }),
  marketRow({ id: "pass382-ung", rank: 555, symbol: "UNG", name: "Natural Gas ETF proxy", assetClass: "etf", riskPressure: 61, sparkTone: "watch", proofOrDisclosureLane: "ETF/futures methodology lane", confidenceFloor: 50 }),
  marketRow({ id: "pass382-copper", rank: 556, symbol: "COPPER", name: "Copper", assetClass: "commodity", riskPressure: 47, sparkTone: "watch", proofOrDisclosureLane: "commodity spot/futures methodology lane" }),
  marketRow({ id: "pass382-uranium", rank: 557, symbol: "URANIUM", name: "Uranium proxy", assetClass: "commodity", riskPressure: 58, sparkTone: "watch", proofOrDisclosureLane: "commodity proxy methodology lane", confidenceFloor: 50 }),
  marketRow({ id: "pass382-wheat", rank: 558, symbol: "WHEAT", name: "Wheat futures proxy", assetClass: "commodity", riskPressure: 50, sparkTone: "watch", proofOrDisclosureLane: "agriculture futures methodology lane" }),
  marketRow({ id: "pass382-corn", rank: 559, symbol: "CORN", name: "Corn futures proxy", assetClass: "commodity", riskPressure: 47, sparkTone: "watch", proofOrDisclosureLane: "agriculture futures methodology lane" }),
  marketRow({ id: "pass382-global-housing", rank: 560, symbol: "HOUSING-GLOBAL", name: "Global housing macro proxy", assetClass: "real_estate", riskPressure: 44, sparkTone: "watch", adapterState: "slow_macro", proofOrDisclosureLane: "housing index + REIT basket lane" }),
  marketRow({ id: "pass382-mortgage-rate", rank: 561, symbol: "MORTGAGE-RATE", name: "Mortgage rate proxy", assetClass: "real_estate", riskPressure: 51, sparkTone: "watch", adapterState: "slow_macro", proofOrDisclosureLane: "rate series + housing affordability lane" }),
  marketRow({ id: "pass382-office-reit", rank: 562, symbol: "OFFICE-REIT", name: "Office REIT proxy", assetClass: "real_estate", riskPressure: 58, sparkTone: "watch", adapterState: "slow_macro", proofOrDisclosureLane: "office REIT + credit stress lane", confidenceFloor: 49 }),
  marketRow({ id: "pass382-industrial-reit", rank: 563, symbol: "INDUSTRIAL-REIT", name: "Industrial REIT proxy", assetClass: "real_estate", riskPressure: 39, sparkTone: "flat", adapterState: "slow_macro", proofOrDisclosureLane: "industrial REIT + logistics lane" }),
];

export const pass382AssetVisualPatch: Record<string, VisualPatch> = {
  PNC: { label: "PNC", glyph: "PN", primary: "#f58025", secondary: "#102a43" }, TFC: { label: "Truist", glyph: "TF", primary: "#2e1a47", secondary: "#c7a7ff" }, USB: { label: "US Bancorp", glyph: "US", primary: "#d71920", secondary: "#111827" }, MCO: { label: "Moody's", glyph: "Mo", primary: "#1d4e89", secondary: "#d8b36a" }, SPGI: { label: "S&P Global", glyph: "SG", primary: "#0f5daa", secondary: "#071728" }, MSCI: { label: "MSCI", glyph: "MI", primary: "#004b8d", secondary: "#071728" }, FICO: { label: "FICO", glyph: "FI", primary: "#1a4b7a", secondary: "#d8b36a" }, SAP: { label: "SAP", glyph: "SA", primary: "#0faaff", secondary: "#061728" }, "ASML.AS": { label: "ASML Amsterdam", glyph: "AS", primary: "#003c78", secondary: "#ff6b00" }, "NOVO-B.CO": { label: "Novo Nordisk", glyph: "NO", primary: "#0033a0", secondary: "#d8b36a" }, "NOKIA.HE": { label: "Nokia", glyph: "NK", primary: "#124191", secondary: "#071728" }, SHOP: { label: "Shopify", glyph: "SH", primary: "#95bf47", secondary: "#071b05", text: "#111" }, SE: { label: "Sea", glyph: "SE", primary: "#ef3b2d", secondary: "#111827" }, MELI: { label: "MercadoLibre", glyph: "ML", primary: "#ffe600", secondary: "#2d4f9e", text: "#111" },
  "USD/CHF": { label: "Dollar Franc", glyph: "$F", primary: "#0f8d61", secondary: "#d52b1e" }, "EUR/GBP": { label: "Euro Pound", glyph: "€£", primary: "#225eea", secondary: "#314a9f" }, "NZD/USD": { label: "Kiwi Dollar", glyph: "N$", primary: "#00247d", secondary: "#0f8d61" }, "USD/MXN": { label: "Dollar Peso", glyph: "$M", primary: "#0f8d61", secondary: "#006341" }, "EUR/NOK": { label: "Euro Krone", glyph: "€N", primary: "#225eea", secondary: "#ba0c2f" }, "JPY-BASKET": { label: "Yen Basket", glyph: "¥B", primary: "#bc002d", secondary: "#111827" },
  EFA: { label: "EAFE ETF", glyph: "EF", primary: "#315bdc", secondary: "#0b1438" }, IEF: { label: "Treasury ETF", glyph: "IE", primary: "#315bdc", secondary: "#0b1438" }, TLT: { label: "Long Bond ETF", glyph: "TL", primary: "#315bdc", secondary: "#0b1438" }, USO: { label: "Oil ETF", glyph: "UO", primary: "#1f2937", secondary: "#d8b36a" }, UNG: { label: "Gas ETF", glyph: "UG", primary: "#111827", secondary: "#60a5fa" }, COPPER: { label: "Copper", glyph: "Cu", primary: "#b87333", secondary: "#241006" }, URANIUM: { label: "Uranium", glyph: "Ur", primary: "#84cc16", secondary: "#163006", text: "#111" }, WHEAT: { label: "Wheat", glyph: "Wh", primary: "#d6a84f", secondary: "#281607" }, CORN: { label: "Corn", glyph: "Co", primary: "#ffd34d", secondary: "#2a1a05", text: "#111" }, "HOUSING-GLOBAL": { label: "Global Housing", glyph: "GH", primary: "#b99d72", secondary: "#24170d" }, "MORTGAGE-RATE": { label: "Mortgage Rate", glyph: "MR", primary: "#9b7d52", secondary: "#211407" }, "OFFICE-REIT": { label: "Office REIT", glyph: "OR", primary: "#9b7d52", secondary: "#211407" }, "INDUSTRIAL-REIT": { label: "Industrial REIT", glyph: "IR", primary: "#9b7d52", secondary: "#211407" },
};

export const pass382PseudoPricePatch: Record<string, string> = {
  PNC: "$183.40", TFC: "$45.90", USB: "$49.10", MCO: "$480.20", SPGI: "$515.60", MSCI: "$575.40", FICO: "$1,680", SAP: "€245.10", "ASML.AS": "€930.40", "NOVO-B.CO": "DKK 690", "NOKIA.HE": "€4.25", SHOP: "$142.30", SE: "$156.20", MELI: "$2,180", "USD/CHF": "0.80", "EUR/GBP": "0.87", "NZD/USD": "0.58", "USD/MXN": "18.45", "EUR/NOK": "11.75", "JPY-BASKET": "basket", EFA: "$91.20", IEF: "$97.40", TLT: "$93.60", USO: "$78.20", UNG: "$17.40", COPPER: "$4.70", URANIUM: "index", WHEAT: "$5.90", CORN: "$4.55", "HOUSING-GLOBAL": "macro", "MORTGAGE-RATE": "macro", "OFFICE-REIT": "macro", "INDUSTRIAL-REIT": "macro",
};

export function buildPass382MarketCoverageUniverse() {
  return pass382MarketExpansion;
}
