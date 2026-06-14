import type { UniversalAssetRow } from "./universal-asset-market-matrix";

export type Pass381Mode = "basic" | "pro" | "advanced";

type VisualPatch = { label: string; glyph: string; primary: string; secondary: string; text?: string };

function marketRow(input: Partial<UniversalAssetRow> & Pick<UniversalAssetRow, "id" | "rank" | "symbol" | "name" | "assetClass" | "riskPressure" | "sparkTone">): UniversalAssetRow {
  const family = input.assetClass === "fx" ? "FX" : input.assetClass === "commodity" ? "commodity" : input.assetClass === "real_estate" ? "real-estate proxy" : input.assetClass === "etf" ? "ETF" : input.assetClass === "exchange_token" ? "exchange-linked asset" : "equity";
  return {
    sourceRhythm: input.sourceRhythm ?? `${family} provider heartbeat + session calendar + timestamp + cache-age + fallback flag`,
    priceLane: input.priceLane ?? `${family} Shield-grade OHLCV/candle shell with 1H/4H/1D/1W parity`,
    volumeLane: input.volumeLane ?? `${family} volume, spread, session gap, volatility and provider-drift rail`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${family} issuer/reference/methodology disclosure lane`,
    secondSourceLane: input.secondSourceLane ?? "primary provider ↔ second provider/reference before strong confidence",
    confidenceFloor: input.confidenceFloor ?? 63,
    adapterState: input.adapterState ?? "provider_required",
    humanCopy: input.humanCopy ?? `${input.symbol} is PASS381-ready for a Shield-like real-market card: visual mark, candle chart, source truth, VLM Brain and exact PDF mirror. Live wording waits for provider timestamp and second-source proof.`,
    nextAdapterStep: input.nextAdapterStep ?? "Attach provider key, quote timestamp, OHLCV cache, issuer/reference lane, fallback flag, second-source compare and PDF mirror field.",
    ...input,
  };
}

export const pass381OrchestratedBrainContract = {
  version: "PASS381.live_provider_orchestrated_brain",
  marketRule: "Real Markets behaves like Shield for every asset class: logo, candle chart, timeframe, Basic/Pro/Advanced, VLM Brain and exact PDF mirror. Catalog coverage does not equal live confidence.",
  providerRule: "Live confidence unlocks only when timestamp, cache age, OHLCV payload, provider id, fallback flag and second-source/reference lane are present.",
  aiRule: "Velmère AI writes asset-specific human copy from one resolved object; repeated generic filler is treated as a launch blocker.",
  pdfRule: "Browser preview, modal and downloaded PDF render the same resolved report object and the same selected language: PL, EN or DE.",
  securityRule: "Security page stays simple: private key remains private; signatures prove control; real entropy is validated; public copy hides operator internals.",
  researchRule: "Prime/Riemann/Bajak content stays in numerical-audit, falsification and replication language until independent proof/review exists.",
} as const;

export const pass381ProviderRails = [
  { id: "market-data", label: "Market data", state: "provider-ready", copy: "OHLCV, quote timestamp, cache age and fallback flag are shown before live confidence." },
  { id: "issuer", label: "Issuer/reference", state: "source-bound", copy: "Stocks use issuer filings; FX/commodities use reference or methodology lanes." },
  { id: "chart", label: "Shield chart", state: "one-shell", copy: "Crypto, stocks, FX, ETFs and commodities share the same candle/timeframe contract." },
  { id: "brain", label: "VLM Brain", state: "one-object", copy: "The brain transforms source lanes into 10, 14 or 20 concise fields instead of debug tiles." },
  { id: "pdf", label: "PDF mirror", state: "exact", copy: "The downloaded report mirrors the preview object and language; no second generator creates random text." },
  { id: "security", label: "Security", state: "public-safe", copy: "ECC, entropy and bank-control education stays conceptual and does not expose secrets or operational internals." },
] as const;

export const pass381BrainPhases = [
  { id: "seal", label: "Identity seal", seconds: 0.7, copy: "Symbol, market family, locale and visual mark are locked." },
  { id: "provider", label: "Provider lock", seconds: 1.0, copy: "Quote timestamp, cache-age, OHLCV and fallback state set live confidence." },
  { id: "chart", label: "Candle forge", seconds: 1.1, copy: "The same Shield-style candle shell appears for stocks, FX, ETFs and crypto." },
  { id: "neural", label: "Neural source flow", seconds: 1.4, copy: "Provider, issuer, liquidity, macro and second-source lanes feed the VLM core." },
  { id: "security", label: "Security bridge", seconds: 1.1, copy: "Signatures, private-key boundaries, sessions and redaction are translated into simple public language." },
  { id: "entropy", label: "Entropy check", seconds: 1.0, copy: "Real RNG is explained as measurable physical entropy plus validation, not a wallet shortcut." },
  { id: "prime", label: "Prime lab boundary", seconds: 1.2, copy: "Bajak Protocol is framed as finite numerical reconstruction, falsification and replication." },
  { id: "readout", label: "Human readout", seconds: 1.5, copy: "Velmère AI writes specific, short findings and missing-proof notes for the selected asset." },
  { id: "pdf", label: "PDF mirror", seconds: 0.9, copy: "Preview and download receive the same fields and selected language." },
] as const;

const pass381Fields = [
  { id: "identity", label: "Identity", value: "locked", copy: "Symbol, asset class, locale and visual mark are resolved first." },
  { id: "chart", label: "Chart", value: "Shield-grade", copy: "One candle/timeframe shell is reused across crypto and real markets." },
  { id: "provider", label: "Provider", value: "timestamp-first", copy: "Fresh claims wait for quote time, provider id and cache age." },
  { id: "fallback", label: "Fallback", value: "visible", copy: "Fallback/cached data is shown as fallback, never as fresh live certainty." },
  { id: "second", label: "Second source", value: "required", copy: "Stronger confidence waits for a reference, venue or issuer lane." },
  { id: "risk", label: "Risk", value: "review", copy: "Risk is a review pressure label, not a buy/sell instruction." },
  { id: "issuer", label: "Issuer/ref", value: "matched", copy: "Stocks use issuer disclosures; FX/commodities use reference methodology." },
  { id: "liquidity", label: "Liquidity", value: "separate", copy: "Depth, volume and spread are not mixed with social hype." },
  { id: "brain", label: "VLM Brain", value: "one object", copy: "The same resolved report object feeds modal, preview and PDF." },
  { id: "locale", label: "Language", value: "PL/EN/DE", copy: "The selected site language controls every report surface." },
  { id: "security", label: "Security", value: "plain", copy: "Private keys, signatures and redaction are explained without exposing secrets." },
  { id: "entropy", label: "Entropy", value: "validated", copy: "RNG quality means measured entropy source and validation, not marketing noise." },
  { id: "ecc", label: "ECC/BTC", value: "concept", copy: "Bitcoin signatures are explained conceptually without key-generation instructions." },
  { id: "bank", label: "Bank analogy", value: "controls", copy: "Limits, approvals, logs and audits make security understandable." },
  { id: "prime", label: "Prime Lab", value: "audit", copy: "Prime work is shown as reconstruction, benchmark and falsification path." },
  { id: "determinism", label: "Determinism", value: "hypothesis", copy: "The animation shows noise-to-resonance as a research idea, not a theorem claim." },
  { id: "pdf", label: "PDF", value: "exact mirror", copy: "The downloaded PDF cannot invent a different story from the preview." },
  { id: "copy", label: "AI copy", value: "specific", copy: "Generic repeated lines are replaced by asset-specific context and missing evidence." },
  { id: "operator", label: "Operator", value: "hidden", copy: "Sensitive source rules stay behind the public interface." },
  { id: "launch", label: "Launch", value: "fidelity", copy: "Clean UI, source truth and exact PDF parity are launch blockers until stable." },
] as const;

export function buildPass381UnifiedReadout(input: { symbol: string; name: string; type: string; risk: number; source: string; mode: Pass381Mode }) {
  const count = input.mode === "advanced" ? 20 : input.mode === "pro" ? 14 : 10;
  const seconds = pass381BrainPhases.reduce((sum, phase) => sum + phase.seconds, 0) + (input.mode === "advanced" ? 2.1 : input.mode === "pro" ? 1.0 : 0.3);
  const band = input.risk >= 60 ? "operator-review" : input.risk >= 43 ? "provider-watch" : "launch-ready-preview";
  return {
    version: "PASS381.orchestrated_brain_readout",
    count,
    seconds: Number(seconds.toFixed(1)),
    band,
    headline: `${input.symbol} runs through one orchestrated Velmère path: provider truth, Shield-grade chart, VLM Brain, security bridge, prime-lab boundary and exact PDF mirror.`,
    body: `${input.name} (${input.type}) shows ${count} concise fields. Source lane: ${input.source}. Missing provider proof lowers confidence instead of creating repeated or random PDF text.`,
    fields: pass381Fields.slice(0, count),
  };
}

export const pass381SecurityLaunchCopy = [
  "Security copy stays public and simple: private keys remain private, signatures prove control, sessions and limits reduce abuse, and reports are redacted before public display.",
  "Real RNG means a physical entropy source plus validation and monitoring; Velmère teaches the principle without generating, recovering or exposing wallet secrets.",
  "The Research Lab explains prime numbers, ECC and determinism as education and numerical audit, with replication and falsification before strong claims.",
] as const;

export const pass381PdfMirror = {
  title: "PASS381 · Orchestrated market AI mirror",
  rule: "Browser preview, modal and downloaded PDF share one resolved report object with the same locale, same provider truth rails, same VLM Brain fields and same Research/Security boundary.",
  sections: ["identity", "provider", "Shield chart", "VLM Brain", "security", "entropy", "ECC/BTC", "prime lab", "PDF mirror", "missing evidence"],
} as const;

export const pass381MarketExpansion: UniversalAssetRow[] = [
  marketRow({ id: "pass381-bk", rank: 493, symbol: "BK", name: "BNY Mellon", assetClass: "stock", riskPressure: 29, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + custody market infrastructure lane" }),
  marketRow({ id: "pass381-schw", rank: 494, symbol: "SCHW", name: "Charles Schwab", assetClass: "stock", riskPressure: 40, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + brokerage/custody lane" }),
  marketRow({ id: "pass381-ry", rank: 495, symbol: "RY", name: "Royal Bank of Canada", assetClass: "stock", riskPressure: 31, sparkTone: "flat", proofOrDisclosureLane: "issuer disclosure + bank lane" }),
  marketRow({ id: "pass381-td", rank: 496, symbol: "TD", name: "Toronto-Dominion Bank", assetClass: "stock", riskPressure: 38, sparkTone: "watch", proofOrDisclosureLane: "issuer disclosure + bank lane" }),
  marketRow({ id: "pass381-hsbc", rank: 497, symbol: "HSBC", name: "HSBC Holdings", assetClass: "stock", riskPressure: 36, sparkTone: "watch", proofOrDisclosureLane: "issuer disclosure + global bank lane" }),
  marketRow({ id: "pass381-san", rank: 498, symbol: "SAN", name: "Banco Santander", assetClass: "stock", riskPressure: 34, sparkTone: "flat", proofOrDisclosureLane: "issuer disclosure + EU bank lane" }),
  marketRow({ id: "pass381-ing", rank: 499, symbol: "ING", name: "ING Group", assetClass: "stock", riskPressure: 32, sparkTone: "flat", proofOrDisclosureLane: "issuer disclosure + EU bank lane" }),
  marketRow({ id: "pass381-mu", rank: 500, symbol: "MU", name: "Micron Technology", assetClass: "stock", riskPressure: 45, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + memory/AI hardware lane" }),
  marketRow({ id: "pass381-txn", rank: 501, symbol: "TXN", name: "Texas Instruments", assetClass: "stock", riskPressure: 31, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + semiconductor lane" }),
  marketRow({ id: "pass381-adi", rank: 502, symbol: "ADI", name: "Analog Devices", assetClass: "stock", riskPressure: 30, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + analog semiconductor lane" }),
  marketRow({ id: "pass381-intu", rank: 503, symbol: "INTU", name: "Intuit", assetClass: "stock", riskPressure: 34, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + fintech/software lane" }),
  marketRow({ id: "pass381-now", rank: 504, symbol: "NOW", name: "ServiceNow", assetClass: "stock", riskPressure: 39, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + enterprise AI workflow lane" }),
  marketRow({ id: "pass381-spot", rank: 505, symbol: "SPOT", name: "Spotify", assetClass: "stock", riskPressure: 37, sparkTone: "watch", proofOrDisclosureLane: "issuer disclosure + consumer platform lane" }),
  marketRow({ id: "pass381-epd", rank: 506, symbol: "ENB", name: "Enbridge", assetClass: "stock", riskPressure: 33, sparkTone: "flat", proofOrDisclosureLane: "issuer disclosure + energy infrastructure lane" }),
  marketRow({ id: "pass381-cop", rank: 507, symbol: "COP", name: "ConocoPhillips", assetClass: "stock", riskPressure: 39, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + energy lane" }),
  marketRow({ id: "pass381-slb", rank: 508, symbol: "SLB", name: "SLB", assetClass: "stock", riskPressure: 41, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + energy services lane" }),
  marketRow({ id: "pass381-eurchf", rank: 509, symbol: "EUR/CHF", name: "Euro / Swiss Franc", assetClass: "fx", riskPressure: 28, sparkTone: "flat" }),
  marketRow({ id: "pass381-gbpusd", rank: 510, symbol: "GBP/USD", name: "Pound / Dollar", assetClass: "fx", riskPressure: 34, sparkTone: "watch" }),
  marketRow({ id: "pass381-audjpy", rank: 511, symbol: "AUD/JPY", name: "Australian Dollar / Yen", assetClass: "fx", riskPressure: 46, sparkTone: "watch" }),
  marketRow({ id: "pass381-cadjpy", rank: 512, symbol: "CAD/JPY", name: "Canadian Dollar / Yen", assetClass: "fx", riskPressure: 42, sparkTone: "watch" }),
  marketRow({ id: "pass381-chfjpy", rank: 513, symbol: "CHF/JPY", name: "Swiss Franc / Yen", assetClass: "fx", riskPressure: 40, sparkTone: "watch" }),
  marketRow({ id: "pass381-usdtry", rank: 514, symbol: "USD/TRY", name: "Dollar / Turkish Lira", assetClass: "fx", riskPressure: 64, sparkTone: "watch", confidenceFloor: 48 }),
  marketRow({ id: "pass381-usdpln", rank: 515, symbol: "USD/PLN", name: "Dollar / Polish Zloty", assetClass: "fx", riskPressure: 35, sparkTone: "watch" }),
  marketRow({ id: "pass381-eurpln", rank: 516, symbol: "EUR/PLN", name: "Euro / Polish Zloty", assetClass: "fx", riskPressure: 31, sparkTone: "flat" }),
  marketRow({ id: "pass381-qqqm", rank: 517, symbol: "QQQM", name: "Nasdaq 100 Mini ETF", assetClass: "etf", riskPressure: 38, sparkTone: "watch", proofOrDisclosureLane: "ETF methodology + tech growth lane" }),
  marketRow({ id: "pass381-vti", rank: 518, symbol: "VTI", name: "Total US Market ETF", assetClass: "etf", riskPressure: 29, sparkTone: "flat", proofOrDisclosureLane: "ETF methodology + broad market lane" }),
  marketRow({ id: "pass381-vea", rank: 519, symbol: "VEA", name: "Developed Markets ETF", assetClass: "etf", riskPressure: 33, sparkTone: "flat", proofOrDisclosureLane: "ETF methodology + developed ex-US lane" }),
  marketRow({ id: "pass381-vwo", rank: 520, symbol: "VWO", name: "Emerging Markets ETF", assetClass: "etf", riskPressure: 47, sparkTone: "watch", proofOrDisclosureLane: "ETF methodology + emerging market lane" }),
  marketRow({ id: "pass381-bnd", rank: 521, symbol: "BND", name: "Total Bond ETF", assetClass: "etf", riskPressure: 30, sparkTone: "flat", proofOrDisclosureLane: "ETF methodology + aggregate bond lane" }),
  marketRow({ id: "pass381-tip", rank: 522, symbol: "TIP", name: "TIPS ETF", assetClass: "etf", riskPressure: 34, sparkTone: "flat", proofOrDisclosureLane: "ETF methodology + inflation-protected bond lane" }),
  marketRow({ id: "pass381-platinum", rank: 523, symbol: "PLATINUM", name: "Platinum", assetClass: "commodity", riskPressure: 43, sparkTone: "watch", proofOrDisclosureLane: "precious metal spot/futures methodology lane" }),
  marketRow({ id: "pass381-palladium", rank: 524, symbol: "PALLADIUM", name: "Palladium", assetClass: "commodity", riskPressure: 52, sparkTone: "watch", proofOrDisclosureLane: "precious metal spot/futures methodology lane" }),
  marketRow({ id: "pass381-lithium", rank: 525, symbol: "LITHIUM", name: "Lithium proxy", assetClass: "commodity", riskPressure: 55, sparkTone: "watch", proofOrDisclosureLane: "battery commodity proxy methodology lane", confidenceFloor: 49 }),
  marketRow({ id: "pass381-coffee", rank: 526, symbol: "COFFEE", name: "Coffee futures proxy", assetClass: "commodity", riskPressure: 49, sparkTone: "watch", proofOrDisclosureLane: "agriculture futures methodology lane" }),
  marketRow({ id: "pass381-cocoa", rank: 527, symbol: "COCOA", name: "Cocoa futures proxy", assetClass: "commodity", riskPressure: 59, sparkTone: "watch", proofOrDisclosureLane: "agriculture futures methodology lane", confidenceFloor: 50 }),
  marketRow({ id: "pass381-eu-housing", rank: 528, symbol: "HOUSING-EU", name: "Europe housing macro proxy", assetClass: "real_estate", riskPressure: 43, sparkTone: "watch", adapterState: "slow_macro", proofOrDisclosureLane: "housing series + REIT proxy lane" }),
  marketRow({ id: "pass381-cre-credit", rank: 529, symbol: "CRE-CREDIT", name: "Commercial real estate credit proxy", assetClass: "real_estate", riskPressure: 56, sparkTone: "watch", adapterState: "slow_macro", proofOrDisclosureLane: "CRE credit spread + REIT basket lane", confidenceFloor: 49 }),
  marketRow({ id: "pass381-data-reit", rank: 530, symbol: "DATA-REIT", name: "Data center REIT proxy", assetClass: "real_estate", riskPressure: 38, sparkTone: "flat", adapterState: "slow_macro", proofOrDisclosureLane: "data center REIT + AI infrastructure lane" }),
];

export const pass381AssetVisualPatch: Record<string, VisualPatch> = {
  BK: { label: "BNY Mellon", glyph: "BK", primary: "#0a4b78", secondary: "#d8b36a" }, SCHW: { label: "Schwab", glyph: "SC", primary: "#006991", secondary: "#071728" }, RY: { label: "RBC", glyph: "RY", primary: "#0051a5", secondary: "#fedf01", text: "#111" }, TD: { label: "TD Bank", glyph: "TD", primary: "#008a00", secondary: "#061b06" }, HSBC: { label: "HSBC", glyph: "HS", primary: "#db0011", secondary: "#111827" }, SAN: { label: "Santander", glyph: "SA", primary: "#ec0000", secondary: "#2a0505" }, ING: { label: "ING", glyph: "IN", primary: "#ff6200", secondary: "#2b1204" },
  MU: { label: "Micron", glyph: "MU", primary: "#1f56a0", secondary: "#07172c" }, TXN: { label: "Texas Instruments", glyph: "TX", primary: "#cc0000", secondary: "#260505" }, ADI: { label: "Analog Devices", glyph: "AD", primary: "#111827", secondary: "#d8b36a" }, INTU: { label: "Intuit", glyph: "IU", primary: "#236cce", secondary: "#061538" }, NOW: { label: "ServiceNow", glyph: "NW", primary: "#81b5a1", secondary: "#0c2119" }, SPOT: { label: "Spotify", glyph: "SP", primary: "#1db954", secondary: "#061b0d" }, ENB: { label: "Enbridge", glyph: "EN", primary: "#ffd100", secondary: "#da291c", text: "#111" }, COP: { label: "Conoco", glyph: "CP", primary: "#d71920", secondary: "#220406" }, SLB: { label: "SLB", glyph: "SL", primary: "#0033a0", secondary: "#061238" },
  "EUR/CHF": { label: "Euro Franc", glyph: "€F", primary: "#225eea", secondary: "#d52b1e" }, "GBP/USD": { label: "Pound Dollar", glyph: "£$", primary: "#314a9f", secondary: "#0f8d61" }, "AUD/JPY": { label: "Aussie Yen", glyph: "A¥", primary: "#1d4e89", secondary: "#bc002d" }, "CAD/JPY": { label: "Cad Yen", glyph: "C¥", primary: "#d52b1e", secondary: "#bc002d" }, "CHF/JPY": { label: "Franc Yen", glyph: "F¥", primary: "#d52b1e", secondary: "#bc002d" }, "USD/TRY": { label: "Dollar Lira", glyph: "$T", primary: "#0f8d61", secondary: "#e30a17" }, "USD/PLN": { label: "Dollar Zloty", glyph: "$Z", primary: "#0f8d61", secondary: "#dc143c" }, "EUR/PLN": { label: "Euro Zloty", glyph: "€Z", primary: "#225eea", secondary: "#dc143c" },
  QQQM: { label: "Nasdaq Mini", glyph: "QM", primary: "#315bdc", secondary: "#0b1438" }, VTI: { label: "Total Market", glyph: "VT", primary: "#315bdc", secondary: "#0b1438" }, VEA: { label: "Developed ETF", glyph: "VE", primary: "#315bdc", secondary: "#0b1438" }, VWO: { label: "EM ETF", glyph: "VW", primary: "#d8b36a", secondary: "#241608" }, BND: { label: "Bond ETF", glyph: "BD", primary: "#315bdc", secondary: "#0b1438" }, TIP: { label: "TIPS", glyph: "TP", primary: "#d8b36a", secondary: "#241608" },
  PLATINUM: { label: "Platinum", glyph: "Pt", primary: "#e5e7eb", secondary: "#6b7280", text: "#111" }, PALLADIUM: { label: "Palladium", glyph: "Pd", primary: "#c0c0c0", secondary: "#3b4250" }, LITHIUM: { label: "Lithium", glyph: "Li", primary: "#a7f3d0", secondary: "#064e3b", text: "#111" }, COFFEE: { label: "Coffee", glyph: "Cf", primary: "#6f4e37", secondary: "#24120a" }, COCOA: { label: "Cocoa", glyph: "Cc", primary: "#7b3f00", secondary: "#221006" }, "HOUSING-EU": { label: "EU Housing", glyph: "EH", primary: "#b99d72", secondary: "#24170d" }, "CRE-CREDIT": { label: "CRE Credit", glyph: "CR", primary: "#9b7d52", secondary: "#211407" }, "DATA-REIT": { label: "Data REIT", glyph: "DR", primary: "#9b7d52", secondary: "#211407" },
};

export const pass381PseudoPricePatch: Record<string, string> = {
  BK: "$89.20", SCHW: "$81.40", RY: "$121.60", TD: "$64.70", HSBC: "$52.40", SAN: "$6.30", ING: "$20.80", MU: "$138.40", TXN: "$188.20", ADI: "$236.10", INTU: "$680.40", NOW: "$985.20", SPOT: "$615.30", ENB: "$50.10", COP: "$95.60", SLB: "$35.80",
  "EUR/CHF": "0.93", "GBP/USD": "1.35", "AUD/JPY": "99.40", "CAD/JPY": "107.80", "CHF/JPY": "174.20", "USD/TRY": "42.80", "USD/PLN": "3.78", "EUR/PLN": "4.28",
  QQQM: "$232.40", VTI: "$327.20", VEA: "$58.20", VWO: "$52.70", BND: "$73.40", TIP: "$109.50", PLATINUM: "$1,090", PALLADIUM: "$950", LITHIUM: "index", COFFEE: "$3.45", COCOA: "$8,450", "HOUSING-EU": "macro", "CRE-CREDIT": "macro", "DATA-REIT": "macro",
};

export function buildPass381MarketCoverageUniverse() {
  return pass381MarketExpansion;
}
