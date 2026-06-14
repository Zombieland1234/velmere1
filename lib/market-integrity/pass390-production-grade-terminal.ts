import type { UniversalAssetRow } from "./universal-asset-market-matrix";

export type Pass390Mode = "basic" | "pro" | "advanced";
type VisualPatch = { label: string; glyph: string; primary: string; secondary: string; text?: string; logoUrl?: string };
type MarketRowInput = Partial<UniversalAssetRow> & Pick<UniversalAssetRow, "id" | "rank" | "symbol" | "name" | "assetClass" | "riskPressure" | "sparkTone">;
type Pass390Field = { id: string; label: string; value: string; copy: string };

function row(input: MarketRowInput): UniversalAssetRow {
  const family = input.assetClass === "fx" ? "FX" : input.assetClass === "commodity" ? "commodity" : input.assetClass === "real_estate" ? "real-estate proxy" : input.assetClass === "etf" ? "ETF" : input.assetClass === "exchange_token" ? "exchange venue" : "equity";
  return {
    sourceRhythm: input.sourceRhythm ?? `${family} provider-ready lane · timestamp · OHLCV · session calendar · cache age · fallback flag`,
    priceLane: input.priceLane ?? `${family} uses the Shield candle grammar: 1H / 4H / 1D / 1W preview now; live OHLCV only after provider lock`,
    volumeLane: input.volumeLane ?? `${family} volume, spread, volatility and second-source drift stay separate from hype`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${family} issuer/reference/methodology lane`,
    secondSourceLane: input.secondSourceLane ?? "primary provider ↔ second source before stronger public confidence",
    confidenceFloor: input.confidenceFloor ?? 78,
    adapterState: input.adapterState ?? "provider_ready_no_fake_live",
    humanCopy: input.humanCopy ?? `${input.symbol} is mapped through PASS390: clean icon, Shield-grade chart, provider truth, neural audit, Security education, Research boundary and exact PDF mirror.`,
    nextAdapterStep: input.nextAdapterStep ?? "Attach provider key, timestamp, OHLCV cache, issuer/reference lane, second-source compare, locale lock and PDF mirror QA.",
    ...input,
  };
}

export const pass390ProductionGradeTerminalContract = {
  version: "PASS390.production_grade_terminal",
  publicRule: "One public terminal: Real Markets, Shield, Browser PDF, Security and Research must feel like one product, not accumulated pass history.",
  marketRule: "Every asset follows the same user grammar: real logo/glyph, Shield candle chart, source state, Basic/Pro/Advanced, VLM Brain and exact PDF mirror.",
  providerRule: "The catalogue can be wide, but live confidence unlocks only with timestamp, OHLCV, cache age, fallback flag, session calendar and second source.",
  aiRule: "The brain collects source lanes into a visible neural core, shows collection time, then resolves to 10/14/20 human fields.",
  pdfRule: "Browser preview, centered modal and downloaded PDF must render one resolved report object in PL/EN/DE.",
  securityRule: "Security copy is simple: private secrets stay private, signatures prove control, entropy quality matters and reports are redacted.",
  researchRule: "Prime/Riemann work is presented as numerical audit, falsification and replication path, not a formal proof claim.",
} as const;

export const pass390BrainStages = [
  { id: "identity", label: "Identity", seconds: 0.45, copy: "Symbol, class, locale, logo and route are locked before the audit begins." },
  { id: "provider", label: "Provider truth", seconds: 0.78, copy: "Timestamp, OHLCV, cache age, fallback flag and session calendar set the confidence floor." },
  { id: "candles", label: "Shield candles", seconds: 1.02, copy: "Stocks, FX, commodities and crypto share one candle grammar: 1H, 4H, 1D and 1W." },
  { id: "flow", label: "Neural flow", seconds: 1.26, copy: "Source, liquidity, issuer, macro, venue and second-source lanes flow into the VLM core." },
  { id: "security", label: "Security bridge", seconds: 0.92, copy: "Signature proof, private-key boundary, entropy quality and report redaction are explained in human language." },
  { id: "research", label: "Prime Lab", seconds: 0.96, copy: "Prime research stays in audit mode: benchmark, falsification, replication and caveats." },
  { id: "readout", label: "Human readout", seconds: 1.18, copy: "The brain resolves to useful fields, not debug cards or pass-history walls." },
  { id: "mirror", label: "PDF mirror", seconds: 0.66, copy: "Preview, modal and downloaded PDF use one resolved object and one selected language." },
] as const;

export const pass390ProviderRails = [
  { id: "crypto", label: "Crypto / exchange health", state: "depth + heartbeat", copy: "Depth, klines, reconnect, reserve context, withdrawal state and second venue stay separated." },
  { id: "equities", label: "Equities", state: "quote + issuer", copy: "Quote provider, exchange calendar, filings/company facts and peer basket are required before stronger copy." },
  { id: "fx", label: "FX", state: "reference + intraday", copy: "FX rows need reference cadence, intraday feed, holiday calendar and volatility band." },
  { id: "commodities", label: "Commodities", state: "spot/futures", copy: "Gold, silver, energy and agriculture require source type, contract context and timestamp." },
  { id: "real_estate", label: "Real estate proxy", state: "slow macro", copy: "REIT/ETF/housing proxies are context lanes, not instant property valuations." },
  { id: "pdf", label: "PDF parity", state: "single object", copy: "The same resolved report object renders preview, modal and PDF in PL/EN/DE." },
] as const;

export const pass390SecurityPlainCopy = [
  "Velmère never asks for a seed phrase, raw private key or private secret.",
  "A signature can prove control without revealing the secret; the user sees the result, not the private payload.",
  "Real Markets uses stronger wording only after timestamp, OHLCV, cache age, fallback flag and second source are present.",
  "Entropy/RNG is explained as quality and validation of randomness sources, not as an operational wallet-generation guide.",
  "The report shows sources, gaps and a human readout; private thresholds and abuse rules stay internal.",
] as const;

export const pass390ResearchBridge = [
  { id: "banks", label: "Banks", copy: "Bank-style trust is session control, signature proof, limits, logs, audit trail and abuse response." },
  { id: "crypto", label: "Cryptography", copy: "Cryptography proves control, integrity or authenticity without exposing the private secret." },
  { id: "ecc", label: "ECC / BTC", copy: "Elliptic-curve signatures are explained conceptually: private key stays private, public proof confirms control." },
  { id: "entropy", label: "Real RNG", copy: "Randomness quality means entropy, health checks and source validation, kept at a safe educational level." },
  { id: "primes", label: "Prime Lab", copy: "Prime work is presented as zeta residual reconstruction, benchmarks and falsification controls." },
  { id: "bajak", label: "Bajak Protocol", copy: "Public framing: finite numerical reconstruction, benchmark, fake-zero controls, neighbor-shift controls and replication." },
] as const;

export const pass390AssetVisualPatch: Record<string, VisualPatch> = {
  NDAQ: { label: "Nasdaq", glyph: "NQ", primary: "#2563eb", secondary: "#041938" },
  ICE: { label: "Intercontinental Exchange", glyph: "IC", primary: "#111827", secondary: "#64748b" },
  CME: { label: "CME Group", glyph: "CM", primary: "#1d4ed8", secondary: "#06183b" },
  CBOE: { label: "Cboe", glyph: "CB", primary: "#0f172a", secondary: "#c8a96a" },
  "LSEG.L": { label: "London Stock Exchange", glyph: "LS", primary: "#0f172a", secondary: "#38bdf8" },
  "DB1.DE": { label: "Deutsche Boerse", glyph: "DB", primary: "#111827", secondary: "#fbbf24", text: "#111" },
  RBLX: { label: "Roblox", glyph: "RB", primary: "#111827", secondary: "#e5e7eb" },
  U: { label: "Unity", glyph: "U", primary: "#111827", secondary: "#f8fafc" },
  SHOP: { label: "Shopify", glyph: "SH", primary: "#22c55e", secondary: "#052e16" },
  MELI: { label: "MercadoLibre", glyph: "ML", primary: "#facc15", secondary: "#1d4ed8", text: "#111" },
  SE: { label: "Sea Limited", glyph: "SE", primary: "#2563eb", secondary: "#06183b" },
  "ADYEN.AS": { label: "Adyen", glyph: "AY", primary: "#16a34a", secondary: "#052e16" },
  "EUR/CHF": { label: "Euro / Swiss Franc", glyph: "CH", primary: "#dc2626", secondary: "#f8fafc", text: "#111" },
  "USD/CHF": { label: "Dollar / Swiss Franc", glyph: "CH", primary: "#b91c1c", secondary: "#f8fafc", text: "#111" },
  "EUR/NOK": { label: "Euro / Norwegian Krone", glyph: "NO", primary: "#1d4ed8", secondary: "#dc2626" },
  "USD/NOK": { label: "Dollar / Norwegian Krone", glyph: "NO", primary: "#2563eb", secondary: "#b91c1c" },
  "EUR/CZK": { label: "Euro / Czech Koruna", glyph: "CZ", primary: "#1d4ed8", secondary: "#dc2626" },
  "USD/CZK": { label: "Dollar / Czech Koruna", glyph: "CZ", primary: "#2563eb", secondary: "#dc2626" },
  XLE: { label: "Energy ETF", glyph: "En", primary: "#15803d", secondary: "#052e16" },
  XLF: { label: "Financials ETF", glyph: "Fi", primary: "#1d4ed8", secondary: "#06183b" },
  XLK: { label: "Technology ETF", glyph: "Tk", primary: "#4f46e5", secondary: "#0f1238" },
  XLY: { label: "Consumer Discretionary ETF", glyph: "Cy", primary: "#f97316", secondary: "#2d0d04" },
  XLP: { label: "Consumer Staples ETF", glyph: "Cs", primary: "#16a34a", secondary: "#052e16" },
  COAL: { label: "Coal proxy", glyph: "Co", primary: "#111827", secondary: "#374151" },
  NATGAS: { label: "Natural Gas", glyph: "Ng", primary: "#38bdf8", secondary: "#082f49" },
  LITHIUM: { label: "Lithium", glyph: "Li", primary: "#94a3b8", secondary: "#334155" },
  RAREEARTH: { label: "Rare earths", glyph: "Re", primary: "#a855f7", secondary: "#2e1065" },
  VNQI: { label: "Global ex-US real estate", glyph: "Gx", primary: "#c8a96a", secondary: "#24170d" },
  SCHH: { label: "US REIT ETF", glyph: "RE", primary: "#b99d72", secondary: "#24170d" },
  REM: { label: "Mortgage REIT ETF", glyph: "MR", primary: "#9a7a45", secondary: "#211508" },
};

export const pass390PseudoPricePatch: Record<string, { price: string; change: string }> = {
  NDAQ: { price: "$72.40", change: "+0.38%" }, ICE: { price: "$154.10", change: "+0.21%" }, CME: { price: "$228.80", change: "-0.14%" }, CBOE: { price: "$181.60", change: "+0.09%" }, "LSEG.L": { price: "9,430p", change: "+0.18%" }, "DB1.DE": { price: "€211.20", change: "+0.24%" }, RBLX: { price: "$36.15", change: "-1.08%" }, U: { price: "$24.30", change: "+1.20%" }, SHOP: { price: "$66.70", change: "+0.84%" }, MELI: { price: "$1,685.00", change: "+0.33%" }, SE: { price: "$72.15", change: "+0.51%" }, "ADYEN.AS": { price: "€1,118.40", change: "-0.22%" }, "EUR/CHF": { price: "0.9630", change: "+0.02%" }, "USD/CHF": { price: "0.8940", change: "-0.03%" }, "EUR/NOK": { price: "11.42", change: "+0.07%" }, "USD/NOK": { price: "10.59", change: "+0.09%" }, "EUR/CZK": { price: "24.73", change: "flat" }, "USD/CZK": { price: "22.93", change: "+0.04%" }, XLE: { price: "$91.10", change: "+0.26%" }, XLF: { price: "$42.60", change: "+0.15%" }, XLK: { price: "$219.90", change: "+0.31%" }, XLY: { price: "$182.70", change: "-0.11%" }, XLP: { price: "$76.40", change: "+0.08%" }, COAL: { price: "provider", change: "proxy" }, NATGAS: { price: "$2.83", change: "+1.90%" }, LITHIUM: { price: "provider", change: "reference" }, RAREEARTH: { price: "provider", change: "basket" }, VNQI: { price: "$41.40", change: "+0.12%" }, SCHH: { price: "$20.85", change: "+0.18%" }, REM: { price: "$22.10", change: "-0.09%" },
};

export function buildPass390MarketCoverageUniverse(): UniversalAssetRow[] {
  return [
    row({ id: "pass390-nasdaq", rank: 39001, symbol: "NDAQ", name: "Nasdaq", assetClass: "stock", riskPressure: 31, sparkTone: "up" }),
    row({ id: "pass390-ice", rank: 39002, symbol: "ICE", name: "Intercontinental Exchange", assetClass: "stock", riskPressure: 28, sparkTone: "up" }),
    row({ id: "pass390-cme", rank: 39003, symbol: "CME", name: "CME Group", assetClass: "stock", riskPressure: 27, sparkTone: "flat" }),
    row({ id: "pass390-cboe", rank: 39004, symbol: "CBOE", name: "Cboe Global Markets", assetClass: "stock", riskPressure: 29, sparkTone: "flat" }),
    row({ id: "pass390-lseg", rank: 39005, symbol: "LSEG.L", name: "London Stock Exchange Group", assetClass: "stock", riskPressure: 25, sparkTone: "up" }),
    row({ id: "pass390-db1", rank: 39006, symbol: "DB1.DE", name: "Deutsche Boerse", assetClass: "stock", riskPressure: 26, sparkTone: "up" }),
    row({ id: "pass390-rblx", rank: 39007, symbol: "RBLX", name: "Roblox", assetClass: "stock", riskPressure: 52, sparkTone: "volatile" }),
    row({ id: "pass390-unity", rank: 39008, symbol: "U", name: "Unity Software", assetClass: "stock", riskPressure: 58, sparkTone: "volatile" }),
    row({ id: "pass390-shop", rank: 39009, symbol: "SHOP", name: "Shopify", assetClass: "stock", riskPressure: 39, sparkTone: "up" }),
    row({ id: "pass390-meli", rank: 39010, symbol: "MELI", name: "MercadoLibre", assetClass: "stock", riskPressure: 42, sparkTone: "up" }),
    row({ id: "pass390-sea", rank: 39011, symbol: "SE", name: "Sea Limited", assetClass: "stock", riskPressure: 47, sparkTone: "up" }),
    row({ id: "pass390-adyen", rank: 39012, symbol: "ADYEN.AS", name: "Adyen", assetClass: "stock", riskPressure: 37, sparkTone: "flat" }),
    row({ id: "pass390-eurchf", rank: 39013, symbol: "EUR/CHF", name: "Euro / Swiss Franc", assetClass: "fx", riskPressure: 22, sparkTone: "flat" }),
    row({ id: "pass390-usdchf", rank: 39014, symbol: "USD/CHF", name: "Dollar / Swiss Franc", assetClass: "fx", riskPressure: 28, sparkTone: "flat" }),
    row({ id: "pass390-eurnok", rank: 39015, symbol: "EUR/NOK", name: "Euro / Norwegian Krone", assetClass: "fx", riskPressure: 34, sparkTone: "flat" }),
    row({ id: "pass390-usdnok", rank: 39016, symbol: "USD/NOK", name: "Dollar / Norwegian Krone", assetClass: "fx", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass390-eurczk", rank: 39017, symbol: "EUR/CZK", name: "Euro / Czech Koruna", assetClass: "fx", riskPressure: 31, sparkTone: "flat" }),
    row({ id: "pass390-usdczk", rank: 39018, symbol: "USD/CZK", name: "Dollar / Czech Koruna", assetClass: "fx", riskPressure: 33, sparkTone: "flat" }),
    row({ id: "pass390-xle", rank: 39019, symbol: "XLE", name: "Energy Select Sector SPDR", assetClass: "etf", riskPressure: 41, sparkTone: "up" }),
    row({ id: "pass390-xlf", rank: 39020, symbol: "XLF", name: "Financial Select Sector SPDR", assetClass: "etf", riskPressure: 33, sparkTone: "flat" }),
    row({ id: "pass390-xlk", rank: 39021, symbol: "XLK", name: "Technology Select Sector SPDR", assetClass: "etf", riskPressure: 36, sparkTone: "up" }),
    row({ id: "pass390-xly", rank: 39022, symbol: "XLY", name: "Consumer Discretionary ETF", assetClass: "etf", riskPressure: 39, sparkTone: "flat" }),
    row({ id: "pass390-xlp", rank: 39023, symbol: "XLP", name: "Consumer Staples ETF", assetClass: "etf", riskPressure: 24, sparkTone: "flat" }),
    row({ id: "pass390-coal", rank: 39024, symbol: "COAL", name: "Coal proxy", assetClass: "commodity", riskPressure: 48, sparkTone: "volatile" }),
    row({ id: "pass390-natgas", rank: 39025, symbol: "NATGAS", name: "Natural Gas", assetClass: "commodity", riskPressure: 61, sparkTone: "volatile" }),
    row({ id: "pass390-lithium", rank: 39026, symbol: "LITHIUM", name: "Lithium basket proxy", assetClass: "commodity", riskPressure: 50, sparkTone: "volatile" }),
    row({ id: "pass390-rareearth", rank: 39027, symbol: "RAREEARTH", name: "Rare earths basket", assetClass: "commodity", riskPressure: 54, sparkTone: "volatile" }),
    row({ id: "pass390-vnqi", rank: 39028, symbol: "VNQI", name: "Global ex-US Real Estate ETF", assetClass: "real_estate", riskPressure: 39, sparkTone: "flat" }),
    row({ id: "pass390-schh", rank: 39029, symbol: "SCHH", name: "Schwab US REIT ETF", assetClass: "real_estate", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass390-rem", rank: 39030, symbol: "REM", name: "Mortgage REIT ETF", assetClass: "real_estate", riskPressure: 46, sparkTone: "flat" }),
  ];
}

export function buildPass390UnifiedReadout(input: { symbol: string; name: string; type: string; risk: number; source: string; mode: Pass390Mode }) {
  const count = input.mode === "advanced" ? 20 : input.mode === "pro" ? 14 : 10;
  const seconds = input.mode === "advanced" ? 9.2 : input.mode === "pro" ? 6.6 : 4.9;
  const band = input.risk >= 62 ? "review" : input.risk >= 42 ? "observe" : "clean";
  const fields: Pass390Field[] = [
    { id: "identity", label: "Identity", value: input.symbol, copy: `${input.name} is locked as ${input.type}; logo, locale and route stay identical in Shield, Real Markets and PDF.` },
    { id: "language", label: "Language", value: "PL/EN/DE", copy: "The report follows the selected page language from the same resolved object." },
    { id: "chart", label: "Chart", value: "Shield candles", copy: "Every asset uses the same 1H/4H/1D/1W candle surface as Shield." },
    { id: "provider", label: "Provider truth", value: input.source, copy: "Live confidence needs timestamp, OHLCV, cache age, fallback flag and session context." },
    { id: "risk", label: "Risk pressure", value: `${input.risk}/100`, copy: "Risk pressure is a review lane, never a buy/sell instruction." },
    { id: "second", label: "Second source", value: "required", copy: "Confidence increases only when another venue, provider or reference source agrees." },
    { id: "liquidity", label: "Liquidity", value: "near decision", copy: "Depth, spread, volume and volatility stay near the action area without hype." },
    { id: "issuer", label: "Issuer/ref", value: input.type, copy: "Stocks need company facts/filings; FX, commodities and ETFs need methodology/reference context." },
    { id: "security", label: "Security", value: "redacted", copy: "The public report shows sources and gaps while private thresholds remain internal." },
    { id: "pdf", label: "PDF mirror", value: "exact", copy: "Preview, modal and download render one resolved report object." },
    { id: "entropy", label: "Entropy", value: "quality", copy: "RNG/TRNG is explained as source quality and validation, not as wallet-generation instructions." },
    { id: "ecc", label: "ECC / BTC", value: "concept", copy: "Private/public key and signature logic stay at a safe conceptual level." },
    { id: "prime", label: "Prime Lab", value: "audit", copy: "Prime/Riemann work is framed as numerical reconstruction and falsification." },
    { id: "bank", label: "Bank-grade", value: "session/log", copy: "Bank-grade trust means session control, signatures, limits, audit trail and abuse response." },
    { id: "macro", label: "Macro", value: "separate", copy: "FX, rates, energy and sector context do not overwrite asset-specific evidence." },
    { id: "venue", label: "Venue", value: "heartbeat", copy: "Exchange health needs API freshness, withdrawals, reserves and social stress context." },
    { id: "copy", label: "AI copy", value: "human", copy: "The AI translates technical gaps into clean language instead of repeating debug text." },
    { id: "clean", label: "Surface", value: "clean launch", copy: "Old pass-history panels are hidden from the public UI." },
    { id: "operator", label: "Operator", value: "private", copy: "Internal rules and abuse thresholds do not leak into customer reports." },
    { id: "next", label: "Next step", value: "verify", copy: "The next action is provider verification or PDF export, never pressure or fake scarcity." },
  ];
  return { version: "PASS390.production_grade_readout", count, seconds, band, headline: `${input.symbol} · production-grade AI terminal`, body: `${input.symbol} resolves through one finished product spine: provider truth, Shield candles, neural audit, Security education, Prime Lab boundary and exact PDF mirror.`, fields: fields.slice(0, count) };
}
