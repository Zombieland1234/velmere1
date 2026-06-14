import type { UniversalAssetRow } from "./universal-asset-market-matrix";

export type Pass386Mode = "basic" | "pro" | "advanced";
type VisualPatch = { label: string; glyph: string; primary: string; secondary: string; text?: string; logoUrl?: string };

function row(input: Partial<UniversalAssetRow> & Pick<UniversalAssetRow, "id" | "rank" | "symbol" | "name" | "assetClass" | "riskPressure" | "sparkTone">): UniversalAssetRow {
  const family = input.assetClass === "fx" ? "FX" : input.assetClass === "commodity" ? "commodity" : input.assetClass === "real_estate" ? "real-estate proxy" : input.assetClass === "etf" ? "ETF" : input.assetClass === "exchange_token" ? "exchange venue" : "equity";
  return {
    sourceRhythm: input.sourceRhythm ?? `${family} provider lane · quote timestamp · market calendar · cache age · fallback flag`,
    priceLane: input.priceLane ?? `${family} Shield-grade candle shell: 1H / 4H / 1D / 1W with OHLCV when provider is attached`,
    volumeLane: input.volumeLane ?? `${family} volume, spread, session gap, volatility and second-source drift`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${family} issuer/reference/methodology lane`,
    secondSourceLane: input.secondSourceLane ?? "primary provider ↔ second source before stronger confidence",
    confidenceFloor: input.confidenceFloor ?? 70,
    adapterState: input.adapterState ?? "provider_required",
    humanCopy: input.humanCopy ?? `${input.symbol} is mapped through PASS386 exact mirror: real icon, Shield chart, source truth, AI Brain and PDF output all use one resolved object.`,
    nextAdapterStep: input.nextAdapterStep ?? "Attach live provider key, timestamp, OHLCV cache, issuer/reference lane, second source compare and locale-locked PDF renderer.",
    ...input,
  };
}

export const pass386ExactMirrorContract = {
  version: "PASS386.exact_mirror_terminal",
  publicRule: "Customer UI should show one premium terminal, not a museum of internal passes: search, asset table, chart modal, VLM Brain and PDF mirror.",
  marketRule: "Every real-market row follows the Shield grammar: logo, candles, timeframe, source truth, Basic/Pro/Advanced, AI Brain and exact PDF mirror.",
  pdfRule: "Browser preview, modal preview and downloaded PDF must use the same resolved report object and selected locale: PL, EN or DE.",
  brainRule: "The VLM coin becomes a neural audit core first; after collection it transforms into one readable field deck with 10/14/20 useful fields.",
  copyRule: "Repeated filler is a bug. Each asset must get a short human brief tied to asset class, provider state, source gaps and next safe step.",
  securityRule: "Security is public-simple and private-deep: private keys stay private, signatures prove control, entropy is measured, reports are redacted.",
} as const;

export const pass386BrainStages = [
  { id: "seal", label: "Identity seal", seconds: 0.7, copy: "Symbol, venue, asset class, locale and visual mark lock before any readout." },
  { id: "provider", label: "Provider truth", seconds: 1.0, copy: "Timestamp, OHLCV, cache age, fallback and market calendar decide how confident the UI may sound." },
  { id: "candles", label: "Candle forge", seconds: 1.1, copy: "The same Shield candle grammar is used for crypto, stocks, FX, ETF, commodities and proxies." },
  { id: "neural", label: "Neural audit", seconds: 1.6, copy: "Source, liquidity, issuer, macro, second source and security lanes travel into the VLM core." },
  { id: "security", label: "Security bridge", seconds: 1.1, copy: "Private-key boundary, signature proof, entropy quality and redaction are translated into simple public text." },
  { id: "prime", label: "Prime Lab", seconds: 1.2, copy: "Prime/Riemann work stays framed as numerical audit, falsification and replication." },
  { id: "field", label: "Field deck", seconds: 1.3, copy: "The animation resolves into useful fields instead of debug cards or repeated operator rails." },
  { id: "mirror", label: "Exact mirror", seconds: 0.8, copy: "The same resolved object renders UI preview, modal preview and downloadable PDF." },
] as const;

export const pass386ProviderDeck = [
  { id: "equities", label: "Equities", state: "SEC / issuer lane", copy: "Stocks need quote provider, filings/company facts, sector basket and market session status." },
  { id: "fx", label: "FX", state: "reference + intraday", copy: "FX needs reference cadence, intraday provider, volatility band and regional holiday context." },
  { id: "commodities", label: "Commodities", state: "spot/futures lane", copy: "Gold, silver, oil, gas and metals need source type, contract roll context and timestamp." },
  { id: "real-estate", label: "Real estate", state: "proxy lane", copy: "REIT/ETF proxies are slow context, not second-by-second live real-estate valuation." },
  { id: "venues", label: "Exchanges", state: "heartbeat lane", copy: "Exchange health needs API status, depth, withdrawals, reserves context, social stress and second venue." },
  { id: "pdf", label: "PDF mirror", state: "same object", copy: "Preview and downloaded PDF cannot call a second random text generator." },
] as const;

const fields = [
  { id: "identity", label: "Identity", value: "locked", copy: "Name, symbol, market family and visual mark are resolved once." },
  { id: "language", label: "Language", value: "PL/EN/DE", copy: "The selected page language controls modal and PDF text." },
  { id: "chart", label: "Chart", value: "Shield-grade", copy: "One candle grammar works across crypto, stock, FX, ETF and commodities." },
  { id: "provider", label: "Provider", value: "timestamp-first", copy: "No strong live wording without quote time, OHLCV and cache age." },
  { id: "fallback", label: "Fallback", value: "visible", copy: "Preview, delayed and provider-required states stay visible to the user." },
  { id: "second", label: "Second source", value: "required", copy: "Confidence rises only after another provider, filing or reference confirms the read." },
  { id: "risk", label: "Risk", value: "human", copy: "Risk explains uncertainty; it never gives a buy/sell command." },
  { id: "liquidity", label: "Liquidity", value: "separate", copy: "Depth, spread and volume stay separate from social hype." },
  { id: "issuer", label: "Issuer/ref", value: "mapped", copy: "Stocks use filings; FX, commodities and proxies use reference methodology." },
  { id: "pdf", label: "PDF", value: "same object", copy: "Preview and download use the same resolved report object." },
  { id: "security", label: "Security", value: "plain", copy: "Private-key boundary, signature proof and redaction stay simple." },
  { id: "entropy", label: "Entropy", value: "measured", copy: "RNG/TRNG is quality of randomness, not wallet-generation instructions." },
  { id: "ecc", label: "ECC / BTC", value: "conceptual", copy: "Signatures are explained without exposing or generating private keys." },
  { id: "prime", label: "Prime Lab", value: "audit", copy: "Bajak Protocol is framed as benchmark, falsification and replication." },
  { id: "macro", label: "Macro", value: "context", copy: "Rates, FX, commodities and real estate are context lanes." },
  { id: "session", label: "Session", value: "calendar", copy: "Market session and reference date are part of source truth." },
  { id: "copy", label: "AI copy", value: "specific", copy: "The AI must explain this asset, not paste generic filler." },
  { id: "operator", label: "Operator", value: "private", copy: "Thresholds, payloads and abuse heuristics stay hidden." },
  { id: "launch", label: "Launch", value: "clean", copy: "Only one public terminal is visible; old pass panels stay hidden." },
  { id: "proof", label: "Proof", value: "redacted", copy: "The user sees sources, gaps and the result; not sensitive rules." },
] as const;

export function buildPass386ExactMirrorReadout(input: { symbol: string; name: string; type: string; risk: number; source: string; mode: Pass386Mode }) {
  const count = input.mode === "advanced" ? 20 : input.mode === "pro" ? 14 : 10;
  const seconds = pass386BrainStages.reduce((sum, phase) => sum + phase.seconds, 0) + (input.mode === "advanced" ? 2.6 : input.mode === "pro" ? 1.3 : 0.4);
  const band = input.risk >= 64 ? "operator-review" : input.risk >= 43 ? "provider-watch" : "clean-preview";
  return {
    version: "PASS386.exact_mirror_readout",
    count,
    seconds: Number(seconds.toFixed(1)),
    band,
    headline: `${input.symbol} przechodzi jeden czysty terminal: provider truth, wykres Shield, VLM Brain, Security bridge, Prime Lab boundary i PDF mirror.`,
    body: `${input.name} (${input.type}) zwraca ${count} pól. Source lane: ${input.source}. Brak providera lub drugiego źródła obniża pewność zamiast tworzyć losowy tekst.`,
    fields: fields.slice(0, count),
  };
}

export const pass386AssetVisualPatch: Record<string, VisualPatch> = {
  CME: { label: "CME Group", glyph: "CM", primary: "#004c97", secondary: "#0b1b33" },
  ICE: { label: "Intercontinental Exchange", glyph: "ICE", primary: "#0f172a", secondary: "#60a5fa" },
  NDAQ: { label: "Nasdaq", glyph: "ND", primary: "#0090d8", secondary: "#002b44" },
  CBOE: { label: "Cboe", glyph: "CB", primary: "#004b8d", secondary: "#061a30" },
  SPGI: { label: "S&P Global", glyph: "SP", primary: "#e31b23", secondary: "#1f2937" },
  MCO: { label: "Moody's", glyph: "MO", primary: "#0033a0", secondary: "#071331" },
  MSCI: { label: "MSCI", glyph: "MI", primary: "#0b5cab", secondary: "#061f36" },
  PANW: { label: "Palo Alto Networks", glyph: "PA", primary: "#ff5a1f", secondary: "#200904" },
  CRWD: { label: "CrowdStrike", glyph: "CR", primary: "#ef4444", secondary: "#260707" },
  NET: { label: "Cloudflare", glyph: "CF", primary: "#f38020", secondary: "#2a1003" },
  DDOG: { label: "Datadog", glyph: "DD", primary: "#632ca6", secondary: "#170829" },
  ANET: { label: "Arista", glyph: "AR", primary: "#0f766e", secondary: "#06211f" },
  MU: { label: "Micron", glyph: "MU", primary: "#0f4c81", secondary: "#061a2c" },
  ARM: { label: "Arm", glyph: "ARM", primary: "#00c1de", secondary: "#06232a" },
  RACE: { label: "Ferrari", glyph: "FR", primary: "#dc0000", secondary: "#ffd100", text: "#111" },
  "AIR.PA": { label: "Airbus", glyph: "AB", primary: "#00205b", secondary: "#60a5fa" },
  "SIE.DE": { label: "Siemens", glyph: "SI", primary: "#009999", secondary: "#063333" },
  "USD/SGD": { label: "Dollar / Singapore Dollar", glyph: "SG", primary: "#b91c1c", secondary: "#f8fafc", text: "#111" },
  "USD/CNH": { label: "Dollar / Offshore Yuan", glyph: "CN", primary: "#de2910", secondary: "#ffde00", text: "#111" },
  "EUR/CHF": { label: "Euro / Swiss Franc", glyph: "E₣", primary: "#225eea", secondary: "#ff0000" },
  "USD/MXN": { label: "Dollar / Mexican Peso", glyph: "MX", primary: "#006847", secondary: "#ce1126" },
  "USD/ZAR": { label: "Dollar / Rand", glyph: "ZA", primary: "#007a4d", secondary: "#ffb612", text: "#111" },
  COPPER: { label: "Copper", glyph: "Cu", primary: "#b87333", secondary: "#2a1205" },
  NATGAS: { label: "Natural Gas", glyph: "NG", primary: "#3b82f6", secondary: "#07172d" },
  URANIUM: { label: "Uranium", glyph: "U", primary: "#a3e635", secondary: "#142407", text: "#111" },
  IAU: { label: "Gold ETF", glyph: "IA", primary: "#d4af37", secondary: "#261c05" },
  SLV: { label: "Silver ETF", glyph: "SL", primary: "#cbd5e1", secondary: "#1e293b", text: "#111" },
  REET: { label: "Global REIT ETF", glyph: "RE", primary: "#0f766e", secondary: "#071f1d" },
};

export const pass386PseudoPricePatch: Record<string, string> = {
  CME: "$275.40", ICE: "$172.10", NDAQ: "$82.20", CBOE: "$202.70", SPGI: "$509.80", MCO: "$473.60", MSCI: "$574.30",
  PANW: "$391.20", CRWD: "$452.80", NET: "$186.40", DDOG: "$139.60", ANET: "$116.20", MU: "$123.70", ARM: "$132.80", RACE: "$418.60", "AIR.PA": "€188.40", "SIE.DE": "€232.20",
  "USD/SGD": "1.2840", "USD/CNH": "7.1050", "EUR/CHF": "0.9420", "USD/MXN": "18.42", "USD/ZAR": "17.71",
  COPPER: "$4.65", NATGAS: "$3.25", URANIUM: "$78.40", IAU: "$63.20", SLV: "$34.60", REET: "$29.10",
};

export const pass386SecurityOnePageCopy = [
  "Security pokazujemy prosto: klucz prywatny zostaje prywatny, a podpis może potwierdzić kontrolę bez ujawniania sekretu.",
  "Real Markets i Shield brzmią pewniej dopiero po timestamp, OHLCV, cache age, fallback flag i drugim źródle.",
  "RNG/TRNG opisujemy jako mierzalną entropię, health-test i walidację źródła, bez instrukcji tworzenia portfeli.",
  "Raport publiczny pokazuje wynik, źródła i braki; payloady, progi i reguły operatorowe zostają prywatne.",
] as const;

export const pass386ResearchNarrative = [
  { id: "bank", label: "Banki", copy: "Bankowy język zaufania to: sesja, podpis, limit, log, audyt i reakcja na nadużycie." },
  { id: "crypto", label: "Kryptografia", copy: "Kryptografia zamienia sekret w weryfikowalny dowód bez ujawniania sekretu." },
  { id: "ecc", label: "ECC / BTC", copy: "ECC/BTC pokazujemy koncepcyjnie: kontrola klucza, podpis i publiczna weryfikacja." },
  { id: "entropy", label: "Real RNG", copy: "Losowość musi być mierzona: entropia, health testy i dokumentacja źródła." },
  { id: "prime", label: "Liczby pierwsze", copy: "Prime Lab tłumaczy rozkład liczb pierwszych jako rdzeń audytu matematycznego i kryptografii." },
  { id: "bajak", label: "Bajak Protocol", copy: "Publiczny claim zostaje: numerical audit, falsyfikacja, benchmark i niezależna replikacja." },
] as const;

const expansion: UniversalAssetRow[] = [
  row({ id: "cme", rank: 978, symbol: "CME", name: "CME Group", assetClass: "stock", riskPressure: 30, sparkTone: "flat" }),
  row({ id: "ice", rank: 979, symbol: "ICE", name: "Intercontinental Exchange", assetClass: "stock", riskPressure: 31, sparkTone: "flat" }),
  row({ id: "ndaq", rank: 980, symbol: "NDAQ", name: "Nasdaq", assetClass: "stock", riskPressure: 34, sparkTone: "flat" }),
  row({ id: "cboe", rank: 981, symbol: "CBOE", name: "Cboe Global Markets", assetClass: "stock", riskPressure: 33, sparkTone: "flat" }),
  row({ id: "spgi", rank: 982, symbol: "SPGI", name: "S&P Global", assetClass: "stock", riskPressure: 28, sparkTone: "flat" }),
  row({ id: "mco", rank: 983, symbol: "MCO", name: "Moody's", assetClass: "stock", riskPressure: 29, sparkTone: "flat" }),
  row({ id: "msci", rank: 984, symbol: "MSCI", name: "MSCI", assetClass: "stock", riskPressure: 31, sparkTone: "flat" }),
  row({ id: "panw", rank: 985, symbol: "PANW", name: "Palo Alto Networks", assetClass: "stock", riskPressure: 42, sparkTone: "watch" }),
  row({ id: "crwd", rank: 986, symbol: "CRWD", name: "CrowdStrike", assetClass: "stock", riskPressure: 46, sparkTone: "watch" }),
  row({ id: "net", rank: 987, symbol: "NET", name: "Cloudflare", assetClass: "stock", riskPressure: 45, sparkTone: "watch" }),
  row({ id: "ddog", rank: 988, symbol: "DDOG", name: "Datadog", assetClass: "stock", riskPressure: 43, sparkTone: "watch" }),
  row({ id: "anet", rank: 989, symbol: "ANET", name: "Arista Networks", assetClass: "stock", riskPressure: 36, sparkTone: "flat" }),
  row({ id: "mu", rank: 990, symbol: "MU", name: "Micron", assetClass: "stock", riskPressure: 44, sparkTone: "watch" }),
  row({ id: "arm", rank: 991, symbol: "ARM", name: "Arm Holdings", assetClass: "stock", riskPressure: 48, sparkTone: "watch" }),
  row({ id: "race", rank: 992, symbol: "RACE", name: "Ferrari", assetClass: "stock", riskPressure: 32, sparkTone: "flat" }),
  row({ id: "air-pa", rank: 993, symbol: "AIR.PA", name: "Airbus", assetClass: "stock", riskPressure: 35, sparkTone: "flat" }),
  row({ id: "sie-de", rank: 994, symbol: "SIE.DE", name: "Siemens", assetClass: "stock", riskPressure: 33, sparkTone: "flat" }),
  row({ id: "usd-sgd", rank: 995, symbol: "USD/SGD", name: "US Dollar / Singapore Dollar", assetClass: "fx", riskPressure: 30, sparkTone: "flat" }),
  row({ id: "usd-cnh", rank: 996, symbol: "USD/CNH", name: "US Dollar / Offshore Yuan", assetClass: "fx", riskPressure: 40, sparkTone: "watch" }),
  row({ id: "eur-chf", rank: 997, symbol: "EUR/CHF", name: "Euro / Swiss Franc", assetClass: "fx", riskPressure: 35, sparkTone: "flat" }),
  row({ id: "usd-mxn", rank: 998, symbol: "USD/MXN", name: "US Dollar / Mexican Peso", assetClass: "fx", riskPressure: 42, sparkTone: "watch" }),
  row({ id: "usd-zar", rank: 999, symbol: "USD/ZAR", name: "US Dollar / South African Rand", assetClass: "fx", riskPressure: 46, sparkTone: "watch" }),
  row({ id: "copper", rank: 1000, symbol: "COPPER", name: "Copper proxy", assetClass: "commodity", riskPressure: 44, sparkTone: "watch" }),
  row({ id: "natgas", rank: 1001, symbol: "NATGAS", name: "Natural Gas proxy", assetClass: "commodity", riskPressure: 50, sparkTone: "watch" }),
  row({ id: "uranium", rank: 1002, symbol: "URANIUM", name: "Uranium proxy", assetClass: "commodity", riskPressure: 47, sparkTone: "watch" }),
  row({ id: "iau", rank: 1003, symbol: "IAU", name: "iShares Gold Trust", assetClass: "etf", riskPressure: 31, sparkTone: "flat" }),
  row({ id: "slv", rank: 1004, symbol: "SLV", name: "Silver ETF", assetClass: "etf", riskPressure: 39, sparkTone: "watch" }),
  row({ id: "reet", rank: 1005, symbol: "REET", name: "Global REIT ETF", assetClass: "real_estate", riskPressure: 37, sparkTone: "flat" }),
];

export function buildPass386MarketCoverageUniverse() {
  return expansion;
}
