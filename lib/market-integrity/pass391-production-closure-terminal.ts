import type { UniversalAssetRow } from "./universal-asset-market-matrix";

export type Pass391Mode = "basic" | "pro" | "advanced";
type VisualPatch = { label: string; glyph: string; primary: string; secondary: string; text?: string; logoUrl?: string };
type MarketRowInput = Partial<UniversalAssetRow> & Pick<UniversalAssetRow, "id" | "rank" | "symbol" | "name" | "assetClass" | "riskPressure" | "sparkTone">;
type Pass391Field = { id: string; label: string; value: string; copy: string };

function row(input: MarketRowInput): UniversalAssetRow {
  const family = input.assetClass === "fx" ? "FX" : input.assetClass === "commodity" ? "commodity" : input.assetClass === "real_estate" ? "real-estate proxy" : input.assetClass === "etf" ? "ETF" : input.assetClass === "exchange_token" ? "exchange venue" : "equity";
  return {
    sourceRhythm: input.sourceRhythm ?? `${family} provider-ready lane · timestamp · OHLCV · session calendar · cache age · fallback flag · second source`,
    priceLane: input.priceLane ?? `${family} renders through the same Shield candle grammar: 1H / 4H / 1D / 1W preview now; live only after provider lock`,
    volumeLane: input.volumeLane ?? `${family} volume, spread, volatility, session and second-source drift stay separated from public copy`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${family} issuer/reference/methodology lane with redacted proof output`,
    secondSourceLane: input.secondSourceLane ?? "primary provider ↔ second source before stronger public confidence",
    confidenceFloor: input.confidenceFloor ?? 80,
    adapterState: input.adapterState ?? "provider_ready_no_fake_live",
    humanCopy: input.humanCopy ?? `${input.symbol} is routed through PASS391: clean logo, Shield-grade candles, provider truth, VLM Brain, Security bridge, Research boundary and one exact PDF mirror.`,
    nextAdapterStep: input.nextAdapterStep ?? "Attach provider key, timestamp, OHLCV cache, fallback state, issuer/reference lane, second-source compare, locale lock and PDF mirror QA.",
    ...input,
  };
}

export const pass391ProductionClosureContract = {
  version: "PASS391.production_closure_terminal",
  publicRule: "One visible product surface: Real Markets, Shield, Browser PDF, Security and Research resolve from one clean AI contract.",
  marketRule: "Every asset uses the same sequence: real logo/glyph, Shield candles, timeframe, source truth, Basic/Pro/Advanced, VLM Brain and PDF mirror.",
  providerRule: "Wide catalogue is allowed, but live-grade language unlocks only with timestamp, OHLCV, cache age, fallback flag, session calendar and second source.",
  aiRule: "The brain shows collection time, moves source lanes into a neural core and resolves to 10/14/20 human fields instead of pass-history cards.",
  pdfRule: "Preview, centered modal and downloaded PDF render the same resolved report object in the selected PL/EN/DE language.",
  securityRule: "Public security copy stays simple: secrets stay private, signatures prove control, entropy has measurable quality and reports are redacted.",
  researchRule: "Prime/Riemann work stays as numerical audit, falsification and replication path; no formal proof claim without independent review.",
} as const;

export const pass391BrainStages = [
  { id: "identity", label: "Identity seal", seconds: 0.42, copy: "Asset, class, locale, logo and route are locked before any conclusion is rendered." },
  { id: "provider", label: "Provider lock", seconds: 0.74, copy: "Timestamp, OHLCV, cache age, fallback flag and session calendar decide source strength." },
  { id: "candles", label: "Candle forge", seconds: 0.96, copy: "Crypto, stock, FX, ETF and commodities share one Shield-style 1H/4H/1D/1W chart grammar." },
  { id: "neural", label: "Neural source flow", seconds: 1.24, copy: "Liquidity, issuer, macro, venue and second-source lanes flow into the VLM core." },
  { id: "security", label: "Security bridge", seconds: 0.88, copy: "Private key boundary, signature proof, entropy quality and redacted report are translated for humans." },
  { id: "research", label: "Prime Lab", seconds: 0.92, copy: "Prime work is presented as benchmark, falsification, negative controls and replication." },
  { id: "readout", label: "Human readout", seconds: 1.08, copy: "The output is useful and short: 10, 14 or 20 fields depending on Basic, Pro or Advanced." },
  { id: "mirror", label: "PDF mirror", seconds: 0.64, copy: "Browser preview, modal and downloaded PDF remain one object, not separate generators." },
] as const;

export const pass391ProviderRails = [
  { id: "crypto", label: "Crypto / venues", state: "depth + heartbeat", copy: "Orderbook, klines, reconnect, reserves, withdrawals and second venue are tracked as separate lanes." },
  { id: "equities", label: "Equities", state: "quote + filing", copy: "Quote provider, session calendar, issuer facts and filing/event context are required before stronger language." },
  { id: "fx", label: "FX", state: "reference + intraday", copy: "Reference rate, intraday feed, holiday calendar and volatility band stay visible before confidence." },
  { id: "commodities", label: "Commodities", state: "spot / futures", copy: "Metals, energy and agriculture need source type, contract context and timestamp before public confidence." },
  { id: "real_estate", label: "Real estate proxy", state: "slow macro", copy: "REIT/ETF/housing proxies explain macro pressure; they are not instant property valuations." },
  { id: "pdf", label: "PDF mirror", state: "one object", copy: "The same resolved report object renders preview, modal and PDF in PL/EN/DE." },
] as const;

export const pass391SecurityPlainCopy = [
  "Velmère never asks for seed phrase, raw private key or private secret.",
  "A signature can prove control without exposing the private secret; the public report sees only the safe result.",
  "Real Markets uses stronger wording only after timestamp, OHLCV, cache age, fallback flag, session calendar and second source exist.",
  "Entropy/RNG is explained as source quality and validation, not as a wallet-generation instruction.",
  "The user sees sources, gaps and a human readout; thresholds, private payloads and abuse rules stay internal.",
] as const;

export const pass391ResearchBridge = [
  { id: "banks", label: "Banks", copy: "Bank-style trust is session control, limits, signatures, logs, audit trail and abuse response." },
  { id: "crypto", label: "Cryptography", copy: "Cryptography proves control or integrity without exposing the private secret." },
  { id: "ecc", label: "ECC / BTC", copy: "Elliptic-curve signatures are explained conceptually: private key stays private, public proof confirms control." },
  { id: "entropy", label: "Real RNG", copy: "Randomness quality means entropy, source health and validation; this stays educational and non-operational." },
  { id: "primes", label: "Prime Lab", copy: "Prime research is framed as zeta residual reconstruction, benchmark and falsification controls." },
  { id: "bajak", label: "Bajak Protocol", copy: "Public framing: finite numerical reconstruction, fake-zero controls, neighbor-shift controls, negative controls and replication." },
] as const;

export const pass391AssetVisualPatch: Record<string, VisualPatch> = {
  TSM: { label: "Taiwan Semiconductor", glyph: "TS", primary: "#111827", secondary: "#dc2626" },
  ASML: { label: "ASML", glyph: "AS", primary: "#f97316", secondary: "#0f172a" },
  SAP: { label: "SAP", glyph: "SA", primary: "#2563eb", secondary: "#06183b" },
  "SIE.DE": { label: "Siemens", glyph: "SI", primary: "#00a19a", secondary: "#062b2a" },
  "AIR.PA": { label: "Airbus", glyph: "AB", primary: "#1d4ed8", secondary: "#06183b" },
  "OR.PA": { label: "L'Oreal", glyph: "OR", primary: "#d6b36a", secondary: "#211508" },
  "RMS.PA": { label: "Hermes", glyph: "HE", primary: "#f97316", secondary: "#2d0d04" },
  RACE: { label: "Ferrari", glyph: "FE", primary: "#dc2626", secondary: "#facc15", text: "#111" },
  "MBG.DE": { label: "Mercedes-Benz", glyph: "MB", primary: "#111827", secondary: "#d1d5db" },
  "BMW.DE": { label: "BMW", glyph: "BM", primary: "#2563eb", secondary: "#f8fafc", text: "#111" },
  "VOW3.DE": { label: "Volkswagen", glyph: "VW", primary: "#1e3a8a", secondary: "#f8fafc", text: "#111" },
  "EUR/HUF": { label: "Euro / Forint", glyph: "HU", primary: "#16a34a", secondary: "#dc2626" },
  "USD/HUF": { label: "Dollar / Forint", glyph: "HU", primary: "#2563eb", secondary: "#16a34a" },
  "EUR/SEK": { label: "Euro / Swedish Krona", glyph: "SE", primary: "#1d4ed8", secondary: "#facc15", text: "#111" },
  "USD/SEK": { label: "Dollar / Swedish Krona", glyph: "SE", primary: "#2563eb", secondary: "#facc15", text: "#111" },
  "EUR/DKK": { label: "Euro / Danish Krone", glyph: "DK", primary: "#dc2626", secondary: "#f8fafc", text: "#111" },
  "USD/DKK": { label: "Dollar / Danish Krone", glyph: "DK", primary: "#b91c1c", secondary: "#f8fafc", text: "#111" },
  TIP: { label: "Inflation-Protected Bonds", glyph: "TI", primary: "#c8a96a", secondary: "#24170d" },
  HYG: { label: "High Yield Credit", glyph: "HY", primary: "#ef4444", secondary: "#2d0d04" },
  LQD: { label: "Investment Grade Credit", glyph: "IG", primary: "#2563eb", secondary: "#06183b" },
  COPPER: { label: "Copper", glyph: "Cu", primary: "#b45309", secondary: "#2b1208" },
  ALUMINUM: { label: "Aluminum", glyph: "Al", primary: "#94a3b8", secondary: "#334155" },
  WHEAT: { label: "Wheat", glyph: "Wh", primary: "#d6b36a", secondary: "#24170d" },
  CORN: { label: "Corn", glyph: "Cr", primary: "#facc15", secondary: "#3b2f0a", text: "#111" },
  IYR: { label: "US Real Estate ETF", glyph: "YR", primary: "#b99d72", secondary: "#24170d" },
  XLRE: { label: "Real Estate Sector ETF", glyph: "XR", primary: "#9a7a45", secondary: "#211508" },
  EQIX: { label: "Equinix", glyph: "EQ", primary: "#dc2626", secondary: "#111827" },
  DLR: { label: "Digital Realty", glyph: "DR", primary: "#2563eb", secondary: "#06183b" },
};

export const pass391PseudoPricePatch: Record<string, { price: string; change: string }> = {
  TSM: { price: "$169.80", change: "+0.45%" }, ASML: { price: "€812.40", change: "+0.18%" }, SAP: { price: "€183.20", change: "+0.25%" }, "SIE.DE": { price: "€172.10", change: "+0.14%" }, "AIR.PA": { price: "€154.80", change: "-0.11%" }, "OR.PA": { price: "€421.30", change: "+0.09%" }, "RMS.PA": { price: "€2,118.00", change: "+0.12%" }, RACE: { price: "$417.60", change: "+0.28%" }, "MBG.DE": { price: "€64.40", change: "-0.06%" }, "BMW.DE": { price: "€93.10", change: "+0.08%" }, "VOW3.DE": { price: "€119.60", change: "flat" }, "EUR/HUF": { price: "388.40", change: "+0.04%" }, "USD/HUF": { price: "359.10", change: "+0.07%" }, "EUR/SEK": { price: "11.18", change: "+0.02%" }, "USD/SEK": { price: "10.36", change: "+0.06%" }, "EUR/DKK": { price: "7.46", change: "flat" }, "USD/DKK": { price: "6.91", change: "+0.03%" }, TIP: { price: "$107.20", change: "+0.02%" }, HYG: { price: "$77.90", change: "-0.05%" }, LQD: { price: "$109.70", change: "+0.03%" }, COPPER: { price: "$4.63", change: "+0.38%" }, ALUMINUM: { price: "$2,590", change: "+0.21%" }, WHEAT: { price: "provider", change: "reference" }, CORN: { price: "provider", change: "reference" }, IYR: { price: "$87.40", change: "+0.10%" }, XLRE: { price: "$40.70", change: "+0.05%" }, EQIX: { price: "$781.00", change: "+0.16%" }, DLR: { price: "$141.30", change: "+0.18%" },
};

export function buildPass391MarketCoverageUniverse(): UniversalAssetRow[] {
  return [
    row({ id: "pass391-tsm", rank: 39101, symbol: "TSM", name: "Taiwan Semiconductor", assetClass: "stock", riskPressure: 34, sparkTone: "up" }),
    row({ id: "pass391-asml", rank: 39102, symbol: "ASML", name: "ASML Holding", assetClass: "stock", riskPressure: 32, sparkTone: "up" }),
    row({ id: "pass391-sap", rank: 39103, symbol: "SAP", name: "SAP", assetClass: "stock", riskPressure: 26, sparkTone: "flat" }),
    row({ id: "pass391-siemens", rank: 39104, symbol: "SIE.DE", name: "Siemens", assetClass: "stock", riskPressure: 29, sparkTone: "flat" }),
    row({ id: "pass391-airbus", rank: 39105, symbol: "AIR.PA", name: "Airbus", assetClass: "stock", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass391-loreal", rank: 39106, symbol: "OR.PA", name: "L'Oreal", assetClass: "stock", riskPressure: 24, sparkTone: "flat" }),
    row({ id: "pass391-hermes", rank: 39107, symbol: "RMS.PA", name: "Hermes International", assetClass: "stock", riskPressure: 23, sparkTone: "up" }),
    row({ id: "pass391-ferrari", rank: 39108, symbol: "RACE", name: "Ferrari", assetClass: "stock", riskPressure: 28, sparkTone: "up" }),
    row({ id: "pass391-mercedes", rank: 39109, symbol: "MBG.DE", name: "Mercedes-Benz Group", assetClass: "stock", riskPressure: 37, sparkTone: "flat" }),
    row({ id: "pass391-bmw", rank: 39110, symbol: "BMW.DE", name: "BMW", assetClass: "stock", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass391-volkswagen", rank: 39111, symbol: "VOW3.DE", name: "Volkswagen", assetClass: "stock", riskPressure: 44, sparkTone: "watch" }),
    row({ id: "pass391-eurhuf", rank: 39112, symbol: "EUR/HUF", name: "Euro / Hungarian Forint", assetClass: "fx", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass391-usdhuf", rank: 39113, symbol: "USD/HUF", name: "Dollar / Hungarian Forint", assetClass: "fx", riskPressure: 38, sparkTone: "flat" }),
    row({ id: "pass391-eursek", rank: 39114, symbol: "EUR/SEK", name: "Euro / Swedish Krona", assetClass: "fx", riskPressure: 32, sparkTone: "flat" }),
    row({ id: "pass391-usdsek", rank: 39115, symbol: "USD/SEK", name: "Dollar / Swedish Krona", assetClass: "fx", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass391-eurdkk", rank: 39116, symbol: "EUR/DKK", name: "Euro / Danish Krone", assetClass: "fx", riskPressure: 18, sparkTone: "flat" }),
    row({ id: "pass391-usddkk", rank: 39117, symbol: "USD/DKK", name: "Dollar / Danish Krone", assetClass: "fx", riskPressure: 25, sparkTone: "flat" }),
    row({ id: "pass391-tip", rank: 39118, symbol: "TIP", name: "TIPS ETF", assetClass: "etf", riskPressure: 22, sparkTone: "flat" }),
    row({ id: "pass391-hyg", rank: 39119, symbol: "HYG", name: "High Yield Corporate Bond ETF", assetClass: "etf", riskPressure: 43, sparkTone: "watch" }),
    row({ id: "pass391-lqd", rank: 39120, symbol: "LQD", name: "Investment Grade Corporate Bond ETF", assetClass: "etf", riskPressure: 31, sparkTone: "flat" }),
    row({ id: "pass391-copper", rank: 39121, symbol: "COPPER", name: "Copper", assetClass: "commodity", riskPressure: 40, sparkTone: "up" }),
    row({ id: "pass391-aluminum", rank: 39122, symbol: "ALUMINUM", name: "Aluminum", assetClass: "commodity", riskPressure: 38, sparkTone: "flat" }),
    row({ id: "pass391-wheat", rank: 39123, symbol: "WHEAT", name: "Wheat", assetClass: "commodity", riskPressure: 46, sparkTone: "volatile" }),
    row({ id: "pass391-corn", rank: 39124, symbol: "CORN", name: "Corn", assetClass: "commodity", riskPressure: 42, sparkTone: "volatile" }),
    row({ id: "pass391-iyr", rank: 39125, symbol: "IYR", name: "US Real Estate ETF", assetClass: "real_estate", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass391-xlre", rank: 39126, symbol: "XLRE", name: "Real Estate Select Sector SPDR", assetClass: "real_estate", riskPressure: 33, sparkTone: "flat" }),
    row({ id: "pass391-eqix", rank: 39127, symbol: "EQIX", name: "Equinix", assetClass: "real_estate", riskPressure: 30, sparkTone: "up" }),
    row({ id: "pass391-dlr", rank: 39128, symbol: "DLR", name: "Digital Realty", assetClass: "real_estate", riskPressure: 36, sparkTone: "flat" }),
  ];
}

export function buildPass391UnifiedReadout(input: { symbol: string; name: string; type: string; risk: number; source: string; mode: Pass391Mode }) {
  const count = input.mode === "advanced" ? 20 : input.mode === "pro" ? 14 : 10;
  const seconds = input.mode === "advanced" ? 9.6 : input.mode === "pro" ? 6.9 : 5.1;
  const band = input.risk >= 62 ? "review" : input.risk >= 42 ? "observe" : "clean";
  const fields: Pass391Field[] = [
    { id: "identity", label: "Identity", value: input.symbol, copy: `${input.name} is locked as ${input.type}; symbol, locale, logo and route match across Shield, Real Markets and PDF.` },
    { id: "language", label: "Language", value: "PL/EN/DE", copy: "The selected page language controls preview, modal and download from one object." },
    { id: "chart", label: "Chart", value: "Shield candles", copy: "Every market class uses the same clean candle surface and timeframe controls." },
    { id: "provider", label: "Provider truth", value: input.source, copy: "Live-grade confidence needs timestamp, OHLCV, cache age, fallback flag and session context." },
    { id: "risk", label: "Risk pressure", value: `${input.risk}/100`, copy: "Risk is a review lane, not an instruction and not a promise." },
    { id: "second", label: "Second source", value: "required", copy: "Confidence improves only when another provider, venue or reference source agrees." },
    { id: "liquidity", label: "Liquidity", value: "near decision", copy: "Depth, spread, volume and volatility sit close to the action area without hype." },
    { id: "issuer", label: "Issuer/reference", value: input.type, copy: "Stocks need company facts/filings; FX, commodities and ETFs need reference methodology." },
    { id: "security", label: "Security", value: "redacted", copy: "The public report shows sources and gaps while private thresholds remain internal." },
    { id: "pdf", label: "PDF mirror", value: "exact", copy: "Preview, modal and download render the same resolved report object." },
    { id: "entropy", label: "Entropy", value: "quality", copy: "RNG/TRNG is explained as source quality and validation, not as wallet-generation steps." },
    { id: "ecc", label: "ECC / BTC", value: "concept", copy: "Private/public key and signature logic stay conceptual and safe." },
    { id: "prime", label: "Prime Lab", value: "audit", copy: "Prime/Riemann work is framed as numerical reconstruction, negative controls and replication." },
    { id: "bank", label: "Bank-grade", value: "session/log", copy: "Bank-grade trust means session control, signatures, limits, logs and response." },
    { id: "macro", label: "Macro", value: "separate", copy: "FX, rates, energy and sector context never overwrite asset-specific evidence." },
    { id: "venue", label: "Venue", value: "heartbeat", copy: "Exchange health needs API freshness, withdrawals, reserves and social context separated." },
    { id: "copy", label: "AI copy", value: "human", copy: "The AI translates source gaps into clear language instead of debug words." },
    { id: "surface", label: "Surface", value: "launch clean", copy: "Old pass-history surfaces stay hidden from the public product." },
    { id: "operator", label: "Operator", value: "private", copy: "Internal thresholds, payloads and abuse rules stay private." },
    { id: "next", label: "Next step", value: "verify", copy: "The next action is provider verification or export, never pressure or fake scarcity." },
  ];
  return { version: "PASS391.production_closure_readout", count, seconds, band, headline: `${input.symbol} · production closure AI terminal`, body: `${input.symbol} resolves through one final product spine: provider truth, Shield candles, neural source flow, Security education, Prime Lab boundary and exact PDF mirror.`, fields: fields.slice(0, count) };
}
