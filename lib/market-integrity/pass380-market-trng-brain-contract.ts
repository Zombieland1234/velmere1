import type { UniversalAssetRow } from "./universal-asset-market-matrix";

export type Pass380Mode = "basic" | "pro" | "advanced";

function marketRow(input: Partial<UniversalAssetRow> & Pick<UniversalAssetRow, "id" | "rank" | "symbol" | "name" | "assetClass" | "riskPressure" | "sparkTone">): UniversalAssetRow {
  const family = input.assetClass === "fx" ? "FX" : input.assetClass === "commodity" ? "commodity" : input.assetClass === "real_estate" ? "real-estate proxy" : input.assetClass === "etf" ? "ETF" : input.assetClass === "exchange_token" ? "exchange-linked asset" : "equity";
  return {
    sourceRhythm: input.sourceRhythm ?? `${family} provider heartbeat + session calendar + timestamp + cache-age + fallback flag`,
    priceLane: input.priceLane ?? `${family} Shield-grade OHLCV shell with timeframe parity`,
    volumeLane: input.volumeLane ?? `${family} volume, spread, session gap, volatility and provider drift rail`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${family} issuer/reference/methodology disclosure lane`,
    secondSourceLane: input.secondSourceLane ?? "primary provider ↔ second provider/reference before strong confidence",
    confidenceFloor: input.confidenceFloor ?? 62,
    adapterState: input.adapterState ?? "provider_required",
    humanCopy: input.humanCopy ?? `${input.symbol} is catalog-ready for PASS380: icon, Shield-grade candles, Basic/Pro/Advanced AI Brain, source truth and PDF parity. It never pretends to be live without timestamps and a provider contract.`,
    nextAdapterStep: input.nextAdapterStep ?? "Attach provider key, server cache, quote timestamp, OHLCV adapter, issuer/reference rail, fallback flag and second-source compare.",
    ...input,
  };
}

export const pass380LiveTruthContract = {
  version: "PASS380.market_trng_brain_contract",
  realMarketRule: "Real Markets can carry a large global universe, but live confidence is unlocked only by timestamp, OHLCV, cache-age, fallback flag and second-source/reference proof.",
  brainRule: "Crypto, equities, FX, commodities and exchange-health use one VLM AI Brain: scan animation first, then a short human readout; no debug tile wall on the public surface.",
  pdfRule: "The Browser preview, modal and downloaded PDF must render the same locale-locked report object in PL/EN/DE; the PDF cannot create a second story.",
  securityRule: "Security copy explains bank-grade layers, signatures, entropy quality and redacted proof without exposing operational internals or wallet secrets.",
  researchRule: "Prime/Riemann/Bajak content is presented as numerical audit, falsification and replication path, not a formal theorem claim.",
} as const;

export const pass380ProviderDeck = [
  { id: "equities", label: "Equities", cadence: "intraday/daily", source: "market-data provider + SEC/issuer disclosures", boundary: "No filing interpretation without timestamp and issuer match." },
  { id: "fx", label: "FX", cadence: "reference + intraday", source: "ECB/reference + FX provider", boundary: "Reference rate is context, not executable trade price." },
  { id: "commodities", label: "Commodities", cadence: "spot/futures", source: "metals/energy/agri provider", boundary: "Show contract/methodology before strong copy." },
  { id: "real_estate", label: "Real estate", cadence: "slow macro", source: "REIT ETF + housing/credit series", boundary: "Slow macro context only; no second-by-second alarm." },
  { id: "exchange_health", label: "Exchange health", cadence: "fast live + public snapshots", source: "MEXC/Binance/venue freshness + reserve context", boundary: "Reserve snapshots are context, not a guarantee." },
  { id: "browser_pdf", label: "Browser/PDF", cadence: "same object", source: "resolved report object", boundary: "Preview and download share facts, language and missing-evidence notes." },
] as const;

export const pass380BrainPhases = [
  { id: "identity", label: "Identity lock", seconds: 0.7, copy: "Symbol, market family, locale and visual mark are locked before analysis." },
  { id: "provider", label: "Provider pulse", seconds: 1.0, copy: "Timestamp, OHLCV, cache age and fallback state define live confidence." },
  { id: "chart", label: "Shield chart forge", seconds: 1.1, copy: "The same candle/timeframe shell is used for crypto, stocks, FX and commodities." },
  { id: "neural", label: "Neural audit core", seconds: 1.5, copy: "Source lanes flow into a single VLM brain instead of public debug blocks." },
  { id: "bank", label: "Bank-grade bridge", seconds: 1.1, copy: "Sessions, limits, signatures, logs and redaction are explained like layered controls." },
  { id: "entropy", label: "Real entropy lane", seconds: 1.2, copy: "RNG is described as tested physical entropy plus validation, not a marketing word." },
  { id: "ecc", label: "ECC/BTC education", seconds: 1.1, copy: "Wallet keys and signatures are explained conceptually without giving key-generation instructions." },
  { id: "prime", label: "Prime research boundary", seconds: 1.3, copy: "Bajak/prime claims stay in numerical-audit, benchmark and replication language." },
  { id: "readout", label: "Human readout", seconds: 1.6, copy: "Velmère AI writes short, asset-specific conclusions and missing-evidence notes." },
  { id: "pdf", label: "PDF mirror", seconds: 1.0, copy: "Preview and downloaded PDF render the same locale-aware sections." },
] as const;

const pass380Fields = [
  { id: "identity", label: "Identity", value: "locked", copy: "Symbol, asset class and locale are fixed before the audit starts." },
  { id: "visual", label: "Visual mark", value: "resolved", copy: "Every instrument has a real-looking mark or a premium fallback glyph." },
  { id: "chart", label: "Chart shell", value: "Shield-grade", copy: "Candles, volume and timeframe follow the same interaction pattern as Shield." },
  { id: "provider", label: "Provider", value: "truth first", copy: "Catalog presence is separated from live quote confidence." },
  { id: "timestamp", label: "Timestamp", value: "required", copy: "Fresh wording waits for quote time, cache age and session context." },
  { id: "fallback", label: "Fallback", value: "visible", copy: "If a cache or fallback is used, the UI says so instead of pretending certainty." },
  { id: "second", label: "Second source", value: "compare", copy: "Stronger confidence waits for another venue, provider or reference lane." },
  { id: "liquidity", label: "Liquidity", value: "separate", copy: "Depth, volume and spread are separated from trend and hype language." },
  { id: "issuer", label: "Issuer/ref", value: "matched", copy: "Stocks use issuer filings; FX and commodities use reference/methodology context." },
  { id: "risk", label: "Risk", value: "review pressure", copy: "Risk remains a review label, never a buy/sell instruction." },
  { id: "security", label: "Security", value: "plain language", copy: "Private keys, signatures, session controls and redaction are explained simply." },
  { id: "entropy", label: "Entropy", value: "tested source", copy: "Real RNG means an entropy source that can be measured, validated and monitored." },
  { id: "ecc", label: "ECC/BTC", value: "conceptual", copy: "The public page teaches signatures and curves without exposing wallet-generation steps." },
  { id: "bank", label: "Bank layer", value: "controls", copy: "Limits, approvals, logs and verification are used as a familiar security analogy." },
  { id: "prime", label: "Prime lab", value: "audit", copy: "The prime-number work is framed as numerical reconstruction and falsification tests." },
  { id: "determinism", label: "Determinism", value: "visual hypothesis", copy: "Noise-to-resonance animation shows the research idea without claiming a theorem." },
  { id: "locale", label: "Locale", value: "PL/EN/DE", copy: "One selected language drives preview, modal and downloaded PDF." },
  { id: "pdf", label: "PDF", value: "same object", copy: "The downloaded file mirrors the same resolved fields as the preview." },
  { id: "copy", label: "AI copy", value: "asset-specific", copy: "Velmère AI avoids repeated filler and explains what actually matters for the selected asset." },
  { id: "operator", label: "Operator layer", value: "hidden", copy: "Sensitive heuristics and source internals are kept out of public copy." },
] as const;

export function buildPass380UnifiedReadout(input: { symbol: string; name: string; type: string; risk: number; source: string; mode: Pass380Mode }) {
  const count = input.mode === "advanced" ? 20 : input.mode === "pro" ? 14 : 10;
  const seconds = pass380BrainPhases.reduce((sum, phase) => sum + phase.seconds, 0) + (input.mode === "advanced" ? 1.8 : input.mode === "pro" ? 0.8 : 0.2);
  const band = input.risk >= 58 ? "operator-review" : input.risk >= 42 ? "provider-watch" : "launch-ready-preview";
  return {
    version: "PASS380.market_trng_brain_readout",
    count,
    seconds: Number(seconds.toFixed(1)),
    band,
    headline: `${input.symbol} enters one Velmère brain path: provider truth, Shield-grade chart, security bridge, entropy education, prime-lab boundary and PDF mirror.`,
    body: `${input.name} (${input.type}) shows ${count} short fields. Source lane: ${input.source}. Missing proof reduces confidence instead of creating repeated AI filler.`,
    fields: pass380Fields.slice(0, count),
  };
}

export const pass380CryptoEducationDeck = [
  { id: "crypto", title: "Czym jest kryptografia", copy: "Kryptografia pozwala udowodnić kontrolę, integralność i autentyczność danych bez ujawniania sekretu." },
  { id: "banks", title: "Jak działają banki", copy: "Banki używają warstw: kontrole dostępu, limity, logi, podpisy, audyty i rozdzielenie ról. Velmère pokazuje podobną logikę jako prosty język bezpieczeństwa." },
  { id: "ecc", title: "Krzywa eliptyczna BTC", copy: "W Bitcoinie klucz prywatny jest sekretem, a podpis pozwala wykazać kontrolę. Publiczna edukacja nie pokazuje generowania ani odzyskiwania sekretów." },
  { id: "trng", title: "Real RNG / TRNG", copy: "Losowość w kryptografii wymaga entropii z realnego źródła oraz testów jakości. Velmère tłumaczy zasadę, ale nie generuje ani nie ujawnia kluczy." },
  { id: "primes", title: "Liczby pierwsze", copy: "Liczby pierwsze pokazują, dlaczego struktura i trudność obliczeniowa są centralne w kryptografii. Research Lab rozdziela edukację od praktycznych sekretów." },
  { id: "bajak", title: "Bajak Protocol", copy: "Pokazujemy audyt numeryczny, benchmarki, falsyfikację i plan replikacji. To brzmi mocno, ale uczciwie: research, nie publiczny certyfikat prawdy." },
] as const;

export const pass380SecurityPlainCopy = [
  "Security page stays simple: private key remains private, signature proves control, sessions and limits reduce abuse, and reports are redacted before public display.",
  "Real RNG is described as physical entropy plus validation, not as a wallet generator or a promise that secrets can be recovered.",
  "Research Lab explains primes, ECC and determinism as education and numerical audit; it does not provide wallet-breaking instructions or formal theorem claims.",
] as const;

export const pass380PdfParityContract = {
  title: "PASS380 · Market/TRNG brain mirror",
  rule: "Preview, modal and downloaded PDF share one locale-locked report object covering market provider truth, VLM AI Brain fields, security language, entropy education and prime-lab boundaries.",
  sections: ["provider truth", "Shield chart", "AI Brain", "security", "entropy", "ECC/BTC", "bank controls", "prime lab", "PDF parity", "missing evidence"],
} as const;

export const pass380MarketExpansion: UniversalAssetRow[] = [
  // Global banks / payment / market plumbing
  marketRow({ id: "pass380-ubs", rank: 441, symbol: "UBS", name: "UBS Group", assetClass: "stock", riskPressure: 34, sparkTone: "flat", proofOrDisclosureLane: "Swiss issuer disclosure + global bank lane" }),
  marketRow({ id: "pass380-cs", rank: 442, symbol: "DB", name: "Deutsche Bank NY", assetClass: "stock", riskPressure: 44, sparkTone: "watch", proofOrDisclosureLane: "SEC/EU issuer disclosure + bank risk lane" }),
  marketRow({ id: "pass380-pnc", rank: 443, symbol: "PNC", name: "PNC Financial", assetClass: "stock", riskPressure: 32, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + regional bank lane" }),
  marketRow({ id: "pass380-usb", rank: 444, symbol: "USB", name: "U.S. Bancorp", assetClass: "stock", riskPressure: 32, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + regional bank lane" }),
  marketRow({ id: "pass380-tfc", rank: 445, symbol: "TFC", name: "Truist Financial", assetClass: "stock", riskPressure: 36, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + regional bank lane" }),
  marketRow({ id: "pass380-stt", rank: 446, symbol: "STT", name: "State Street", assetClass: "stock", riskPressure: 29, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + custody/ETF infrastructure lane" }),
  marketRow({ id: "pass380-adyen", rank: 447, symbol: "ADYEN.AS", name: "Adyen", assetClass: "stock", riskPressure: 38, sparkTone: "watch", proofOrDisclosureLane: "EU issuer disclosure + payment lane" }),
  marketRow({ id: "pass380-sq", rank: 448, symbol: "SQ", name: "Block", assetClass: "stock", riskPressure: 52, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + payments/bitcoin exposure lane", confidenceFloor: 55 }),
  marketRow({ id: "pass380-pypl", rank: 449, symbol: "PYPL", name: "PayPal", assetClass: "stock", riskPressure: 41, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + payments lane" }),
  marketRow({ id: "pass380-afrm", rank: 450, symbol: "AFRM", name: "Affirm", assetClass: "stock", riskPressure: 58, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + consumer credit lane", confidenceFloor: 52 }),
  // Cyber / AI / infrastructure
  marketRow({ id: "pass380-crwd", rank: 451, symbol: "CRWD", name: "CrowdStrike", assetClass: "stock", riskPressure: 43, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + cybersecurity incident lane" }),
  marketRow({ id: "pass380-panw", rank: 452, symbol: "PANW", name: "Palo Alto Networks", assetClass: "stock", riskPressure: 36, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + cybersecurity lane" }),
  marketRow({ id: "pass380-ftnt", rank: 453, symbol: "FTNT", name: "Fortinet", assetClass: "stock", riskPressure: 35, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + network security lane" }),
  marketRow({ id: "pass380-zs", rank: 454, symbol: "ZS", name: "Zscaler", assetClass: "stock", riskPressure: 45, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + cloud security lane" }),
  marketRow({ id: "pass380-net", rank: 455, symbol: "NET", name: "Cloudflare", assetClass: "stock", riskPressure: 48, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + edge/cloud lane" }),
  marketRow({ id: "pass380-ddog", rank: 456, symbol: "DDOG", name: "Datadog", assetClass: "stock", riskPressure: 44, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + observability lane" }),
  marketRow({ id: "pass380-snow", rank: 457, symbol: "SNOW", name: "Snowflake", assetClass: "stock", riskPressure: 47, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + data cloud lane" }),
  marketRow({ id: "pass380-arm", rank: 458, symbol: "ARM", name: "Arm Holdings", assetClass: "stock", riskPressure: 43, sparkTone: "watch", proofOrDisclosureLane: "issuer disclosure + semiconductor IP lane" }),
  marketRow({ id: "pass380-smci", rank: 459, symbol: "SMCI", name: "Super Micro Computer", assetClass: "stock", riskPressure: 62, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + AI hardware review lane", confidenceFloor: 49 }),
  marketRow({ id: "pass380-mstr", rank: 460, symbol: "MSTR", name: "MicroStrategy", assetClass: "stock", riskPressure: 68, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + bitcoin treasury exposure lane", confidenceFloor: 48 }),
  // Europe luxury / industrials / consumer
  marketRow({ id: "pass380-rms", rank: 461, symbol: "RMS.PA", name: "Hermès", assetClass: "stock", riskPressure: 24, sparkTone: "flat", proofOrDisclosureLane: "EU issuer disclosure + luxury sector lane" }),
  marketRow({ id: "pass380-ker", rank: 462, symbol: "KER.PA", name: "Kering", assetClass: "stock", riskPressure: 37, sparkTone: "watch", proofOrDisclosureLane: "EU issuer disclosure + luxury sector lane" }),
  marketRow({ id: "pass380-cfr", rank: 463, symbol: "CFR.SW", name: "Richemont", assetClass: "stock", riskPressure: 29, sparkTone: "flat", proofOrDisclosureLane: "Swiss issuer disclosure + luxury sector lane" }),
  marketRow({ id: "pass380-itx", rank: 464, symbol: "ITX.MC", name: "Inditex", assetClass: "stock", riskPressure: 28, sparkTone: "flat", proofOrDisclosureLane: "EU issuer disclosure + fashion retail lane" }),
  marketRow({ id: "pass380-swk", rank: 465, symbol: "SW.PA", name: "Sodexo / services proxy", assetClass: "stock", riskPressure: 31, sparkTone: "flat", proofOrDisclosureLane: "EU issuer disclosure + services lane" }),
  // FX broader set
  marketRow({ id: "pass380-eurnok", rank: 466, symbol: "EUR/NOK", name: "Euro / Norwegian Krone", assetClass: "fx", riskPressure: 35, sparkTone: "watch" }),
  marketRow({ id: "pass380-eursek", rank: 467, symbol: "EUR/SEK", name: "Euro / Swedish Krona", assetClass: "fx", riskPressure: 33, sparkTone: "watch" }),
  marketRow({ id: "pass380-eurhuf", rank: 468, symbol: "EUR/HUF", name: "Euro / Hungarian Forint", assetClass: "fx", riskPressure: 42, sparkTone: "watch" }),
  marketRow({ id: "pass380-eurczk", rank: 469, symbol: "EUR/CZK", name: "Euro / Czech Koruna", assetClass: "fx", riskPressure: 31, sparkTone: "flat" }),
  marketRow({ id: "pass380-eurron", rank: 470, symbol: "EUR/RON", name: "Euro / Romanian Leu", assetClass: "fx", riskPressure: 34, sparkTone: "flat" }),
  marketRow({ id: "pass380-usdcnh", rank: 471, symbol: "USD/CNH", name: "Dollar / Offshore Yuan", assetClass: "fx", riskPressure: 47, sparkTone: "watch" }),
  marketRow({ id: "pass380-usdsgd", rank: 472, symbol: "USD/SGD", name: "Dollar / Singapore Dollar", assetClass: "fx", riskPressure: 27, sparkTone: "flat" }),
  marketRow({ id: "pass380-usdhkd", rank: 473, symbol: "USD/HKD", name: "Dollar / Hong Kong Dollar", assetClass: "fx", riskPressure: 30, sparkTone: "flat" }),
  marketRow({ id: "pass380-usdinr", rank: 474, symbol: "USD/INR", name: "Dollar / Indian Rupee", assetClass: "fx", riskPressure: 39, sparkTone: "watch" }),
  marketRow({ id: "pass380-usdkrw", rank: 475, symbol: "USD/KRW", name: "Dollar / Korean Won", assetClass: "fx", riskPressure: 43, sparkTone: "watch" }),
  // ETF / factors / macro
  marketRow({ id: "pass380-dia", rank: 476, symbol: "DIA", name: "Dow Jones ETF", assetClass: "etf", riskPressure: 30, sparkTone: "flat", proofOrDisclosureLane: "ETF methodology + index exposure lane" }),
  marketRow({ id: "pass380-iwm", rank: 477, symbol: "IWM", name: "Russell 2000 ETF", assetClass: "etf", riskPressure: 42, sparkTone: "watch", proofOrDisclosureLane: "ETF methodology + small-cap risk lane" }),
  marketRow({ id: "pass380-efa", rank: 478, symbol: "EFA", name: "Developed ex-US ETF", assetClass: "etf", riskPressure: 34, sparkTone: "flat", proofOrDisclosureLane: "ETF methodology + international equity lane" }),
  marketRow({ id: "pass380-eem", rank: 479, symbol: "EEM", name: "Emerging Markets ETF", assetClass: "etf", riskPressure: 48, sparkTone: "watch", proofOrDisclosureLane: "ETF methodology + EM risk lane" }),
  marketRow({ id: "pass380-tlt", rank: 480, symbol: "TLT", name: "Long Treasury ETF", assetClass: "etf", riskPressure: 46, sparkTone: "watch", proofOrDisclosureLane: "ETF methodology + duration risk lane" }),
  marketRow({ id: "pass380-hyg", rank: 481, symbol: "HYG", name: "High Yield Corporate Bond ETF", assetClass: "etf", riskPressure: 45, sparkTone: "watch", proofOrDisclosureLane: "ETF methodology + credit stress lane" }),
  marketRow({ id: "pass380-uup", rank: 482, symbol: "UUP", name: "US Dollar Index ETF proxy", assetClass: "etf", riskPressure: 38, sparkTone: "watch", proofOrDisclosureLane: "ETF methodology + dollar pressure lane" }),
  marketRow({ id: "pass380-igf", rank: 483, symbol: "IGF", name: "Global Infrastructure ETF", assetClass: "etf", riskPressure: 31, sparkTone: "flat", proofOrDisclosureLane: "ETF methodology + infrastructure lane" }),
  // Commodities / real estate macro
  marketRow({ id: "pass380-copper", rank: 484, symbol: "COPPER", name: "Copper", assetClass: "commodity", riskPressure: 44, sparkTone: "watch", proofOrDisclosureLane: "industrial metal futures/methodology lane" }),
  marketRow({ id: "pass380-uranium", rank: 485, symbol: "URANIUM", name: "Uranium proxy", assetClass: "commodity", riskPressure: 52, sparkTone: "watch", proofOrDisclosureLane: "uranium spot/proxy methodology lane", confidenceFloor: 50 }),
  marketRow({ id: "pass380-natgas", rank: 486, symbol: "NATGAS", name: "Natural Gas", assetClass: "commodity", riskPressure: 58, sparkTone: "watch", proofOrDisclosureLane: "energy futures/methodology lane", confidenceFloor: 50 }),
  marketRow({ id: "pass380-wheat", rank: 487, symbol: "WHEAT", name: "Wheat futures proxy", assetClass: "commodity", riskPressure: 49, sparkTone: "watch", proofOrDisclosureLane: "agriculture futures methodology lane" }),
  marketRow({ id: "pass380-corn", rank: 488, symbol: "CORN", name: "Corn futures proxy", assetClass: "commodity", riskPressure: 44, sparkTone: "watch", proofOrDisclosureLane: "agriculture futures methodology lane" }),
  marketRow({ id: "pass380-housing", rank: 489, symbol: "HOUSING-US", name: "US housing macro proxy", assetClass: "real_estate", riskPressure: 41, sparkTone: "watch", adapterState: "slow_macro", proofOrDisclosureLane: "housing series + REIT proxy lane" }),
  marketRow({ id: "pass380-rent", rank: 490, symbol: "RENT-INDEX", name: "Rent pressure proxy", assetClass: "real_estate", riskPressure: 38, sparkTone: "flat", adapterState: "slow_macro", proofOrDisclosureLane: "rent series + CPI shelter lane" }),
  marketRow({ id: "pass380-office", rank: 491, symbol: "OFFICE-REIT", name: "Office REIT stress proxy", assetClass: "real_estate", riskPressure: 55, sparkTone: "watch", adapterState: "slow_macro", proofOrDisclosureLane: "REIT basket + credit stress lane", confidenceFloor: 50 }),
  marketRow({ id: "pass380-logistics", rank: 492, symbol: "LOGI-REIT", name: "Logistics REIT proxy", assetClass: "real_estate", riskPressure: 34, sparkTone: "flat", adapterState: "slow_macro", proofOrDisclosureLane: "industrial REIT + supply chain lane" }),
];

export const pass380AssetVisualPatch: Record<string, { label: string; glyph: string; primary: string; secondary: string; text?: string }> = {
  UBS: { label: "UBS", glyph: "UB", primary: "#e30613", secondary: "#111827" }, DB: { label: "Deutsche Bank", glyph: "DB", primary: "#0018a8", secondary: "#06103d" }, PNC: { label: "PNC", glyph: "PN", primary: "#f58025", secondary: "#23150a" }, USB: { label: "US Bancorp", glyph: "US", primary: "#004c97", secondary: "#ba0c2f" }, TFC: { label: "Truist", glyph: "TF", primary: "#2e1a47", secondary: "#c6a15b" }, STT: { label: "State Street", glyph: "ST", primary: "#005eb8", secondary: "#071728" }, "ADYEN.AS": { label: "Adyen", glyph: "AY", primary: "#0abf53", secondary: "#061b0d" }, SQ: { label: "Block", glyph: "SQ", primary: "#111827", secondary: "#d8b36a" }, PYPL: { label: "PayPal", glyph: "PP", primary: "#003087", secondary: "#009cde" }, AFRM: { label: "Affirm", glyph: "AF", primary: "#4a4af4", secondary: "#0b0b2a" },
  CRWD: { label: "CrowdStrike", glyph: "CS", primary: "#e01f26", secondary: "#220406" }, PANW: { label: "Palo Alto", glyph: "PA", primary: "#ff5a1f", secondary: "#251004" }, FTNT: { label: "Fortinet", glyph: "FT", primary: "#da291c", secondary: "#250604" }, ZS: { label: "Zscaler", glyph: "ZS", primary: "#0f6fff", secondary: "#061438" }, NET: { label: "Cloudflare", glyph: "CF", primary: "#f38020", secondary: "#2a1204" }, DDOG: { label: "Datadog", glyph: "DD", primary: "#632ca6", secondary: "#160a25" }, SNOW: { label: "Snowflake", glyph: "SN", primary: "#29b5e8", secondary: "#062433" }, ARM: { label: "Arm", glyph: "AR", primary: "#00a6a4", secondary: "#061f1f" }, SMCI: { label: "Supermicro", glyph: "SC", primary: "#1c75bc", secondary: "#071728" }, MSTR: { label: "MicroStrategy", glyph: "₿M", primary: "#f7931a", secondary: "#1c1204", text: "#111" },
  "RMS.PA": { label: "Hermès", glyph: "H", primary: "#f37021", secondary: "#2b1204" }, "KER.PA": { label: "Kering", glyph: "K", primary: "#111827", secondary: "#d8b36a" }, "CFR.SW": { label: "Richemont", glyph: "RC", primary: "#d8b36a", secondary: "#2a1908" }, "ITX.MC": { label: "Inditex", glyph: "IX", primary: "#111827", secondary: "#e5e7eb" }, "SW.PA": { label: "Sodexo", glyph: "SX", primary: "#1a4fa3", secondary: "#071728" },
  "EUR/NOK": { label: "EUR NOK", glyph: "€N", primary: "#225eea", secondary: "#ba0c2f" }, "EUR/SEK": { label: "EUR SEK", glyph: "€S", primary: "#225eea", secondary: "#006aa7" }, "EUR/HUF": { label: "EUR HUF", glyph: "€H", primary: "#225eea", secondary: "#477050" }, "EUR/CZK": { label: "EUR CZK", glyph: "€C", primary: "#225eea", secondary: "#d7141a" }, "EUR/RON": { label: "EUR RON", glyph: "€R", primary: "#225eea", secondary: "#fcd116", text: "#111" }, "USD/CNH": { label: "USD CNH", glyph: "$¥", primary: "#0f8d61", secondary: "#de2910" }, "USD/SGD": { label: "USD SGD", glyph: "$S", primary: "#0f8d61", secondary: "#ef3340" }, "USD/HKD": { label: "USD HKD", glyph: "$H", primary: "#0f8d61", secondary: "#de2910" }, "USD/INR": { label: "USD INR", glyph: "$₹", primary: "#0f8d61", secondary: "#ff9933", text: "#111" }, "USD/KRW": { label: "USD KRW", glyph: "$₩", primary: "#0f8d61", secondary: "#0047a0" },
  DIA: { label: "Dow ETF", glyph: "DI", primary: "#315bdc", secondary: "#0b1438" }, IWM: { label: "Russell", glyph: "IW", primary: "#315bdc", secondary: "#0b1438" }, EFA: { label: "EAFE", glyph: "EF", primary: "#315bdc", secondary: "#0b1438" }, EEM: { label: "EM ETF", glyph: "EM", primary: "#d8b36a", secondary: "#231408" }, TLT: { label: "Long bonds", glyph: "TL", primary: "#315bdc", secondary: "#0b1438" }, HYG: { label: "HY credit", glyph: "HY", primary: "#d8b36a", secondary: "#231408" }, UUP: { label: "Dollar", glyph: "DX", primary: "#0f8d61", secondary: "#061b12" }, IGF: { label: "Infrastructure", glyph: "IF", primary: "#315bdc", secondary: "#0b1438" },
  COPPER: { label: "Copper", glyph: "Cu", primary: "#b87333", secondary: "#211004" }, URANIUM: { label: "Uranium", glyph: "U", primary: "#8cc63e", secondary: "#16250a" }, NATGAS: { label: "Natural Gas", glyph: "NG", primary: "#0ea5e9", secondary: "#061a25" }, WHEAT: { label: "Wheat", glyph: "Wh", primary: "#d8b36a", secondary: "#261807" }, CORN: { label: "Corn", glyph: "Co", primary: "#facc15", secondary: "#272105", text: "#111" }, "HOUSING-US": { label: "Housing", glyph: "HS", primary: "#b99d72", secondary: "#24170d" }, "RENT-INDEX": { label: "Rent", glyph: "RI", primary: "#b99d72", secondary: "#24170d" }, "OFFICE-REIT": { label: "Office REIT", glyph: "OR", primary: "#9b7d52", secondary: "#211407" }, "LOGI-REIT": { label: "Logistics REIT", glyph: "LR", primary: "#9b7d52", secondary: "#211407" },
};

export const pass380PseudoPricePatch: Record<string, string> = {
  UBS: "$38.40", DB: "$36.20", PNC: "$202.10", USB: "$57.80", TFC: "$51.40", STT: "$112.30", "ADYEN.AS": "€2,070", SQ: "$86.20", PYPL: "$72.10", AFRM: "$62.80",
  CRWD: "$520.40", PANW: "$210.20", FTNT: "$108.70", ZS: "$332.40", NET: "$238.30", DDOG: "$178.20", SNOW: "$242.10", ARM: "$168.70", SMCI: "$43.10", MSTR: "$392.40",
  "RMS.PA": "€2,410", "KER.PA": "€310.20", "CFR.SW": "CHF 184.50", "ITX.MC": "€52.90", "SW.PA": "€82.40",
  "EUR/NOK": "11.82", "EUR/SEK": "10.86", "EUR/HUF": "384.20", "EUR/CZK": "24.55", "EUR/RON": "5.07", "USD/CNH": "7.08", "USD/SGD": "1.28", "USD/HKD": "7.80", "USD/INR": "86.40", "USD/KRW": "1,342",
  DIA: "$493.20", IWM: "$242.60", EFA: "$92.10", EEM: "$51.60", TLT: "$88.20", HYG: "$82.90", UUP: "$27.30", IGF: "$61.40",
  COPPER: "$4.92", URANIUM: "$93.00", NATGAS: "$4.20", WHEAT: "$6.15", CORN: "$4.75", "HOUSING-US": "macro", "RENT-INDEX": "macro", "OFFICE-REIT": "macro", "LOGI-REIT": "macro",
};

export function buildPass380MarketCoverageUniverse() {
  return pass380MarketExpansion;
}
