import type { UniversalAssetRow } from "./universal-asset-market-matrix";

export type Pass392Mode = "basic" | "pro" | "advanced";
type VisualPatch = { label: string; glyph: string; primary: string; secondary: string; text?: string; logoUrl?: string };
type MarketRowInput = Partial<UniversalAssetRow> & Pick<UniversalAssetRow, "id" | "rank" | "symbol" | "name" | "assetClass" | "riskPressure" | "sparkTone">;
type Pass392Field = { id: string; label: string; value: string; copy: string };

function row(input: MarketRowInput): UniversalAssetRow {
  const family = input.assetClass === "fx" ? "FX" : input.assetClass === "commodity" ? "commodity" : input.assetClass === "real_estate" ? "real-estate proxy" : input.assetClass === "etf" ? "ETF" : input.assetClass === "exchange_token" ? "exchange venue" : "equity";
  return {
    sourceRhythm: input.sourceRhythm ?? `${family} provider lane · timestamp · OHLCV · cache age · fallback · second source`,
    priceLane: input.priceLane ?? `${family} uses Shield-grade candles in 1H / 4H / 1D / 1W with no fake-live language before provider lock`,
    volumeLane: input.volumeLane ?? `${family} volume, spread, session and volatility remain separate from public confidence`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${family} issuer/reference/methodology lane with redacted output`,
    secondSourceLane: input.secondSourceLane ?? "primary provider ↔ second source ↔ PDF mirror before stronger public copy",
    confidenceFloor: input.confidenceFloor ?? 82,
    adapterState: input.adapterState ?? "provider_ready_no_fake_live",
    humanCopy: input.humanCopy ?? `${input.symbol} is routed through PASS392: one clean public terminal, Shield-grade candles, provider truth, VLM Brain, Security bridge, Prime Lab boundary and exact PDF mirror.`,
    nextAdapterStep: input.nextAdapterStep ?? "Attach provider key, OHLCV timestamp, cache age, fallback flag, session calendar, issuer/reference source, second-source compare, PL/EN/DE locale lock and PDF mirror QA.",
    ...input,
  };
}

export const pass392PublicFidelityCore = {
  version: "PASS392.public_fidelity_core",
  publicRule: "One clean product surface only: Real Markets, Shield, Browser PDF, Security and Research resolve from a single public AI contract.",
  marketRule: "Every market class follows the same flow: logo/glyph, Shield candles, timeframe, source truth, Basic/Pro/Advanced, VLM Brain and exact PDF mirror.",
  providerRule: "A large catalogue can be visible, but live-grade confidence requires timestamp, OHLCV, cache age, fallback flag, session calendar and second source.",
  aiRule: "The VLM Brain collects sources into a neural core, shows collection time and resolves to 10/14/20 human fields without pass-history clutter.",
  pdfRule: "Preview, modal and downloaded PDF must render the same resolved report object in the selected PL/EN/DE language.",
  securityRule: "Public security copy stays simple: private key stays private, signatures prove control, entropy quality is measured and public reports are redacted.",
  researchRule: "Prime/Riemann work is framed as numerical audit, controls and replication path, not as a formal public theorem claim.",
} as const;

export const pass392BrainStages = [
  { id: "identity", label: "Identity lock", seconds: 0.44, copy: "Symbol, class, locale, route and visual identity are locked before the audit begins." },
  { id: "provider", label: "Provider truth", seconds: 0.82, copy: "Timestamp, OHLCV, cache age, fallback and second source decide source strength." },
  { id: "candles", label: "Shield candles", seconds: 0.92, copy: "Real Markets reuses the same Shield-grade chart grammar across stocks, FX, ETFs and commodities." },
  { id: "neural", label: "Neural audit", seconds: 1.36, copy: "Source, liquidity, issuer, macro, venue and security lanes flow into the VLM core." },
  { id: "security", label: "Security bridge", seconds: 0.88, copy: "Private keys, signatures, entropy and redaction are translated into a short public explanation." },
  { id: "research", label: "Prime Lab", seconds: 0.94, copy: "Prime work is shown as residual reconstruction, fake-zero controls, neighbor shift and replication." },
  { id: "readout", label: "Human readout", seconds: 1.1, copy: "The output is 10, 14 or 20 clear fields depending on Basic, Pro or Advanced." },
  { id: "mirror", label: "Exact mirror", seconds: 0.7, copy: "Browser preview, centered modal and PDF download stay one object, not three generators." },
] as const;

export const pass392ProviderRails = [
  { id: "crypto", label: "Crypto / venues", state: "depth + heartbeat", copy: "Orderbook, klines, reconnect, withdrawals, reserve context and second venue remain separate lanes." },
  { id: "equities", label: "Equities", state: "quote + filing", copy: "Quotes need provider timestamp; stronger issuer copy needs company facts, filing and event context." },
  { id: "fx", label: "FX", state: "reference + intraday", copy: "Reference, intraday feed, holiday calendar and volatility band are shown before confidence." },
  { id: "commodities", label: "Commodities", state: "spot / futures", copy: "Metals, energy and agriculture need source type, contract context and timestamp." },
  { id: "real_estate", label: "Real estate proxy", state: "slow macro", copy: "REIT, housing and data-center proxies explain macro pressure; they are not property valuations." },
  { id: "pdf", label: "PDF mirror", state: "single object", copy: "The same resolved report object renders preview, modal and PDF in PL/EN/DE." },
] as const;

export const pass392SecurityPlainCopy = [
  "Velmère never asks for seed phrase, raw private key or private secret.",
  "A signature can prove control without exposing the private secret; the public report sees only the safe result.",
  "Real Markets uses stronger wording only after timestamp, OHLCV, cache age, fallback flag, session calendar and second source exist.",
  "Entropy/RNG is described as source quality and validation, not as an operational wallet-generation guide.",
  "The user sees sources, gaps and a human readout; thresholds, payloads and abuse rules stay internal.",
] as const;

export const pass392ResearchBridge = [
  { id: "banks", label: "Banks", copy: "Bank-style trust is session control, limits, signatures, logs, audit trail and response playbooks." },
  { id: "crypto", label: "Cryptography", copy: "Cryptography proves control, integrity or authenticity without revealing the private secret." },
  { id: "ecc", label: "ECC / BTC", copy: "Elliptic-curve signatures are explained conceptually: private key stays private, public proof confirms control." },
  { id: "entropy", label: "Real RNG", copy: "Randomness quality means entropy source health, validation and monitoring; the public page stays educational." },
  { id: "primes", label: "Prime Lab", copy: "Prime research is framed as zeta residual reconstruction, benchmarks and falsification controls." },
  { id: "bajak", label: "Bajak Protocol", copy: "Public framing: finite numerical reconstruction, fake-zero controls, neighbor-shift controls and independent replication." },
] as const;

export const pass392AssetVisualPatch: Record<string, VisualPatch> = {
  V: { label: "Visa", glyph: "V", primary: "#1a1f71", secondary: "#f7b600" },
  MA: { label: "Mastercard", glyph: "MC", primary: "#eb001b", secondary: "#f79e1b" },
  AXP: { label: "American Express", glyph: "AX", primary: "#2e77bb", secondary: "#0b2540" },
  PYPL: { label: "PayPal", glyph: "PP", primary: "#003087", secondary: "#009cde" },
  SQ: { label: "Block", glyph: "SQ", primary: "#111827", secondary: "#f8fafc" },
  MELI: { label: "MercadoLibre", glyph: "ML", primary: "#ffe600", secondary: "#111827", text: "#111" },
  CP: { label: "Canadian Pacific Kansas City", glyph: "CP", primary: "#b91c1c", secondary: "#111827" },
  CNI: { label: "Canadian National Railway", glyph: "CN", primary: "#dc2626", secondary: "#111827" },
  CSX: { label: "CSX", glyph: "CS", primary: "#1d4ed8", secondary: "#facc15", text: "#111" },
  NSC: { label: "Norfolk Southern", glyph: "NS", primary: "#111827", secondary: "#f8fafc" },
  TMUS: { label: "T-Mobile US", glyph: "TM", primary: "#e20074", secondary: "#250018" },
  VZ: { label: "Verizon", glyph: "VZ", primary: "#dc2626", secondary: "#111827" },
  T: { label: "AT&T", glyph: "T", primary: "#009fdb", secondary: "#06183b" },
  GE: { label: "GE Aerospace", glyph: "GE", primary: "#0f62fe", secondary: "#06183b" },
  BA: { label: "Boeing", glyph: "BA", primary: "#0033a0", secondary: "#06183b" },
  RTX: { label: "RTX", glyph: "RX", primary: "#dc2626", secondary: "#111827" },
  LMT: { label: "Lockheed Martin", glyph: "LM", primary: "#1e3a8a", secondary: "#111827" },
  NOC: { label: "Northrop Grumman", glyph: "NG", primary: "#111827", secondary: "#94a3b8" },
  "EUR/TRY": { label: "Euro / Turkish Lira", glyph: "TRY", primary: "#dc2626", secondary: "#f8fafc", text: "#111" },
  "USD/TRY": { label: "Dollar / Turkish Lira", glyph: "TRY", primary: "#b91c1c", secondary: "#2563eb" },
  "USD/ZAR": { label: "Dollar / South African Rand", glyph: "ZA", primary: "#16a34a", secondary: "#facc15", text: "#111" },
  "EUR/ZAR": { label: "Euro / South African Rand", glyph: "ZA", primary: "#1d4ed8", secondary: "#16a34a" },
  "USD/MXN": { label: "Dollar / Mexican Peso", glyph: "MX", primary: "#16a34a", secondary: "#dc2626" },
  "EUR/MXN": { label: "Euro / Mexican Peso", glyph: "MX", primary: "#1d4ed8", secondary: "#16a34a" },
  XLI: { label: "Industrial Select Sector", glyph: "IN", primary: "#64748b", secondary: "#111827" },
  XLK: { label: "Technology Select Sector", glyph: "TK", primary: "#2563eb", secondary: "#06183b" },
  XLF: { label: "Financial Select Sector", glyph: "FI", primary: "#16a34a", secondary: "#062b16" },
  XLV: { label: "Health Care Select Sector", glyph: "HC", primary: "#14b8a6", secondary: "#062b2a" },
  URA: { label: "Uranium ETF", glyph: "Ur", primary: "#84cc16", secondary: "#1f2b08" },
  LIT: { label: "Lithium & Battery ETF", glyph: "Li", primary: "#7dd3fc", secondary: "#082f49" },
  WOOD: { label: "Global Timber ETF", glyph: "Wd", primary: "#8b5a2b", secondary: "#2a1208" },
  VNQI: { label: "Global ex-US Real Estate", glyph: "VQ", primary: "#b99d72", secondary: "#24170d" },
};

export const pass392PseudoPricePatch: Record<string, string> = {
  V: "$351.20", MA: "$569.40", AXP: "$377.80", PYPL: "$72.40", SQ: "$69.30", MELI: "$2,280.00",
  CP: "CAD 105.40", CNI: "CAD 148.10", CSX: "$35.80", NSC: "$268.40", TMUS: "$227.50", VZ: "$40.20", T: "$29.70",
  GE: "$284.40", BA: "$203.80", RTX: "$176.20", LMT: "$489.10", NOC: "$586.30",
  "EUR/TRY": "49.20", "USD/TRY": "42.10", "USD/ZAR": "17.80", "EUR/ZAR": "20.78", "USD/MXN": "18.42", "EUR/MXN": "21.50",
  XLI: "$153.70", XLK: "$268.30", XLF: "$53.60", XLV: "$142.50", URA: "$39.10", LIT: "$48.20", WOOD: "$84.40", VNQI: "$45.10",
};

export function buildPass392MarketCoverageUniverse(): UniversalAssetRow[] {
  return [
    row({ id: "pass392-v", rank: 39201, symbol: "V", name: "Visa", assetClass: "stock", riskPressure: 26, sparkTone: "flat" }),
    row({ id: "pass392-ma", rank: 39202, symbol: "MA", name: "Mastercard", assetClass: "stock", riskPressure: 27, sparkTone: "flat" }),
    row({ id: "pass392-axp", rank: 39203, symbol: "AXP", name: "American Express", assetClass: "stock", riskPressure: 32, sparkTone: "flat" }),
    row({ id: "pass392-pypl", rank: 39204, symbol: "PYPL", name: "PayPal", assetClass: "stock", riskPressure: 41, sparkTone: "watch" }),
    row({ id: "pass392-sq", rank: 39205, symbol: "SQ", name: "Block", assetClass: "stock", riskPressure: 44, sparkTone: "watch" }),
    row({ id: "pass392-meli", rank: 39206, symbol: "MELI", name: "MercadoLibre", assetClass: "stock", riskPressure: 36, sparkTone: "up" }),
    row({ id: "pass392-cp", rank: 39207, symbol: "CP", name: "Canadian Pacific Kansas City", assetClass: "stock", riskPressure: 30, sparkTone: "flat" }),
    row({ id: "pass392-cni", rank: 39208, symbol: "CNI", name: "Canadian National Railway", assetClass: "stock", riskPressure: 31, sparkTone: "flat" }),
    row({ id: "pass392-csx", rank: 39209, symbol: "CSX", name: "CSX", assetClass: "stock", riskPressure: 30, sparkTone: "flat" }),
    row({ id: "pass392-nsc", rank: 39210, symbol: "NSC", name: "Norfolk Southern", assetClass: "stock", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass392-tmus", rank: 39211, symbol: "TMUS", name: "T-Mobile US", assetClass: "stock", riskPressure: 25, sparkTone: "up" }),
    row({ id: "pass392-vz", rank: 39212, symbol: "VZ", name: "Verizon", assetClass: "stock", riskPressure: 33, sparkTone: "flat" }),
    row({ id: "pass392-t", rank: 39213, symbol: "T", name: "AT&T", assetClass: "stock", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass392-ge", rank: 39214, symbol: "GE", name: "GE Aerospace", assetClass: "stock", riskPressure: 34, sparkTone: "up" }),
    row({ id: "pass392-ba", rank: 39215, symbol: "BA", name: "Boeing", assetClass: "stock", riskPressure: 55, sparkTone: "volatile" }),
    row({ id: "pass392-rtx", rank: 39216, symbol: "RTX", name: "RTX", assetClass: "stock", riskPressure: 37, sparkTone: "flat" }),
    row({ id: "pass392-lmt", rank: 39217, symbol: "LMT", name: "Lockheed Martin", assetClass: "stock", riskPressure: 36, sparkTone: "flat" }),
    row({ id: "pass392-noc", rank: 39218, symbol: "NOC", name: "Northrop Grumman", assetClass: "stock", riskPressure: 38, sparkTone: "flat" }),
    row({ id: "pass392-eurtry", rank: 39219, symbol: "EUR/TRY", name: "Euro / Turkish Lira", assetClass: "fx", riskPressure: 52, sparkTone: "volatile" }),
    row({ id: "pass392-usdtry", rank: 39220, symbol: "USD/TRY", name: "Dollar / Turkish Lira", assetClass: "fx", riskPressure: 53, sparkTone: "volatile" }),
    row({ id: "pass392-usdzar", rank: 39221, symbol: "USD/ZAR", name: "Dollar / South African Rand", assetClass: "fx", riskPressure: 45, sparkTone: "volatile" }),
    row({ id: "pass392-eurzar", rank: 39222, symbol: "EUR/ZAR", name: "Euro / South African Rand", assetClass: "fx", riskPressure: 44, sparkTone: "volatile" }),
    row({ id: "pass392-usdmxn", rank: 39223, symbol: "USD/MXN", name: "Dollar / Mexican Peso", assetClass: "fx", riskPressure: 39, sparkTone: "flat" }),
    row({ id: "pass392-eurmxn", rank: 39224, symbol: "EUR/MXN", name: "Euro / Mexican Peso", assetClass: "fx", riskPressure: 40, sparkTone: "flat" }),
    row({ id: "pass392-xli", rank: 39225, symbol: "XLI", name: "Industrial Select Sector ETF", assetClass: "etf", riskPressure: 31, sparkTone: "flat" }),
    row({ id: "pass392-xlk", rank: 39226, symbol: "XLK", name: "Technology Select Sector ETF", assetClass: "etf", riskPressure: 34, sparkTone: "up" }),
    row({ id: "pass392-xlf", rank: 39227, symbol: "XLF", name: "Financial Select Sector ETF", assetClass: "etf", riskPressure: 33, sparkTone: "flat" }),
    row({ id: "pass392-xlv", rank: 39228, symbol: "XLV", name: "Health Care Select Sector ETF", assetClass: "etf", riskPressure: 29, sparkTone: "flat" }),
    row({ id: "pass392-ura", rank: 39229, symbol: "URA", name: "Uranium ETF", assetClass: "commodity", riskPressure: 49, sparkTone: "volatile" }),
    row({ id: "pass392-lit", rank: 39230, symbol: "LIT", name: "Lithium & Battery Tech ETF", assetClass: "commodity", riskPressure: 47, sparkTone: "volatile" }),
    row({ id: "pass392-wood", rank: 39231, symbol: "WOOD", name: "Global Timber ETF", assetClass: "real_estate", riskPressure: 35, sparkTone: "flat" }),
    row({ id: "pass392-vnqi", rank: 39232, symbol: "VNQI", name: "Global ex-US Real Estate ETF", assetClass: "real_estate", riskPressure: 36, sparkTone: "flat" }),
  ];
}

export function buildPass392UnifiedReadout(input: { symbol: string; name: string; type: string; risk: number; source: string; mode: Pass392Mode }) {
  const count = input.mode === "advanced" ? 20 : input.mode === "pro" ? 14 : 10;
  const seconds = input.mode === "advanced" ? 10.2 : input.mode === "pro" ? 7.2 : 5.4;
  const band = input.risk >= 62 ? "review" : input.risk >= 42 ? "observe" : "clean";
  const fields: Pass392Field[] = [
    { id: "identity", label: "Identity", value: input.symbol, copy: `${input.name} is locked as ${input.type}; symbol, locale, logo and route match across Shield, Real Markets and PDF.` },
    { id: "language", label: "Language", value: "PL/EN/DE", copy: "The selected page language controls preview, modal and download from one object." },
    { id: "chart", label: "Chart", value: "Shield candles", copy: "Every market class uses one clean candle surface and timeframe controls." },
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
    { id: "surface", label: "Surface", value: "public clean", copy: "Old pass-history surfaces stay hidden from the public product." },
    { id: "operator", label: "Operator", value: "private", copy: "Internal thresholds, payloads and abuse rules stay private." },
    { id: "next", label: "Next step", value: "verify", copy: "The next action is provider verification or export, never pressure or fake scarcity." },
  ];
  return { version: "PASS392.public_fidelity_readout", count, seconds, band, headline: `${input.symbol} · public fidelity AI terminal`, body: `${input.symbol} resolves through one product spine: provider truth, Shield candles, neural source flow, Security education, Prime Lab boundary and exact PDF mirror.`, fields: fields.slice(0, count) };
}
