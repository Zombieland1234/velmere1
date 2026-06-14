import type { UniversalAssetRow } from "./universal-asset-market-matrix";

export type Pass383Mode = "basic" | "pro" | "advanced";
type VisualPatch = { label: string; glyph: string; primary: string; secondary: string; text?: string; logoUrl?: string };

function marketRow(input: Partial<UniversalAssetRow> & Pick<UniversalAssetRow, "id" | "rank" | "symbol" | "name" | "assetClass" | "riskPressure" | "sparkTone">): UniversalAssetRow {
  const family = input.assetClass === "fx" ? "FX" : input.assetClass === "commodity" ? "commodity" : input.assetClass === "real_estate" ? "real-estate proxy" : input.assetClass === "etf" ? "ETF" : input.assetClass === "exchange_token" ? "exchange-linked" : "equity";
  return {
    sourceRhythm: input.sourceRhythm ?? `${family} provider-ready lane · quote timestamp · cache age · fallback state · session calendar`,
    priceLane: input.priceLane ?? `${family} Shield-grade candle shell: 1H / 4H / 1D / 1W with OHLCV once provider is attached`,
    volumeLane: input.volumeLane ?? `${family} volume, spread, session gap, volatility and second-source drift`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${family} issuer/reference/methodology disclosure lane`,
    secondSourceLane: input.secondSourceLane ?? "primary provider ↔ second reference before high confidence",
    confidenceFloor: input.confidenceFloor ?? 66,
    adapterState: input.adapterState ?? "provider_required",
    humanCopy: input.humanCopy ?? `${input.symbol} is ready for the clean PASS383 Real Markets surface: logo, candle chart, provider truth, AI Brain readout and exact PDF mirror without debug walls.`,
    nextAdapterStep: input.nextAdapterStep ?? "Attach live provider, quote timestamp, OHLCV cache, fallback flag, issuer/reference lane, second source compare and locale report object.",
    ...input,
  };
}

export const pass383CleanLaunchContract = {
  version: "PASS383.clean_launch_brain",
  publicRule: "The public page shows one clean Real Markets surface, not every historical PASS debug panel. Legacy contracts stay in code as hidden compatibility markers.",
  marketRule: "Every stock, FX pair, ETF, commodity and real-estate proxy follows the Shield grammar: logo, candle chart, timeframe, Basic/Pro/Advanced, VLM Brain and PDF mirror.",
  pdfRule: "Browser preview and downloaded PDF must use the same resolved report object, same locale and same field order.",
  brainRule: "The brain displays one animated neural scan and one readout deck of 10/14/20 fields; older pass cards are hidden from the customer surface.",
  securityRule: "Security copy is simple: private key stays private, signatures prove control, entropy quality matters, reports are redacted and operator rules stay private.",
  researchRule: "Prime/Riemann content is shown as numerical audit, falsification and replication path, not as a public theorem claim.",
} as const;

export const pass383ProviderLanes = [
  { id: "market-data", label: "Market data", state: "provider-ready", copy: "Quotes and candles require provider id, quote time, OHLCV cache and fallback flag before live confidence." },
  { id: "issuer", label: "Issuer/reference", state: "mapped", copy: "Stocks map to company filings; FX, commodities and real-estate proxies map to reference methodology." },
  { id: "chart", label: "Shield chart", state: "1:1 shell", copy: "The modal chart shell stays identical across crypto, equities, FX, ETF, commodities and proxies." },
  { id: "brain", label: "VLM Brain", state: "10/14/20", copy: "Basic, Pro and Advanced change field depth, not the source of truth." },
  { id: "pdf", label: "PDF mirror", state: "same object", copy: "Preview and download must not fork into separate text generators." },
  { id: "clean-ui", label: "Clean UI", state: "launch mode", copy: "Historical pass boards are kept as code markers but hidden from the public surface." },
] as const;

export const pass383BrainStages = [
  { id: "identity", label: "Identity", seconds: 0.9, copy: "Asset, class, locale and visual mark lock first." },
  { id: "provider", label: "Provider truth", seconds: 1.1, copy: "Timestamp, OHLCV, cache age and fallback decide confidence." },
  { id: "chart", label: "Candle forge", seconds: 1.1, copy: "Shield-style candles and timeframe are rendered before analysis." },
  { id: "neural", label: "Neural flow", seconds: 1.7, copy: "Source, liquidity, issuer, macro and second source flow into the VLM core." },
  { id: "security", label: "Security bridge", seconds: 1.0, copy: "Signatures, private keys, entropy and redaction are translated safely." },
  { id: "research", label: "Prime Lab", seconds: 1.2, copy: "Bajak Protocol stays an audit/reproduction lane until formal proof exists." },
  { id: "readout", label: "Human readout", seconds: 1.4, copy: "The result is 10, 14 or 20 short useful fields." },
  { id: "mirror", label: "PDF mirror", seconds: 0.8, copy: "The same locale-locked report object renders preview and download." },
] as const;

const pass383Fields = [
  { id: "identity", label: "Identity", value: "locked", copy: "Symbol, market family and logo are resolved once." },
  { id: "locale", label: "Language", value: "PL/EN/DE", copy: "The page language controls modal, preview and PDF." },
  { id: "chart", label: "Chart", value: "Shield 1:1", copy: "The candle shell is shared with Shield instead of a separate weak chart." },
  { id: "provider", label: "Provider", value: "timestamp-first", copy: "No live wording without quote time, cache age and fallback state." },
  { id: "ohlcv", label: "OHLCV", value: "required", copy: "Open, high, low, close and volume are separated from marketing copy." },
  { id: "second", label: "Second source", value: "compare", copy: "Confidence rises only when another source/reference agrees." },
  { id: "risk", label: "Risk", value: "human", copy: "Risk is explained as uncertainty, not as a buy/sell command." },
  { id: "issuer", label: "Issuer/ref", value: "mapped", copy: "Stocks, FX, commodities and proxies use their own reference lane." },
  { id: "security", label: "Security", value: "plain", copy: "Private key, signature, entropy and redaction are explained simply." },
  { id: "pdf", label: "PDF", value: "same object", copy: "Preview and download cannot create different text." },
  { id: "liquidity", label: "Liquidity", value: "separate", copy: "Depth, volume and spread are not mixed with social hype." },
  { id: "session", label: "Session", value: "calendar", copy: "Market hours and reference dates are visible before confidence." },
  { id: "fallback", label: "Fallback", value: "visible", copy: "Preview/cache/fallback states are labelled, not hidden." },
  { id: "macro", label: "Macro", value: "context", copy: "FX, rates, commodities and real estate are context lanes." },
  { id: "entropy", label: "Entropy", value: "quality", copy: "RNG/TRNG is public education about measured randomness, not wallet instructions." },
  { id: "ecc", label: "ECC/BTC", value: "conceptual", copy: "Signature proof is explained without exposing or generating keys." },
  { id: "prime", label: "Prime Lab", value: "audit", copy: "Prime research is benchmark, falsification and replication." },
  { id: "copy", label: "AI copy", value: "specific", copy: "Repeated filler is treated as a launch blocker." },
  { id: "operator", label: "Operator", value: "hidden", copy: "Thresholds and sensitive rules stay private." },
  { id: "launch", label: "Launch", value: "clean", copy: "Only the latest clean surface is shown to users." },
] as const;

export function buildPass383CleanReadout(input: { symbol: string; name: string; type: string; risk: number; source: string; mode: Pass383Mode }) {
  const count = input.mode === "advanced" ? 20 : input.mode === "pro" ? 14 : 10;
  const seconds = pass383BrainStages.reduce((sum, stage) => sum + stage.seconds, 0) + (input.mode === "advanced" ? 2.1 : input.mode === "pro" ? 1.0 : 0.4);
  const band = input.risk >= 60 ? "operator-review" : input.risk >= 42 ? "provider-watch" : "clean-preview";
  return {
    version: "PASS383.clean_launch_readout",
    count,
    seconds: Number(seconds.toFixed(1)),
    band,
    headline: `${input.symbol} runs through one clean Velmère audit path: provider truth, Shield chart, VLM Brain, Security bridge, Prime Lab boundary and PDF mirror.`,
    body: `${input.name} (${input.type}) returns ${count} short human fields. Source lane: ${input.source}. Missing provider evidence lowers confidence instead of creating random filler.`,
    fields: pass383Fields.slice(0, count),
  };
}

export const pass383AssetVisualPatch: Record<string, VisualPatch> = {
  ADYEN: { label: "Adyen", glyph: "AY", primary: "#0abf53", secondary: "#061b0e" },
  UBS: { label: "UBS", glyph: "UB", primary: "#e30613", secondary: "#111827" },
  DB: { label: "Deutsche Bank", glyph: "DB", primary: "#0018a8", secondary: "#061438" },
  SAN: { label: "Santander", glyph: "SA", primary: "#ec0000", secondary: "#210303" },
  ING: { label: "ING", glyph: "IN", primary: "#ff6200", secondary: "#2a1002" },
  BNP: { label: "BNP Paribas", glyph: "BN", primary: "#00965e", secondary: "#052719" },
  CSCO: { label: "Cisco", glyph: "CS", primary: "#049fd9", secondary: "#062033" },
  PANW: { label: "Palo Alto", glyph: "PA", primary: "#fa582d", secondary: "#220804" },
  CRWD: { label: "CrowdStrike", glyph: "CW", primary: "#e01f27", secondary: "#250306" },
  NET: { label: "Cloudflare", glyph: "CF", primary: "#f38020", secondary: "#261006" },
  DDOG: { label: "Datadog", glyph: "DD", primary: "#632ca6", secondary: "#160822" },
  SNOW: { label: "Snowflake", glyph: "SN", primary: "#29b5e8", secondary: "#061b27" },
  "GBP/JPY": { label: "Pound Yen", glyph: "£¥", primary: "#314a9f", secondary: "#bc002d" },
  "EUR/CHF": { label: "Euro Franc", glyph: "€F", primary: "#225eea", secondary: "#d52b1e" },
  "AUD/JPY": { label: "Aussie Yen", glyph: "A¥", primary: "#012169", secondary: "#bc002d" },
  "CAD/JPY": { label: "Loonie Yen", glyph: "C¥", primary: "#d80621", secondary: "#bc002d" },
  "EUR/SEK": { label: "Euro Krona", glyph: "€S", primary: "#225eea", secondary: "#006aa7" },
  "USD/ZAR": { label: "Dollar Rand", glyph: "$R", primary: "#0f8d61", secondary: "#007a4d" },
  XLF: { label: "Financial ETF", glyph: "XF", primary: "#315bdc", secondary: "#0b1438" },
  XLK: { label: "Tech ETF", glyph: "XK", primary: "#315bdc", secondary: "#0b1438" },
  SMH: { label: "Semiconductor ETF", glyph: "SM", primary: "#315bdc", secondary: "#0b1438" },
  HACK: { label: "Cyber ETF", glyph: "HK", primary: "#111827", secondary: "#22d3ee" },
  LUXURY: { label: "Luxury Basket", glyph: "LX", primary: "#d8b36a", secondary: "#23150a" },
  PLATINUM: { label: "Platinum", glyph: "Pt", primary: "#d7dde6", secondary: "#222831", text: "#111" },
  PALLADIUM: { label: "Palladium", glyph: "Pd", primary: "#d9d9d9", secondary: "#282828", text: "#111" },
  COFFEE: { label: "Coffee", glyph: "Cf", primary: "#6f4e37", secondary: "#1b0e08" },
  COCOA: { label: "Cocoa", glyph: "Cc", primary: "#7b3f00", secondary: "#1c0d03" },
  "GLOBAL-REIT": { label: "Global REIT", glyph: "GR", primary: "#9b7d52", secondary: "#211407" },
  "EU-HOUSING": { label: "EU Housing", glyph: "EH", primary: "#b99d72", secondary: "#24170d" },
  "US-HOUSING": { label: "US Housing", glyph: "UH", primary: "#b99d72", secondary: "#24170d" },
};

export const pass383PseudoPricePatch: Record<string, string> = {
  ADYEN: "€1,520", UBS: "CHF 31.20", DB: "€16.90", SAN: "€4.85", ING: "€16.60", BNP: "€71.40", CSCO: "$65.20", PANW: "$315.40", CRWD: "$360.20", NET: "$96.30", DDOG: "$134.80", SNOW: "$182.60",
  "GBP/JPY": "194.20", "EUR/CHF": "0.94", "AUD/JPY": "96.40", "CAD/JPY": "108.10", "EUR/SEK": "11.10", "USD/ZAR": "18.75", XLF: "$51.20", XLK: "$246.30", SMH: "$266.80", HACK: "$71.40", LUXURY: "basket", PLATINUM: "$1,040", PALLADIUM: "$930", COFFEE: "$2.35", COCOA: "$9,800", "GLOBAL-REIT": "proxy", "EU-HOUSING": "macro", "US-HOUSING": "macro",
};

export const pass383PdfMirror = {
  title: "PASS383 · Clean launch mirror",
  rule: "Preview, modal and downloaded PDF render the same clean launch readout: no historical pass wall, no random filler and no separate PDF text generator.",
  pages: ["identity", "provider truth", "Shield chart", "clean AI Brain", "security explainer", "research boundary"],
} as const;

export const pass383SecurityCopy = [
  "Klucz prywatny zostaje prywatny; Velmère pokazuje podpis i kontrolę bez proszenia o seed phrase.",
  "Entropia/RNG jest opisana jako jakość źródła losowości i walidacja, nie instrukcja tworzenia portfela.",
  "Publiczny raport pokazuje wnioski, źródła i braki; operatorowe reguły, progi i payloady zostają ukryte.",
] as const;

export const pass383ResearchLanes = [
  { id: "crypto", label: "Kryptografia", copy: "Banki i blockchain opierają zaufanie na podpisach, kontroli dostępu, logach i audycie." },
  { id: "ecc", label: "ECC / BTC", copy: "Krzywa eliptyczna pozwala udowodnić kontrolę klucza publicznie bez ujawniania sekretu." },
  { id: "rng", label: "Real RNG", copy: "Losowość w systemach bezpieczeństwa musi mieć mierzalne źródło entropii i testy jakości." },
  { id: "prime", label: "Prime Lab", copy: "Bajak Protocol pokazujemy jako audyt liczbowy: benchmark, falsyfikacja, replikacja i caveaty." },
  { id: "determinism", label: "Determinism animation", copy: "Animacja tłumaczy drogę: noise field → zeta resonance → correction lane → falsification gate → human readout." },
] as const;

const pass383MarketExpansion: UniversalAssetRow[] = [
  marketRow({ id: "adyen", rank: 880, symbol: "ADYEN", name: "Adyen", assetClass: "stock", riskPressure: 35, sparkTone: "watch", sourceRhythm: "EU equity provider + issuer disclosure", nextAdapterStep: "Attach Euronext/issuer disclosure lane and payments peer basket." }),
  marketRow({ id: "ubs", rank: 881, symbol: "UBS", name: "UBS Group", assetClass: "stock", riskPressure: 37, sparkTone: "flat", sourceRhythm: "Swiss equity provider + bank disclosure", nextAdapterStep: "Attach bank disclosure and credit stress context." }),
  marketRow({ id: "db", rank: 882, symbol: "DB", name: "Deutsche Bank", assetClass: "stock", riskPressure: 43, sparkTone: "watch", sourceRhythm: "equity provider + bank disclosure", nextAdapterStep: "Attach issuer filings, bank stress basket and Eurozone rate context." }),
  marketRow({ id: "san", rank: 883, symbol: "SAN", name: "Santander", assetClass: "stock", riskPressure: 39, sparkTone: "flat" }),
  marketRow({ id: "ing", rank: 884, symbol: "ING", name: "ING Group", assetClass: "stock", riskPressure: 38, sparkTone: "flat" }),
  marketRow({ id: "bnp", rank: 885, symbol: "BNP", name: "BNP Paribas", assetClass: "stock", riskPressure: 40, sparkTone: "watch" }),
  marketRow({ id: "csco", rank: 886, symbol: "CSCO", name: "Cisco", assetClass: "stock", riskPressure: 29, sparkTone: "flat" }),
  marketRow({ id: "panw", rank: 887, symbol: "PANW", name: "Palo Alto Networks", assetClass: "stock", riskPressure: 44, sparkTone: "watch" }),
  marketRow({ id: "crwd", rank: 888, symbol: "CRWD", name: "CrowdStrike", assetClass: "stock", riskPressure: 47, sparkTone: "watch" }),
  marketRow({ id: "net", rank: 889, symbol: "NET", name: "Cloudflare", assetClass: "stock", riskPressure: 46, sparkTone: "watch" }),
  marketRow({ id: "ddog", rank: 890, symbol: "DDOG", name: "Datadog", assetClass: "stock", riskPressure: 42, sparkTone: "watch" }),
  marketRow({ id: "snow", rank: 891, symbol: "SNOW", name: "Snowflake", assetClass: "stock", riskPressure: 45, sparkTone: "watch" }),
  marketRow({ id: "gbp-jpy", rank: 892, symbol: "GBP/JPY", name: "British Pound / Japanese Yen", assetClass: "fx", riskPressure: 44, sparkTone: "watch" }),
  marketRow({ id: "eur-chf", rank: 893, symbol: "EUR/CHF", name: "Euro / Swiss Franc", assetClass: "fx", riskPressure: 32, sparkTone: "flat" }),
  marketRow({ id: "aud-jpy", rank: 894, symbol: "AUD/JPY", name: "Australian Dollar / Yen", assetClass: "fx", riskPressure: 42, sparkTone: "watch" }),
  marketRow({ id: "cad-jpy", rank: 895, symbol: "CAD/JPY", name: "Canadian Dollar / Yen", assetClass: "fx", riskPressure: 40, sparkTone: "watch" }),
  marketRow({ id: "eur-sek", rank: 896, symbol: "EUR/SEK", name: "Euro / Swedish Krona", assetClass: "fx", riskPressure: 36, sparkTone: "flat" }),
  marketRow({ id: "usd-zar", rank: 897, symbol: "USD/ZAR", name: "Dollar / South African Rand", assetClass: "fx", riskPressure: 50, sparkTone: "watch" }),
  marketRow({ id: "xlf", rank: 898, symbol: "XLF", name: "Financial Select Sector SPDR", assetClass: "etf", riskPressure: 35, sparkTone: "flat" }),
  marketRow({ id: "xlk", rank: 899, symbol: "XLK", name: "Technology Select Sector SPDR", assetClass: "etf", riskPressure: 38, sparkTone: "up" }),
  marketRow({ id: "smh", rank: 900, symbol: "SMH", name: "VanEck Semiconductor ETF", assetClass: "etf", riskPressure: 46, sparkTone: "watch" }),
  marketRow({ id: "hack", rank: 901, symbol: "HACK", name: "Cybersecurity ETF", assetClass: "etf", riskPressure: 41, sparkTone: "watch" }),
  marketRow({ id: "luxury", rank: 902, symbol: "LUXURY", name: "Luxury sector basket", assetClass: "etf", riskPressure: 34, sparkTone: "flat" }),
  marketRow({ id: "platinum", rank: 903, symbol: "PLATINUM", name: "Platinum", assetClass: "commodity", riskPressure: 42, sparkTone: "watch" }),
  marketRow({ id: "palladium", rank: 904, symbol: "PALLADIUM", name: "Palladium", assetClass: "commodity", riskPressure: 48, sparkTone: "watch" }),
  marketRow({ id: "coffee", rank: 905, symbol: "COFFEE", name: "Coffee futures proxy", assetClass: "commodity", riskPressure: 46, sparkTone: "watch" }),
  marketRow({ id: "cocoa", rank: 906, symbol: "COCOA", name: "Cocoa futures proxy", assetClass: "commodity", riskPressure: 55, sparkTone: "watch" }),
  marketRow({ id: "global-reit", rank: 907, symbol: "GLOBAL-REIT", name: "Global REIT basket", assetClass: "real_estate", riskPressure: 39, sparkTone: "flat" }),
  marketRow({ id: "eu-housing", rank: 908, symbol: "EU-HOUSING", name: "EU housing pressure proxy", assetClass: "real_estate", riskPressure: 43, sparkTone: "watch" }),
  marketRow({ id: "us-housing", rank: 909, symbol: "US-HOUSING", name: "US housing pressure proxy", assetClass: "real_estate", riskPressure: 41, sparkTone: "watch" }),
];

export function buildPass383MarketCoverageUniverse() {
  return pass383MarketExpansion;
}
