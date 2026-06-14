import type { UniversalAssetRow } from "./universal-asset-market-matrix";

export type Pass374Mode = "basic" | "pro" | "advanced";

function row(input: Partial<UniversalAssetRow> & Pick<UniversalAssetRow, "id" | "rank" | "symbol" | "name" | "assetClass" | "riskPressure" | "sparkTone">): UniversalAssetRow {
  const family = input.assetClass === "fx" ? "FX" : input.assetClass === "commodity" ? "commodity" : input.assetClass === "real_estate" ? "real-estate proxy" : input.assetClass === "etf" ? "ETF" : "equity";
  return {
    sourceRhythm: input.sourceRhythm ?? `${family} provider timestamp + cache age + second-source freshness`,
    priceLane: input.priceLane ?? `${family} OHLCV candle lane`,
    volumeLane: input.volumeLane ?? `${family} volume / volatility / gap lane`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${family} disclosure/reference lane`,
    secondSourceLane: input.secondSourceLane ?? "provider A ↔ provider B before strong public copy",
    confidenceFloor: input.confidenceFloor ?? 54,
    adapterState: input.adapterState ?? "provider_required",
    humanCopy: input.humanCopy ?? `${input.symbol} dostaje ten sam terminal co crypto Shield: logo, świecowy wykres, timestamp źródła, ryzyko i Basic / Pro / Advanced bez udawania live.` ,
    nextAdapterStep: input.nextAdapterStep ?? "Attach timestamp, OHLCV source, cache age, fallback flag, second-source divergence and disclosure/reference calendar.",
    ...input,
  };
}

export const pass374RealMarketExpansion: UniversalAssetRow[] = [
  // US mega / software / chips / consumer
  row({ id: "pass374-amzn", rank: 184, symbol: "AMZN", name: "Amazon", assetClass: "stock", riskPressure: 37, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + consumer/cloud basket" }),
  row({ id: "pass374-googl", rank: 185, symbol: "GOOGL", name: "Alphabet", assetClass: "stock", riskPressure: 34, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + ads/cloud basket" }),
  row({ id: "pass374-meta", rank: 186, symbol: "META", name: "Meta Platforms", assetClass: "stock", riskPressure: 38, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + social platform basket" }),
  row({ id: "pass374-tsla", rank: 187, symbol: "TSLA", name: "Tesla", assetClass: "stock", riskPressure: 55, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + high beta / auto basket" }),
  row({ id: "pass374-avgo", rank: 188, symbol: "AVGO", name: "Broadcom", assetClass: "stock", riskPressure: 42, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + semiconductor basket" }),
  row({ id: "pass374-orcl", rank: 189, symbol: "ORCL", name: "Oracle", assetClass: "stock", riskPressure: 36, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + enterprise software basket" }),
  row({ id: "pass374-nflx", rank: 190, symbol: "NFLX", name: "Netflix", assetClass: "stock", riskPressure: 42, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + media basket" }),
  row({ id: "pass374-pypl", rank: 191, symbol: "PYPL", name: "PayPal", assetClass: "stock", riskPressure: 43, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + payments basket" }),
  row({ id: "pass374-visa", rank: 192, symbol: "V", name: "Visa", assetClass: "stock", riskPressure: 29, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + payments network" }),
  row({ id: "pass374-ma", rank: 193, symbol: "MA", name: "Mastercard", assetClass: "stock", riskPressure: 30, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + payments network" }),
  row({ id: "pass374-uber", rank: 194, symbol: "UBER", name: "Uber", assetClass: "stock", riskPressure: 44, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + mobility basket" }),
  row({ id: "pass374-snow", rank: 195, symbol: "SNOW", name: "Snowflake", assetClass: "stock", riskPressure: 47, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + cloud data basket" }),

  // European and luxury/industrial watchlist
  row({ id: "pass374-asml", rank: 196, symbol: "ASML", name: "ASML Holding", assetClass: "stock", riskPressure: 37, sparkTone: "flat", proofOrDisclosureLane: "issuer disclosure + semiconductor equipment" }),
  row({ id: "pass374-novo", rank: 197, symbol: "NOVO-B.CO", name: "Novo Nordisk", assetClass: "stock", riskPressure: 33, sparkTone: "flat", proofOrDisclosureLane: "issuer disclosure + healthcare basket" }),
  row({ id: "pass374-sap", rank: 198, symbol: "SAP.DE", name: "SAP", assetClass: "stock", riskPressure: 31, sparkTone: "flat", proofOrDisclosureLane: "EU issuer disclosure + enterprise software" }),
  row({ id: "pass374-sie", rank: 199, symbol: "SIE.DE", name: "Siemens", assetClass: "stock", riskPressure: 33, sparkTone: "flat", proofOrDisclosureLane: "EU issuer disclosure + industry basket" }),
  row({ id: "pass374-air", rank: 200, symbol: "AIR.PA", name: "Airbus", assetClass: "stock", riskPressure: 36, sparkTone: "flat", proofOrDisclosureLane: "EU issuer disclosure + aerospace basket" }),
  row({ id: "pass374-rms", rank: 201, symbol: "RMS.PA", name: "Hermes", assetClass: "stock", riskPressure: 29, sparkTone: "flat", proofOrDisclosureLane: "EU issuer disclosure + luxury peer basket" }),
  row({ id: "pass374-richemont", rank: 202, symbol: "CFR.SW", name: "Richemont", assetClass: "stock", riskPressure: 34, sparkTone: "flat", proofOrDisclosureLane: "issuer disclosure + luxury watch/jewellery basket" }),
  row({ id: "pass374-zal", rank: 203, symbol: "ZAL.DE", name: "Zalando", assetClass: "stock", riskPressure: 45, sparkTone: "watch", proofOrDisclosureLane: "EU issuer disclosure + fashion commerce basket" }),

  // Asia / global ADR proxy
  row({ id: "pass374-tm", rank: 204, symbol: "TM", name: "Toyota", assetClass: "stock", riskPressure: 32, sparkTone: "flat", proofOrDisclosureLane: "issuer disclosure + auto basket" }),
  row({ id: "pass374-sony", rank: 205, symbol: "SONY", name: "Sony", assetClass: "stock", riskPressure: 35, sparkTone: "flat", proofOrDisclosureLane: "issuer disclosure + media/hardware basket" }),
  row({ id: "pass374-baba", rank: 206, symbol: "BABA", name: "Alibaba", assetClass: "stock", riskPressure: 50, sparkTone: "watch", proofOrDisclosureLane: "issuer disclosure + China ADR risk lane" }),
  row({ id: "pass374-tcehy", rank: 207, symbol: "TCEHY", name: "Tencent", assetClass: "stock", riskPressure: 48, sparkTone: "watch", proofOrDisclosureLane: "issuer disclosure + China platform basket" }),
  row({ id: "pass374-tsm", rank: 208, symbol: "TSM", name: "TSMC", assetClass: "stock", riskPressure: 43, sparkTone: "watch", proofOrDisclosureLane: "issuer disclosure + semiconductor supply chain" }),

  // G10 + EM FX expansion
  row({ id: "pass374-usdchf", rank: 241, symbol: "USD/CHF", name: "Dollar / Swiss Franc", assetClass: "fx", riskPressure: 31, sparkTone: "flat", adapterState: "daily_reference" }),
  row({ id: "pass374-eurchf", rank: 242, symbol: "EUR/CHF", name: "Euro / Swiss Franc", assetClass: "fx", riskPressure: 29, sparkTone: "flat", adapterState: "daily_reference" }),
  row({ id: "pass374-gbpusd", rank: 243, symbol: "GBP/USD", name: "British Pound / Dollar", assetClass: "fx", riskPressure: 34, sparkTone: "flat", adapterState: "daily_reference" }),
  row({ id: "pass374-audusd", rank: 244, symbol: "AUD/USD", name: "Australian Dollar / Dollar", assetClass: "fx", riskPressure: 36, sparkTone: "flat", adapterState: "daily_reference" }),
  row({ id: "pass374-usdcad", rank: 245, symbol: "USD/CAD", name: "Dollar / Canadian Dollar", assetClass: "fx", riskPressure: 35, sparkTone: "flat", adapterState: "daily_reference" }),
  row({ id: "pass374-nzdusd", rank: 246, symbol: "NZD/USD", name: "New Zealand Dollar / Dollar", assetClass: "fx", riskPressure: 37, sparkTone: "flat", adapterState: "daily_reference" }),
  row({ id: "pass374-eurnok", rank: 247, symbol: "EUR/NOK", name: "Euro / Norwegian Krone", assetClass: "fx", riskPressure: 38, sparkTone: "watch", adapterState: "daily_reference" }),
  row({ id: "pass374-eursek", rank: 248, symbol: "EUR/SEK", name: "Euro / Swedish Krona", assetClass: "fx", riskPressure: 37, sparkTone: "flat", adapterState: "daily_reference" }),
  row({ id: "pass374-usdils", rank: 249, symbol: "USD/ILS", name: "Dollar / Israeli Shekel", assetClass: "fx", riskPressure: 43, sparkTone: "watch", adapterState: "daily_reference" }),
  row({ id: "pass374-usdkrw", rank: 250, symbol: "USD/KRW", name: "Dollar / Korean Won", assetClass: "fx", riskPressure: 41, sparkTone: "watch", adapterState: "daily_reference" }),
  row({ id: "pass374-usdtwd", rank: 251, symbol: "USD/TWD", name: "Dollar / Taiwan Dollar", assetClass: "fx", riskPressure: 42, sparkTone: "watch", adapterState: "daily_reference" }),
  row({ id: "pass374-usdthb", rank: 252, symbol: "USD/THB", name: "Dollar / Thai Baht", assetClass: "fx", riskPressure: 38, sparkTone: "flat", adapterState: "daily_reference" }),

  // ETF / macro factor expansion
  row({ id: "pass374-dia", rank: 340, symbol: "DIA", name: "Dow Jones ETF", assetClass: "etf", riskPressure: 34, sparkTone: "flat" }),
  row({ id: "pass374-iwm", rank: 341, symbol: "IWM", name: "Russell 2000 ETF", assetClass: "etf", riskPressure: 48, sparkTone: "watch" }),
  row({ id: "pass374-tlt", rank: 342, symbol: "TLT", name: "20+ Year Treasury ETF", assetClass: "etf", riskPressure: 45, sparkTone: "watch" }),
  row({ id: "pass374-hyg", rank: 343, symbol: "HYG", name: "High Yield Bond ETF", assetClass: "etf", riskPressure: 47, sparkTone: "watch" }),
  row({ id: "pass374-ief", rank: 344, symbol: "IEF", name: "7-10 Year Treasury ETF", assetClass: "etf", riskPressure: 35, sparkTone: "flat" }),
  row({ id: "pass374-xlf", rank: 345, symbol: "XLF", name: "Financials ETF", assetClass: "etf", riskPressure: 39, sparkTone: "flat" }),
  row({ id: "pass374-xlk", rank: 346, symbol: "XLK", name: "Technology ETF", assetClass: "etf", riskPressure: 43, sparkTone: "watch" }),
  row({ id: "pass374-xle", rank: 347, symbol: "XLE", name: "Energy ETF", assetClass: "etf", riskPressure: 42, sparkTone: "watch" }),

  // Commodity/futures method expansion
  row({ id: "pass374-copper", rank: 437, symbol: "COPPER", name: "Copper", assetClass: "commodity", riskPressure: 39, sparkTone: "flat", priceLane: "industrial metal futures / spot method" }),
  row({ id: "pass374-ng", rank: 438, symbol: "NATGAS", name: "Natural Gas", assetClass: "commodity", riskPressure: 56, sparkTone: "watch", priceLane: "energy futures / spot method" }),
  row({ id: "pass374-wheat", rank: 439, symbol: "WHEAT", name: "Wheat", assetClass: "commodity", riskPressure: 45, sparkTone: "watch", priceLane: "agri futures / spot method" }),
  row({ id: "pass374-corn", rank: 440, symbol: "CORN", name: "Corn", assetClass: "commodity", riskPressure: 41, sparkTone: "watch", priceLane: "agri futures / spot method" }),
  row({ id: "pass374-soy", rank: 441, symbol: "SOYBEANS", name: "Soybeans", assetClass: "commodity", riskPressure: 42, sparkTone: "watch", priceLane: "agri futures / spot method" }),
  row({ id: "pass374-platinum", rank: 442, symbol: "PLATINUM", name: "Platinum", assetClass: "commodity", riskPressure: 40, sparkTone: "flat", priceLane: "precious metal spot/futures method" }),
  row({ id: "pass374-palladium", rank: 443, symbol: "PALLADIUM", name: "Palladium", assetClass: "commodity", riskPressure: 48, sparkTone: "watch", priceLane: "precious metal spot/futures method" }),

  // Real estate and credit proxies
  row({ id: "pass374-xlre", rank: 523, symbol: "XLRE", name: "Real Estate Select Sector", assetClass: "real_estate", riskPressure: 39, sparkTone: "flat", adapterState: "slow_macro" }),
  row({ id: "pass374-vnqi", rank: 524, symbol: "VNQI", name: "Global ex-US Real Estate ETF", assetClass: "real_estate", riskPressure: 43, sparkTone: "watch", adapterState: "slow_macro" }),
  row({ id: "pass374-mbb", rank: 525, symbol: "MBB", name: "Mortgage-Backed Securities ETF", assetClass: "real_estate", riskPressure: 37, sparkTone: "flat", adapterState: "slow_macro" }),
  row({ id: "pass374-iyr", rank: 526, symbol: "IYR", name: "US Real Estate ETF", assetClass: "real_estate", riskPressure: 40, sparkTone: "flat", adapterState: "slow_macro" }),
];

export const pass374ProviderParityContract = {
  version: "PASS374.provider_parity_all_assets",
  rule: "Every real-market asset uses the same Shield modal contract: logo, candle chart, source state, risk, Basic / Pro / Advanced, AI Brain and PDF parity. A wide catalog is allowed; fake live confidence is not.",
  marketFamilies: ["US equities", "EU equities", "Asia ADR/proxy", "G10 FX", "EM FX", "ETF/factors", "commodities", "real-estate proxies", "exchange health"],
  unlocks: ["provider timestamp", "cache age", "fallback flag", "second source", "issuer/reference calendar", "locale-resolved report object"],
};

export const pass374BrainPipeline = [
  { id: "identity", label: "Identity lock", seconds: 0.7, copy: "Symbol, class and source route are locked before animation starts." },
  { id: "source", label: "Source mesh", seconds: 1.1, copy: "Provider timestamp, cache age and fallback state are checked." },
  { id: "chart", label: "Candle field", seconds: 1.2, copy: "The same OHLCV shell is used for stock, FX, ETF, commodity and venue health." },
  { id: "security", label: "Security brain", seconds: 1.3, copy: "Wallet/ECC/RNG text stays educational and never asks for secrets." },
  { id: "research", label: "Research lab", seconds: 1.0, copy: "Prime/Riemann content is framed as numerical audit and falsification." },
  { id: "readout", label: "Human readout", seconds: 0.9, copy: "The brain becomes 10/14/20 short customer-readable fields." },
] as const;

const fieldBase = [
  { id: "identity", label: "Identity", value: "symbol locked", copy: "Nazwa, klasa rynku i routing są jednoznaczne przed analizą." },
  { id: "source", label: "Source", value: "timestamp first", copy: "Źródło musi mieć czas odczytu albo jasny tryb fallback." },
  { id: "chart", label: "Chart", value: "same candle shell", copy: "Ten sam wykres działa dla stocków, FX, ETF, surowców i giełd." },
  { id: "risk", label: "Risk", value: "0-100 pressure", copy: "Ryzyko jest presją review, nie komendą kup/sprzedaj." },
  { id: "second", label: "Second source", value: "divergence check", copy: "Silniejszy wniosek czeka na porównanie z drugim źródłem." },
  { id: "liquidity", label: "Liquidity", value: "depth/context", copy: "Dla giełd liczy się orderbook, a dla real markets płynność i luka danych." },
  { id: "issuer", label: "Issuer", value: "filing/reference", copy: "Spółki potrzebują filingów, FX referencji, a surowce metody wyceny." },
  { id: "security", label: "Security", value: "redacted proof", copy: "Raport pokazuje wynik i braki, ale nie zdradza operator logic." },
  { id: "entropy", label: "Entropy", value: "RNG quality", copy: "Losowość opisujemy jako jakość źródła, nie magiczny claim." },
  { id: "next", label: "Next step", value: "one action", copy: "Użytkownik dostaje jeden spokojny kolejny krok." },
  { id: "macro", label: "Macro", value: "market context", copy: "Waluty, stopy, surowce i sektor pomagają tłumaczyć tło ruchu." },
  { id: "news", label: "Event lane", value: "issuer event", copy: "Wiadomości i filing nie mieszają się z samym wykresem." },
  { id: "provenance", label: "Provenance", value: "proof passport", copy: "Premium status odblokowuje się dopiero przy mocniejszych źródłach." },
  { id: "pdf", label: "PDF parity", value: "same object", copy: "Preview i pobrany PDF korzystają z tego samego resolved report." },
  { id: "wallet", label: "Wallet", value: "no secret", copy: "Velmere nie prosi o seed phrase ani prywatny klucz." },
  { id: "ecc", label: "ECC/BTC", value: "public education", copy: "Krzywa eliptyczna jest opisana edukacyjnie, bez instrukcji nadużyć." },
  { id: "prime", label: "Prime lab", value: "numerical audit", copy: "Bajak Protocol idzie jako audyt, benchmark i replikacja." },
  { id: "missing", label: "Missing data", value: "shown early", copy: "Braki danych zmniejszają pewność zamiast tworzyć hype." },
  { id: "locale", label: "Locale", value: "PL/EN/DE", copy: "Język raportu jest rozwiązany przed preview i download." },
  { id: "operator", label: "Operator", value: "hidden rules", copy: "Dokładne heurystyki i progi zostają operator-only." },
] as const;

export function buildPass374BrainFieldDeck(input: { symbol: string; name: string; type: string; risk: number; source: string; mode: Pass374Mode }) {
  const count = input.mode === "advanced" ? 20 : input.mode === "pro" ? 14 : 10;
  const seconds = pass374BrainPipeline.reduce((sum, step) => sum + step.seconds, 0) + (input.mode === "advanced" ? 2.8 : input.mode === "pro" ? 1.4 : 0.4);
  const band = input.risk >= 55 ? "operator-review" : input.risk >= 40 ? "verify-source" : "clean-brief";
  return {
    version: "PASS374.ai_brain_field_deck",
    count,
    seconds: Number(seconds.toFixed(1)),
    band,
    headline: `${input.symbol} dostaje ${count} pól z jednego mózgu: rynek, źródła, security, PDF i Research Lab bez powtarzalnego filler copy.`,
    summary: `${input.name} (${input.type}) używa źródła ${input.source}. Ton zależy od ryzyka ${input.risk}/100, świeżości i braków danych.`,
    fields: fieldBase.slice(0, count),
  };
}

export const pass374SecurityPlainLanguage = [
  { title: "Bank-grade thinking", copy: "Warstwy ochrony są opisane prosto: sesja, podpis, źródło, redakcja i kontrola operatora." },
  { title: "ECC / wallet proof", copy: "Podpis może potwierdzić kontrolę adresu, ale sekret użytkownika nigdy nie trafia do raportu." },
  { title: "Real-world entropy", copy: "Losowość jest jakością źródła i testów entropii; publicznie pokazujemy tylko zasadę, nie surowe sekrety." },
  { title: "Research without overclaim", copy: "Liczby pierwsze i determinizm pokazujemy jako hipotezę, benchmark, falsyfikację i drogę do replikacji." },
];

export const pass374PdfParityPage = {
  title: "PASS374 · Unified output contract",
  sections: ["same report object", "locale resolved", "10/14/20 fields", "security plain language", "prime lab boundary", "provider timestamp", "no fake live"],
  rule: "Preview, modal and PDF must render the same human facts in the selected page language; differences can be layout-only, not content-randomness.",
};

export function buildPass374RealMarketUniverse() {
  return pass374RealMarketExpansion;
}
