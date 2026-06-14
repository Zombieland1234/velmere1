import type { UniversalAssetRow } from "./universal-asset-market-matrix";

export type Pass387Mode = "basic" | "pro" | "advanced";
type VisualPatch = { label: string; glyph: string; primary: string; secondary: string; text?: string; logoUrl?: string };

type MarketRowInput = Partial<UniversalAssetRow> & Pick<UniversalAssetRow, "id" | "rank" | "symbol" | "name" | "assetClass" | "riskPressure" | "sparkTone">;

function row(input: MarketRowInput): UniversalAssetRow {
  const family = input.assetClass === "fx" ? "FX" : input.assetClass === "commodity" ? "commodity" : input.assetClass === "real_estate" ? "real-estate proxy" : input.assetClass === "etf" ? "ETF" : input.assetClass === "exchange_token" ? "exchange venue" : "equity";
  return {
    sourceRhythm: input.sourceRhythm ?? `${family} provider spine · timestamp · OHLCV · session calendar · cache age · fallback flag`,
    priceLane: input.priceLane ?? `${family} uses the same Shield candle grammar: 1H / 4H / 1D / 1W, preview candles now, live OHLCV after provider key`,
    volumeLane: input.volumeLane ?? `${family} volume, spread, volatility and second-source drift stay separate from hype`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${family} issuer/reference/methodology lane`,
    secondSourceLane: input.secondSourceLane ?? "primary provider ↔ second source before stronger public confidence",
    confidenceFloor: input.confidenceFloor ?? 72,
    adapterState: input.adapterState ?? "provider_required",
    humanCopy: input.humanCopy ?? `${input.symbol} is production-mapped through PASS387: icon, Shield chart, provider truth, VLM Brain, Security bridge, Research boundary and exact PDF mirror use one resolved object.`,
    nextAdapterStep: input.nextAdapterStep ?? "Attach live provider key, timestamp, OHLCV cache, issuer/reference lane, second source compare, locale lock and PDF mirror test.",
    ...input,
  };
}

export const pass387ProductionSignalContract = {
  version: "PASS387.production_signal_spine",
  publicRule: "One public product surface wins: Real Markets must feel like Shield, not like a debug board of historical passes.",
  marketRule: "Every asset has logo/glyph, Shield-grade candles, timeframe, source state, Basic/Pro/Advanced, VLM Brain and exact PDF mirror.",
  providerRule: "All world markets can be listed provider-ready, but strong live status only unlocks after timestamp, OHLCV, cache age, fallback and second source.",
  pdfRule: "Browser preview, modal preview and downloaded PDF must render the same resolved report object in PL/EN/DE.",
  brainRule: "The VLM coin behaves like a 3D neural intake: data lanes flow into the core, then resolve into a useful 10/14/20 field readout.",
  copyRule: "The AI copy engine must mention the exact asset class, source status, missing proof and next safe step. Generic filler is treated as a bug.",
  securityRule: "Security copy is public-simple: private key stays private, signature proves control, entropy has quality, reports are redacted.",
} as const;

export const pass387BrainStages = [
  { id: "intake", label: "Signal intake", seconds: 0.6, copy: "Symbol, locale, asset class and visual identity lock before the animation starts." },
  { id: "provider", label: "Provider lock", seconds: 0.9, copy: "Timestamp, OHLCV, cache age, fallback and market calendar decide how strong the public copy may be." },
  { id: "chart", label: "Shield chart", seconds: 1.0, copy: "Crypto, stock, FX, ETF and commodities share one candle grammar and timeframe switch." },
  { id: "neural", label: "Neural flow", seconds: 1.5, copy: "Source, liquidity, issuer, macro and second-source lanes move into the VLM core." },
  { id: "security", label: "Security bridge", seconds: 1.0, copy: "Private-key boundary, signature proof, entropy quality and redaction are translated into simple language." },
  { id: "research", label: "Prime Lab", seconds: 1.1, copy: "Prime/Riemann work stays positioned as numerical audit, falsification and replication." },
  { id: "readout", label: "Human readout", seconds: 1.2, copy: "The brain resolves into a short decision field, not a pile of repeating pass cards." },
  { id: "mirror", label: "PDF mirror", seconds: 0.7, copy: "Preview and download use the same report object and selected language." },
] as const;

export const pass387ProviderMatrix = [
  { id: "equities", label: "Equities", state: "quote + issuer", copy: "US/EU/Asia stock rows need quote provider, market calendar, filings/company facts and peer basket." },
  { id: "fx", label: "FX", state: "reference + intraday", copy: "FX rows need reference cadence, intraday provider, holiday calendar and volatility band." },
  { id: "commodities", label: "Commodities", state: "spot/futures", copy: "Gold, silver, oil, gas, copper and agriculture need source type, contract context and timestamp." },
  { id: "etf", label: "ETF / funds", state: "holdings cadence", copy: "ETF rows need price provider, methodology, holdings cadence and sector/region mapping." },
  { id: "realestate", label: "Real estate", state: "proxy only", copy: "REIT/ETF/housing proxies are slower macro context, not second-by-second property valuation." },
  { id: "venues", label: "Exchange health", state: "heartbeat", copy: "Venue rows need API status, depth, withdrawals, reserve context, social stress and second venue." },
  { id: "pdf", label: "PDF parity", state: "exact mirror", copy: "The same object renders Browser preview, modal preview and downloadable PDF." },
] as const;

export const pass387SecurityOnePageCopy = [
  "Private key stays private: Velmère never needs seed phrase, raw key or hidden wallet secret to explain security.",
  "Signature proof explains control without exposing the secret, similar to an approval log rather than a public password.",
  "Provider truth keeps Real Markets honest: no strong live wording without timestamp, OHLCV, cache age, fallback and second source.",
  "Entropy/RNG is described as measurable randomness quality and validation, not as an operational wallet-generation recipe.",
  "Redacted report shows sources, missing proof and result while operator thresholds and abuse rules remain private.",
] as const;

export const pass387ResearchBridge = [
  { id: "banks", label: "Banki", copy: "Sesje, podpisy, limity, logi, audyt i reakcja na nadużycia tworzą język zaufania, który Velmère tłumaczy prostym copy." },
  { id: "crypto", label: "Kryptografia", copy: "Kryptografia pozwala potwierdzić kontrolę, integralność albo autentyczność bez ujawniania prywatnego sekretu." },
  { id: "ecc", label: "ECC / BTC", copy: "Krzywa eliptyczna i podpis są pokazane koncepcyjnie: sekret zostaje prywatny, publiczny dowód potwierdza kontrolę." },
  { id: "entropy", label: "Real RNG", copy: "Losowość ma jakość: entropia, health checks i walidacja źródła. To edukacja bezpieczeństwa, nie instrukcja tworzenia portfela." },
  { id: "primes", label: "Liczby pierwsze", copy: "Prime Lab tłumaczy rozkład liczb pierwszych, funkcje zeta i residual π(x)-R(x) jako audyt matematyczny." },
  { id: "bajak", label: "Bajak Protocol", copy: "Publiczna rama: finite numerical reconstruction, benchmark, fake-zero control, neighbor-shift, negative controls i replikacja." },
] as const;

const fields = [
  { id: "identity", label: "Identity", value: "locked", copy: "Name, symbol, class, locale and visual mark resolve once." },
  { id: "chart", label: "Chart", value: "Shield-grade", copy: "One candle grammar works for crypto and real markets." },
  { id: "provider", label: "Provider", value: "timestamp-first", copy: "Live confidence waits for timestamp, OHLCV and cache age." },
  { id: "fallback", label: "Fallback", value: "visible", copy: "Preview/delayed/provider-required states stay visible." },
  { id: "second", label: "Second source", value: "needed", copy: "Confidence rises only after another source confirms the read." },
  { id: "risk", label: "Risk", value: "human", copy: "Risk explains uncertainty and never becomes buy/sell command." },
  { id: "liquidity", label: "Liquidity", value: "separate", copy: "Depth, spread and volume are not mixed with hype." },
  { id: "issuer", label: "Issuer/ref", value: "mapped", copy: "Stocks use filings; FX and commodities use reference methodology." },
  { id: "pdf", label: "PDF", value: "same object", copy: "Preview and download render the same resolved report." },
  { id: "copy", label: "AI copy", value: "specific", copy: "The output mentions the asset class and missing proof." },
  { id: "security", label: "Security", value: "simple", copy: "Private key, signature proof and redaction stay understandable." },
  { id: "entropy", label: "Entropy", value: "quality", copy: "RNG/TRNG is explained as validation of randomness, not a recipe." },
  { id: "ecc", label: "ECC / BTC", value: "conceptual", copy: "Wallet cryptography is explained without exposing secrets." },
  { id: "prime", label: "Prime Lab", value: "audit", copy: "Bajak Protocol remains benchmark, falsification and replication." },
  { id: "macro", label: "Macro", value: "context", copy: "FX, rates, commodities and real estate are context lanes." },
  { id: "session", label: "Session", value: "calendar", copy: "Market hours and reference date are part of source truth." },
  { id: "operator", label: "Operator", value: "private", copy: "Thresholds, payloads and abuse heuristics stay hidden." },
  { id: "language", label: "Language", value: "PL/EN/DE", copy: "The selected page language controls Browser/PDF copy." },
  { id: "launch", label: "Launch", value: "clean", copy: "The public user sees one terminal, not pass history." },
  { id: "proof", label: "Proof", value: "redacted", copy: "Sources and gaps are visible; sensitive rules are not." },
] as const;

export function buildPass387ProductionSignalReadout(input: { symbol: string; name: string; type: string; risk: number; source: string; mode: Pass387Mode }) {
  const count = input.mode === "advanced" ? 20 : input.mode === "pro" ? 14 : 10;
  const seconds = pass387BrainStages.reduce((sum, phase) => sum + phase.seconds, 0) + (input.mode === "advanced" ? 2.2 : input.mode === "pro" ? 1.2 : 0.4);
  const band = input.risk >= 66 ? "operator-review" : input.risk >= 44 ? "provider-watch" : "clean-preview";
  return {
    version: "PASS387.production_signal_readout",
    count,
    seconds: Number(seconds.toFixed(1)),
    band,
    headline: `${input.symbol} przechodzi jeden finalny terminal: provider truth, wykres Shield, VLM Brain, Security bridge, Prime Lab boundary i PDF mirror.`,
    body: `${input.name} (${input.type}) zwraca ${count} pól z jednego kontraktu. Source lane: ${input.source}. AI nie dopisuje losowego fillera, tylko pokazuje źródła, braki i następny bezpieczny krok.`,
    fields: fields.slice(0, count),
  };
}

export const pass387AssetVisualPatch: Record<string, VisualPatch> = {
  BKNG: { label: "Booking", glyph: "BK", primary: "#003b95", secondary: "#0b1c3d" },
  ABNB: { label: "Airbnb", glyph: "AB", primary: "#ff5a5f", secondary: "#2b0b0d" },
  UBER: { label: "Uber", glyph: "UB", primary: "#111827", secondary: "#6b7280" },
  DASH: { label: "DoorDash", glyph: "DD", primary: "#ff3008", secondary: "#260704" },
  SHOP: { label: "Shopify", glyph: "SH", primary: "#7ab55c", secondary: "#16300f" },
  MELI: { label: "MercadoLibre", glyph: "ML", primary: "#ffe600", secondary: "#26336b", text: "#111" },
  SE: { label: "Sea Ltd", glyph: "SE", primary: "#f97316", secondary: "#2a1003" },
  TCEHY: { label: "Tencent", glyph: "TC", primary: "#0ea5e9", secondary: "#062238" },
  BABA: { label: "Alibaba", glyph: "BA", primary: "#ff6a00", secondary: "#281004" },
  PDD: { label: "PDD", glyph: "PD", primary: "#d71920", secondary: "#260305" },
  SONY: { label: "Sony", glyph: "SO", primary: "#0f172a", secondary: "#8aa4c8" },
  NTDOY: { label: "Nintendo", glyph: "NT", primary: "#e60012", secondary: "#260305" },
  "ADS.DE": { label: "Adidas", glyph: "AD", primary: "#f7f7f7", secondary: "#111827", text: "#111" },
  "RMS.PA": { label: "Hermès", glyph: "HR", primary: "#f37021", secondary: "#2d1104" },
  "KER.PA": { label: "Kering", glyph: "KR", primary: "#d8b36a", secondary: "#23150a" },
  "CFR.SW": { label: "Richemont", glyph: "RC", primary: "#c8a96a", secondary: "#1e1609" },
  "NESN.SW": { label: "Nestlé", glyph: "NS", primary: "#5a4632", secondary: "#1f160c" },
  "NOVN.SW": { label: "Novartis", glyph: "NV", primary: "#7658a8", secondary: "#170b2a" },
  RACE: { label: "Ferrari", glyph: "FR", primary: "#ff2800", secondary: "#2a0501" },
  STLA: { label: "Stellantis", glyph: "ST", primary: "#243782", secondary: "#09102c" },
  "EUR/CZK": { label: "Euro / Czech Koruna", glyph: "CZ", primary: "#0f4c81", secondary: "#081b2c" },
  "USD/CZK": { label: "Dollar / Czech Koruna", glyph: "CZ", primary: "#155e75", secondary: "#06242d" },
  "EUR/HUF": { label: "Euro / Forint", glyph: "HU", primary: "#16a34a", secondary: "#06240f" },
  "USD/HUF": { label: "Dollar / Forint", glyph: "HU", primary: "#22c55e", secondary: "#06220f" },
  "EUR/RON": { label: "Euro / Leu", glyph: "RO", primary: "#2563eb", secondary: "#0a1f4a" },
  "USD/RON": { label: "Dollar / Leu", glyph: "RO", primary: "#1d4ed8", secondary: "#071a3d" },
  COPPER: { label: "Copper", glyph: "Cu", primary: "#b87333", secondary: "#2a1207" },
  ALUMINUM: { label: "Aluminium", glyph: "Al", primary: "#a8b0b6", secondary: "#1f2937", text: "#111" },
  WHEAT: { label: "Wheat", glyph: "Wh", primary: "#d8b36a", secondary: "#33250b" },
  CORN: { label: "Corn", glyph: "Co", primary: "#facc15", secondary: "#2c2103", text: "#111" },
};

export const pass387PseudoPricePatch: Record<string, { price: string; change: string }> = {
  BKNG: { price: "$3.7k", change: "+0.6%" }, ABNB: { price: "$144", change: "+0.5%" }, UBER: { price: "$70", change: "+0.8%" }, DASH: { price: "$115", change: "+0.4%" }, SHOP: { price: "$78", change: "+0.7%" }, MELI: { price: "$1.6k", change: "+0.9%" }, SE: { price: "$65", change: "+0.5%" }, TCEHY: { price: "$48", change: "+0.4%" }, BABA: { price: "$82", change: "+0.3%" }, PDD: { price: "$135", change: "+0.6%" }, SONY: { price: "$88", change: "+0.2%" }, NTDOY: { price: "$13", change: "+0.3%" }, "ADS.DE": { price: "€214", change: "+0.5%" }, "RMS.PA": { price: "€2.2k", change: "+0.4%" }, "KER.PA": { price: "€340", change: "+0.2%" }, "CFR.SW": { price: "CHF 136", change: "+0.3%" }, "NESN.SW": { price: "CHF 92", change: "+0.1%" }, "NOVN.SW": { price: "CHF 96", change: "+0.2%" }, RACE: { price: "$410", change: "+0.6%" }, STLA: { price: "$22", change: "+0.2%" }, "EUR/CZK": { price: "24.7", change: "+0.1%" }, "USD/CZK": { price: "22.9", change: "+0.2%" }, "EUR/HUF": { price: "391", change: "+0.1%" }, "USD/HUF": { price: "363", change: "+0.2%" }, "EUR/RON": { price: "4.98", change: "flat" }, "USD/RON": { price: "4.62", change: "+0.1%" }, COPPER: { price: "$4.40/lb", change: "+0.5%" }, ALUMINUM: { price: "$2.5k/t", change: "+0.3%" }, WHEAT: { price: "$6.1/bu", change: "+0.4%" }, CORN: { price: "$4.6/bu", change: "+0.3%" },
};

export function buildPass387MarketCoverageUniverse(): UniversalAssetRow[] {
  return [
    row({ id: "bkng-pass387", rank: 1660, symbol: "BKNG", name: "Booking Holdings", assetClass: "stock", riskPressure: 35, sparkTone: "up", humanCopy: "Travel demand stock. Velmère tracks quote, session, volume, company events and macro travel sensitivity before stronger copy." }),
    row({ id: "abnb-pass387", rank: 1661, symbol: "ABNB", name: "Airbnb", assetClass: "stock", riskPressure: 41, sparkTone: "watch", humanCopy: "Marketplace travel stock with regulatory and housing sensitivity. Provider timestamp and filings are required before live claims." }),
    row({ id: "uber-pass387", rank: 1662, symbol: "UBER", name: "Uber", assetClass: "stock", riskPressure: 39, sparkTone: "up", humanCopy: "Mobility platform stock. Price, volume, margin events and regulatory news need a second-source lane." }),
    row({ id: "dash-pass387", rank: 1663, symbol: "DASH", name: "DoorDash", assetClass: "stock", riskPressure: 43, sparkTone: "watch", humanCopy: "Delivery platform stock. Velmère separates price movement, demand events and margin sensitivity." }),
    row({ id: "shop-pass387", rank: 1664, symbol: "SHOP", name: "Shopify", assetClass: "stock", riskPressure: 38, sparkTone: "up", humanCopy: "Commerce infrastructure stock with merchant-cycle context and earnings cadence." }),
    row({ id: "meli-pass387", rank: 1665, symbol: "MELI", name: "MercadoLibre", assetClass: "stock", riskPressure: 42, sparkTone: "up", humanCopy: "Latin America commerce/fintech stock. FX, rates and regional risk stay visible as context." }),
    row({ id: "se-pass387", rank: 1666, symbol: "SE", name: "Sea Limited", assetClass: "stock", riskPressure: 46, sparkTone: "watch", humanCopy: "Asia commerce/gaming/fintech stock with higher volatility; second source and filings are required for stronger copy." }),
    row({ id: "tcehy-pass387", rank: 1667, symbol: "TCEHY", name: "Tencent", assetClass: "stock", riskPressure: 40, sparkTone: "flat", humanCopy: "Asia mega-cap proxy. Velmère shows provider state, region context and issuer lane." }),
    row({ id: "baba-pass387", rank: 1668, symbol: "BABA", name: "Alibaba", assetClass: "stock", riskPressure: 45, sparkTone: "watch", humanCopy: "China commerce/cloud stock. Regulatory and FX context are separate from price candles." }),
    row({ id: "pdd-pass387", rank: 1669, symbol: "PDD", name: "PDD Holdings", assetClass: "stock", riskPressure: 44, sparkTone: "up", humanCopy: "China commerce stock. Provider timestamp, volume and issuer events drive confidence." }),
    row({ id: "sony-pass387", rank: 1670, symbol: "SONY", name: "Sony", assetClass: "stock", riskPressure: 34, sparkTone: "flat", humanCopy: "Japan electronics/media stock. FX and sector basket help explain context." }),
    row({ id: "ntdoy-pass387", rank: 1671, symbol: "NTDOY", name: "Nintendo", assetClass: "stock", riskPressure: 36, sparkTone: "flat", humanCopy: "Gaming hardware/software proxy. Velmère waits for quote timestamp and event lane before strong wording." }),
    row({ id: "ads-pass387", rank: 1672, symbol: "ADS.DE", name: "Adidas", assetClass: "stock", riskPressure: 37, sparkTone: "up", humanCopy: "European sportswear proxy for Velmère context: brand, consumer demand, FX and region session." }),
    row({ id: "rms-pass387", rank: 1673, symbol: "RMS.PA", name: "Hermès", assetClass: "stock", riskPressure: 31, sparkTone: "flat", humanCopy: "Luxury benchmark proxy. Used as brand-market context, not as trading advice." }),
    row({ id: "ker-pass387", rank: 1674, symbol: "KER.PA", name: "Kering", assetClass: "stock", riskPressure: 36, sparkTone: "watch", humanCopy: "Luxury sector proxy. Velmère separates brand-market context from investment conclusions." }),
    row({ id: "cfr-pass387", rank: 1675, symbol: "CFR.SW", name: "Richemont", assetClass: "stock", riskPressure: 33, sparkTone: "flat", humanCopy: "Swiss luxury proxy for watch/jewellery context and premium market pressure." }),
    row({ id: "nesn-pass387", rank: 1676, symbol: "NESN.SW", name: "Nestlé", assetClass: "stock", riskPressure: 28, sparkTone: "flat", humanCopy: "Defensive consumer stock. Used as low-volatility consumer context." }),
    row({ id: "novn-pass387", rank: 1677, symbol: "NOVN.SW", name: "Novartis", assetClass: "stock", riskPressure: 30, sparkTone: "flat", humanCopy: "Healthcare defensive stock with issuer and regional market context." }),
    row({ id: "race-pass387", rank: 1678, symbol: "RACE", name: "Ferrari", assetClass: "stock", riskPressure: 34, sparkTone: "up", humanCopy: "Premium automotive/luxury proxy. Brand strength and market session are separate from price signal." }),
    row({ id: "stla-pass387", rank: 1679, symbol: "STLA", name: "Stellantis", assetClass: "stock", riskPressure: 39, sparkTone: "watch", humanCopy: "Automotive stock. Velmère separates macro/sector pressure from issuer-specific events." }),
    row({ id: "eurczk-pass387", rank: 1680, symbol: "EUR/CZK", name: "Euro / Czech Koruna", assetClass: "fx", riskPressure: 29, sparkTone: "flat" }),
    row({ id: "usdczk-pass387", rank: 1681, symbol: "USD/CZK", name: "Dollar / Czech Koruna", assetClass: "fx", riskPressure: 32, sparkTone: "flat" }),
    row({ id: "eurhuf-pass387", rank: 1682, symbol: "EUR/HUF", name: "Euro / Hungarian Forint", assetClass: "fx", riskPressure: 37, sparkTone: "watch" }),
    row({ id: "usdhuf-pass387", rank: 1683, symbol: "USD/HUF", name: "Dollar / Hungarian Forint", assetClass: "fx", riskPressure: 39, sparkTone: "watch" }),
    row({ id: "eurron-pass387", rank: 1684, symbol: "EUR/RON", name: "Euro / Romanian Leu", assetClass: "fx", riskPressure: 31, sparkTone: "flat" }),
    row({ id: "usdron-pass387", rank: 1685, symbol: "USD/RON", name: "Dollar / Romanian Leu", assetClass: "fx", riskPressure: 33, sparkTone: "flat" }),
    row({ id: "copper-pass387", rank: 1686, symbol: "COPPER", name: "Copper", assetClass: "commodity", riskPressure: 42, sparkTone: "up", humanCopy: "Industrial metal proxy. Used for macro/industry context with source type and contract timestamp." }),
    row({ id: "aluminum-pass387", rank: 1687, symbol: "ALUMINUM", name: "Aluminium", assetClass: "commodity", riskPressure: 39, sparkTone: "flat", humanCopy: "Industrial metal proxy. Velmère marks contract/source status before confidence rises." }),
    row({ id: "wheat-pass387", rank: 1688, symbol: "WHEAT", name: "Wheat", assetClass: "commodity", riskPressure: 43, sparkTone: "watch", humanCopy: "Agriculture commodity proxy. Weather/geopolitics/contract source context must be explicit." }),
    row({ id: "corn-pass387", rank: 1689, symbol: "CORN", name: "Corn", assetClass: "commodity", riskPressure: 41, sparkTone: "watch", humanCopy: "Agriculture commodity proxy. Source type and contract month must be clear before stronger copy." }),
  ];
}
