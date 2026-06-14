import type { UniversalAssetRow } from "./universal-asset-market-matrix";

export type Pass377Mode = "basic" | "pro" | "advanced";

function marketRow(input: Partial<UniversalAssetRow> & Pick<UniversalAssetRow, "id" | "rank" | "symbol" | "name" | "assetClass" | "riskPressure" | "sparkTone">): UniversalAssetRow {
  const family = input.assetClass === "fx" ? "FX" : input.assetClass === "commodity" ? "commodity" : input.assetClass === "real_estate" ? "real-estate proxy" : input.assetClass === "etf" ? "ETF" : input.assetClass === "exchange_token" ? "venue-linked asset" : "equity";
  return {
    sourceRhythm: input.sourceRhythm ?? `${family} provider heartbeat + timestamp + cache-age + fallback flag`,
    priceLane: input.priceLane ?? `${family} OHLCV candle shell shared with Shield`,
    volumeLane: input.volumeLane ?? `${family} volume, spread, gap and volatility rail`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${family} issuer/reference/methodology lane`,
    secondSourceLane: input.secondSourceLane ?? "primary provider ↔ second provider before strong confidence",
    confidenceFloor: input.confidenceFloor ?? 58,
    adapterState: input.adapterState ?? "provider_required",
    humanCopy: input.humanCopy ?? `${input.symbol} ma tryb provider-ready: logo, świecowy wykres, source state, risk, Basic/Pro/Advanced, AI Brain i PDF parity bez udawania live danych.`,
    nextAdapterStep: input.nextAdapterStep ?? "Attach provider key, server cache, timestamp, fallback flag, OHLCV adapter, issuer/reference lane and second source.",
    ...input,
  };
}

export const pass377UnifiedFidelityContract = {
  version: "PASS377.real_market_fidelity_control",
  publicRule: "Real Markets may show a very wide global universe, but every row must stay provider-ready until timestamp, cache age, fallback flag, chart source and second-source agreement exist.",
  visualRule: "The first user action is always the same: logo row -> Shield-grade candle chart -> Basic/Pro/Advanced -> VLM neural audit -> short readout -> PDF parity.",
  pdfRule: "Browser preview and binary PDF are two renderers of one resolved report object; language is selected once and no second random copy engine may rewrite facts.",
  launchRule: "Security and Research copy must be premium and confident, but it must not promise profit, zero risk, wallet-breaking or an unreviewed theorem proof.",
  providerUnlocks: ["timestamp", "cache age", "fallback flag", "OHLCV source", "second source", "issuer/reference event", "locale-resolved report"],
  tiers: [
    { id: "basic", fields: 10, seconds: 4.8, copy: "quick human scan: identity, chart, source state, risk and one next step" },
    { id: "pro", fields: 14, seconds: 6.2, copy: "adds issuer, macro, liquidity, second source and security boundary" },
    { id: "advanced", fields: 20, seconds: 8.6, copy: "adds provider diagnostics, entropy/ECC education, prime-lab boundary and PDF parity" },
  ],
} as const;

export const pass377MarketExpansion: UniversalAssetRow[] = [
  // US equities / indexes / infrastructure
  marketRow({ id: "pass377-uber", rank: 290, symbol: "UBER", name: "Uber", assetClass: "stock", riskPressure: 43, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + mobility demand lane" }),
  marketRow({ id: "pass377-lyft", rank: 291, symbol: "LYFT", name: "Lyft", assetClass: "stock", riskPressure: 55, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + mobility peer lane" }),
  marketRow({ id: "pass377-shop", rank: 292, symbol: "SHOP", name: "Shopify", assetClass: "stock", riskPressure: 48, sparkTone: "watch", proofOrDisclosureLane: "issuer disclosure + commerce platform lane" }),
  marketRow({ id: "pass377-snow", rank: 293, symbol: "SNOW", name: "Snowflake", assetClass: "stock", riskPressure: 51, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + data cloud lane" }),
  marketRow({ id: "pass377-ddog", rank: 294, symbol: "DDOG", name: "Datadog", assetClass: "stock", riskPressure: 47, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + observability lane" }),
  marketRow({ id: "pass377-crwd", rank: 295, symbol: "CRWD", name: "CrowdStrike", assetClass: "stock", riskPressure: 45, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + cybersecurity peer lane" }),
  marketRow({ id: "pass377-zs", rank: 296, symbol: "ZS", name: "Zscaler", assetClass: "stock", riskPressure: 49, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + zero-trust lane" }),
  marketRow({ id: "pass377-net", rank: 297, symbol: "NET", name: "Cloudflare", assetClass: "stock", riskPressure: 50, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + edge/cloud lane" }),
  marketRow({ id: "pass377-panw", rank: 298, symbol: "PANW", name: "Palo Alto Networks", assetClass: "stock", riskPressure: 39, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + security sector basket" }),
  marketRow({ id: "pass377-now", rank: 299, symbol: "NOW", name: "ServiceNow", assetClass: "stock", riskPressure: 36, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + enterprise software lane" }),
  marketRow({ id: "pass377-axp", rank: 300, symbol: "AXP", name: "American Express", assetClass: "stock", riskPressure: 34, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + payments/credit lane" }),
  marketRow({ id: "pass377-blk", rank: 301, symbol: "BLK", name: "BlackRock", assetClass: "stock", riskPressure: 33, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + asset management lane" }),
  marketRow({ id: "pass377-ms", rank: 302, symbol: "MS", name: "Morgan Stanley", assetClass: "stock", riskPressure: 37, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + investment bank lane" }),
  marketRow({ id: "pass377-wfc", rank: 303, symbol: "WFC", name: "Wells Fargo", assetClass: "stock", riskPressure: 41, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + bank stress lane" }),
  marketRow({ id: "pass377-c", rank: 304, symbol: "C", name: "Citigroup", assetClass: "stock", riskPressure: 42, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + global bank lane" }),
  marketRow({ id: "pass377-ry", rank: 305, symbol: "RY", name: "Royal Bank of Canada", assetClass: "stock", riskPressure: 32, sparkTone: "flat", proofOrDisclosureLane: "issuer disclosure + bank peer lane" }),
  // EU / Asia / luxury and industrials
  marketRow({ id: "pass377-bmw", rank: 306, symbol: "BMW.DE", name: "BMW", assetClass: "stock", riskPressure: 42, sparkTone: "watch", proofOrDisclosureLane: "EU issuer disclosure + auto lane" }),
  marketRow({ id: "pass377-mbg", rank: 307, symbol: "MBG.DE", name: "Mercedes-Benz Group", assetClass: "stock", riskPressure: 41, sparkTone: "watch", proofOrDisclosureLane: "EU issuer disclosure + premium auto lane" }),
  marketRow({ id: "pass377-vow3", rank: 308, symbol: "VOW3.DE", name: "Volkswagen", assetClass: "stock", riskPressure: 49, sparkTone: "watch", proofOrDisclosureLane: "EU issuer disclosure + auto turnaround lane" }),
  marketRow({ id: "pass377-bas", rank: 309, symbol: "BAS.DE", name: "BASF", assetClass: "stock", riskPressure: 46, sparkTone: "watch", proofOrDisclosureLane: "EU issuer disclosure + chemicals/energy lane" }),
  marketRow({ id: "pass377-bay", rank: 310, symbol: "BAYN.DE", name: "Bayer", assetClass: "stock", riskPressure: 58, sparkTone: "watch", proofOrDisclosureLane: "EU issuer disclosure + legal/pharma lane" }),
  marketRow({ id: "pass377-dte", rank: 311, symbol: "DTE.DE", name: "Deutsche Telekom", assetClass: "stock", riskPressure: 27, sparkTone: "flat", proofOrDisclosureLane: "EU issuer disclosure + telecom lane" }),
  marketRow({ id: "pass377-adidas", rank: 312, symbol: "ADS.DE", name: "adidas", assetClass: "stock", riskPressure: 38, sparkTone: "watch", proofOrDisclosureLane: "EU issuer disclosure + sportswear lane" }),
  marketRow({ id: "pass377-zal", rank: 313, symbol: "ZAL.DE", name: "Zalando", assetClass: "stock", riskPressure: 44, sparkTone: "watch", proofOrDisclosureLane: "EU issuer disclosure + e-commerce fashion lane" }),
  marketRow({ id: "pass377-bid", rank: 314, symbol: "BIDU", name: "Baidu", assetClass: "stock", riskPressure: 52, sparkTone: "watch", proofOrDisclosureLane: "issuer disclosure + China AI/search lane" }),
  marketRow({ id: "pass377-ntes", rank: 315, symbol: "NTES", name: "NetEase", assetClass: "stock", riskPressure: 42, sparkTone: "watch", proofOrDisclosureLane: "issuer disclosure + gaming/media lane" }),
  marketRow({ id: "pass377-sony", rank: 316, symbol: "SONY", name: "Sony", assetClass: "stock", riskPressure: 34, sparkTone: "flat", proofOrDisclosureLane: "issuer disclosure + consumer electronics lane" }),
  marketRow({ id: "pass377-tm", rank: 317, symbol: "TM", name: "Toyota", assetClass: "stock", riskPressure: 31, sparkTone: "flat", proofOrDisclosureLane: "issuer disclosure + auto/manufacturing lane" }),
  marketRow({ id: "pass377-hmc", rank: 318, symbol: "HMC", name: "Honda", assetClass: "stock", riskPressure: 33, sparkTone: "flat", proofOrDisclosureLane: "issuer disclosure + auto peer lane" }),
  // FX / macro currencies
  marketRow({ id: "pass377-chfpln", rank: 281, symbol: "CHF/PLN", name: "Swiss Franc / Polish Zloty", assetClass: "fx", riskPressure: 35, sparkTone: "flat" }),
  marketRow({ id: "pass377-eurczk", rank: 282, symbol: "EUR/CZK", name: "Euro / Czech Koruna", assetClass: "fx", riskPressure: 32, sparkTone: "flat" }),
  marketRow({ id: "pass377-usdczk", rank: 283, symbol: "USD/CZK", name: "Dollar / Czech Koruna", assetClass: "fx", riskPressure: 36, sparkTone: "flat" }),
  marketRow({ id: "pass377-usdmxn", rank: 284, symbol: "USD/MXN", name: "Dollar / Mexican Peso", assetClass: "fx", riskPressure: 45, sparkTone: "watch" }),
  marketRow({ id: "pass377-usdbrl", rank: 285, symbol: "USD/BRL", name: "Dollar / Brazilian Real", assetClass: "fx", riskPressure: 52, sparkTone: "watch" }),
  marketRow({ id: "pass377-usdzar", rank: 286, symbol: "USD/ZAR", name: "Dollar / South African Rand", assetClass: "fx", riskPressure: 54, sparkTone: "watch" }),
  marketRow({ id: "pass377-usdsgd", rank: 287, symbol: "USD/SGD", name: "Dollar / Singapore Dollar", assetClass: "fx", riskPressure: 30, sparkTone: "flat" }),
  marketRow({ id: "pass377-cnhjpy", rank: 288, symbol: "CNH/JPY", name: "Offshore Yuan / Yen", assetClass: "fx", riskPressure: 43, sparkTone: "watch" }),
  // ETFs, factors and commodities
  marketRow({ id: "pass377-vug", rank: 392, symbol: "VUG", name: "Growth ETF", assetClass: "etf", riskPressure: 34, sparkTone: "flat", proofOrDisclosureLane: "ETF holdings + growth factor lane" }),
  marketRow({ id: "pass377-vtv", rank: 393, symbol: "VTV", name: "Value ETF", assetClass: "etf", riskPressure: 27, sparkTone: "flat", proofOrDisclosureLane: "ETF holdings + value factor lane" }),
  marketRow({ id: "pass377-mtum", rank: 394, symbol: "MTUM", name: "Momentum ETF", assetClass: "etf", riskPressure: 42, sparkTone: "watch", proofOrDisclosureLane: "ETF holdings + momentum factor lane" }),
  marketRow({ id: "pass377-usmv", rank: 395, symbol: "USMV", name: "Minimum Volatility ETF", assetClass: "etf", riskPressure: 22, sparkTone: "flat", proofOrDisclosureLane: "ETF holdings + low-volatility lane" }),
  marketRow({ id: "pass377-acwi", rank: 396, symbol: "ACWI", name: "Global Equity ETF", assetClass: "etf", riskPressure: 31, sparkTone: "flat", proofOrDisclosureLane: "ETF holdings + global equity lane" }),
  marketRow({ id: "pass377-slv2", rank: 572, symbol: "SILVER", name: "Silver reference proxy", assetClass: "commodity", riskPressure: 47, sparkTone: "watch", proofOrDisclosureLane: "spot/futures/ETF bridge" }),
  marketRow({ id: "pass377-palladium", rank: 573, symbol: "PALLADIUM", name: "Palladium reference proxy", assetClass: "commodity", riskPressure: 53, sparkTone: "watch", proofOrDisclosureLane: "metal futures + auto demand lane" }),
  marketRow({ id: "pass377-lithium", rank: 574, symbol: "LITHIUM", name: "Lithium basket proxy", assetClass: "commodity", riskPressure: 58, sparkTone: "watch", proofOrDisclosureLane: "battery-metal source basket" }),
  marketRow({ id: "pass377-carbon", rank: 575, symbol: "CARBON", name: "Carbon credits proxy", assetClass: "commodity", riskPressure: 50, sparkTone: "watch", proofOrDisclosureLane: "policy/venue methodology lane" }),
  marketRow({ id: "pass377-office-reit", rank: 470, symbol: "OFFICE/REIT", name: "Office real estate proxy", assetClass: "real_estate", riskPressure: 56, sparkTone: "watch", adapterState: "slow_macro", proofOrDisclosureLane: "office REIT basket + credit calendar" }),
  marketRow({ id: "pass377-industrial-reit", rank: 471, symbol: "INDUSTRIAL/REIT", name: "Industrial real estate proxy", assetClass: "real_estate", riskPressure: 34, sparkTone: "flat", adapterState: "slow_macro", proofOrDisclosureLane: "industrial REIT basket + logistics lane" }),
];

export const pass377AssetVisualPatch = {
  UBER: { label: "Uber", glyph: "UB", primary: "#111827", secondary: "#f7f7f7" },
  LYFT: { label: "Lyft", glyph: "LY", primary: "#ff00bf", secondary: "#2a061f" },
  SHOP: { label: "Shopify", glyph: "SH", primary: "#95bf47", secondary: "#10230a" },
  SNOW: { label: "Snowflake", glyph: "SN", primary: "#29b5e8", secondary: "#062433" },
  DDOG: { label: "Datadog", glyph: "DD", primary: "#632ca6", secondary: "#150721" },
  CRWD: { label: "CrowdStrike", glyph: "CS", primary: "#e01f2d", secondary: "#260405" },
  ZS: { label: "Zscaler", glyph: "ZS", primary: "#0078d4", secondary: "#061b2e" },
  NET: { label: "Cloudflare", glyph: "CF", primary: "#f48120", secondary: "#261006" },
  PANW: { label: "Palo Alto", glyph: "PA", primary: "#fa582d", secondary: "#240b04" },
  NOW: { label: "ServiceNow", glyph: "NW", primary: "#81b5a1", secondary: "#0e2119" },
  AXP: { label: "AmEx", glyph: "AX", primary: "#006fcf", secondary: "#061a34" },
  BLK: { label: "BlackRock", glyph: "BR", primary: "#111827", secondary: "#d8b36a" },
  MS: { label: "Morgan Stanley", glyph: "MS", primary: "#0056a3", secondary: "#061c34" },
  WFC: { label: "Wells Fargo", glyph: "WF", primary: "#d71920", secondary: "#f4c542", text: "#111" },
  C: { label: "Citigroup", glyph: "CI", primary: "#004b93", secondary: "#e30613" },
  RY: { label: "RBC", glyph: "RY", primary: "#005daa", secondary: "#ffd200", text: "#111" },
  "BMW.DE": { label: "BMW", glyph: "BM", primary: "#0066b1", secondary: "#f5f5f5", text: "#111" },
  "MBG.DE": { label: "Mercedes", glyph: "MB", primary: "#111827", secondary: "#c0c0c0" },
  "VOW3.DE": { label: "Volkswagen", glyph: "VW", primary: "#001e50", secondary: "#e5eef7" },
  "BAS.DE": { label: "BASF", glyph: "BA", primary: "#004a99", secondary: "#061f3d" },
  "BAYN.DE": { label: "Bayer", glyph: "BY", primary: "#10384f", secondary: "#79c000" },
  "DTE.DE": { label: "Deutsche Telekom", glyph: "DT", primary: "#e20074", secondary: "#250014" },
  "ADS.DE": { label: "adidas", glyph: "AD", primary: "#f7f7f7", secondary: "#111827", text: "#111" },
  "ZAL.DE": { label: "Zalando", glyph: "ZA", primary: "#ff6900", secondary: "#2b1003" },
  BIDU: { label: "Baidu", glyph: "BD", primary: "#2932e1", secondary: "#e10600" },
  NTES: { label: "NetEase", glyph: "NE", primary: "#d71920", secondary: "#230406" },
  SONY: { label: "Sony", glyph: "SO", primary: "#111827", secondary: "#b6c7ff" },
  TM: { label: "Toyota", glyph: "TY", primary: "#eb0a1e", secondary: "#270305" },
  HMC: { label: "Honda", glyph: "HO", primary: "#cc0000", secondary: "#250303" },
  "CHF/PLN": { label: "CHF PLN", glyph: "₣Z", primary: "#d4213d", secondary: "#f5f5f5", text: "#111" },
  "EUR/CZK": { label: "EUR CZK", glyph: "€K", primary: "#225eea", secondary: "#d7141a" },
  "USD/CZK": { label: "USD CZK", glyph: "$K", primary: "#0f8d61", secondary: "#11457e" },
  "USD/MXN": { label: "USD MXN", glyph: "$M", primary: "#0f8d61", secondary: "#006847" },
  "USD/BRL": { label: "USD BRL", glyph: "$R", primary: "#0f8d61", secondary: "#ffdf00", text: "#111" },
  "USD/ZAR": { label: "USD ZAR", glyph: "$Z", primary: "#0f8d61", secondary: "#007a4d" },
  VUG: { label: "Growth ETF", glyph: "VG", primary: "#315bdc", secondary: "#07183a" },
  VTV: { label: "Value ETF", glyph: "VT", primary: "#506b84", secondary: "#091a28" },
  MTUM: { label: "Momentum", glyph: "MT", primary: "#6b21a8", secondary: "#19072a" },
  USMV: { label: "MinVol", glyph: "MV", primary: "#2f6f73", secondary: "#061f20" },
  ACWI: { label: "Global ETF", glyph: "AC", primary: "#315bdc", secondary: "#0b1438" },
  SILVER: { label: "Silver", glyph: "Ag", primary: "#d6d8db", secondary: "#3a3f45", text: "#111" },
  PALLADIUM: { label: "Palladium", glyph: "Pd", primary: "#c4cad0", secondary: "#30343b", text: "#111" },
  LITHIUM: { label: "Lithium", glyph: "Li", primary: "#d8b36a", secondary: "#2b180a" },
  CARBON: { label: "Carbon", glyph: "CO₂", primary: "#1f7a4c", secondary: "#061f12" },
  "OFFICE/REIT": { label: "Office REIT", glyph: "OF", primary: "#9b7d52", secondary: "#221507" },
  "INDUSTRIAL/REIT": { label: "Industrial REIT", glyph: "IR", primary: "#b99d72", secondary: "#24170d" },
} as const;

export const pass377PseudoPricePatch: Record<string, string> = {
  UBER: "$88.40", LYFT: "$18.30", SHOP: "$154.20", SNOW: "$249.60", DDOG: "$132.80", CRWD: "$518.30", ZS: "$304.40", NET: "$219.80", PANW: "$211.40", NOW: "$1,025", AXP: "$390.20", BLK: "$1,138", MS: "$173.30", WFC: "$83.70", C: "$100.20", RY: "C$178.10",
  "BMW.DE": "€89.10", "MBG.DE": "€52.40", "VOW3.DE": "€101.20", "BAS.DE": "€42.20", "BAYN.DE": "€25.40", "DTE.DE": "€31.20", "ADS.DE": "€205.40", "ZAL.DE": "€27.60", BIDU: "$123.40", NTES: "$134.20", SONY: "$28.30", TM: "$195.60", HMC: "$33.20",
  "CHF/PLN": "4.82", "EUR/CZK": "24.32", "USD/CZK": "20.91", "USD/MXN": "18.05", "USD/BRL": "5.42", "USD/ZAR": "17.38", "USD/SGD": "1.284", "CNH/JPY": "22.28",
  VUG: "$465.50", VTV: "$185.60", MTUM: "$248.70", USMV: "$97.40", ACWI: "$139.80", SILVER: "$57.60", PALLADIUM: "$1,560", LITHIUM: "basket", CARBON: "index", "OFFICE/REIT": "basket", "INDUSTRIAL/REIT": "basket",
};

export const pass377NeuralAuditPhases = [
  { id: "intake", label: "Intake lock", seconds: 0.7, copy: "Symbol, język, rynek i tryb Basic/Pro/Advanced są zamykane przed skanem." },
  { id: "providers", label: "Provider mesh", seconds: 1.0, copy: "AI sprawdza timestamp, cache age, fallback flag i drugie źródło." },
  { id: "chart", label: "Candle synthesis", seconds: 1.1, copy: "Wykres świecowy, wolumen i timeframe używają tego samego shellu co Shield." },
  { id: "security", label: "Security bridge", seconds: 1.2, copy: "Klucze prywatne, podpis, entropia i redakcja są tłumaczone prostym językiem." },
  { id: "research", label: "Prime research lane", seconds: 1.3, copy: "Bajak Protocol trafia do sekcji audytu: benchmark, falsyfikacja, replikacja." },
  { id: "collapse", label: "Brain field collapse", seconds: 1.5, copy: "Moneta VLM zamienia się w 10/14/20 krótkich pól bez debugowego chaosu." },
  { id: "seal", label: "PDF parity seal", seconds: 0.9, copy: "Preview, modal i pobrany PDF zachowują te same fakty i język strony." },
] as const;

const pass377ReadoutFields = [
  { id: "identity", label: "Identity", value: "locked", copy: "Ticker, nazwa i rynek są jednoznaczne przed generacją raportu." },
  { id: "visual", label: "Visual", value: "logo-ready", copy: "Każdy instrument ma ikonę, brand glyph albo kontrolowany fallback." },
  { id: "chart", label: "Chart", value: "Shield shell", copy: "Świece, timeframe i wolumen mają być takie same jak w crypto Shield." },
  { id: "provider", label: "Provider", value: "timestamp first", copy: "Bez timestampu i cache age nie pokazujemy pewności live." },
  { id: "second", label: "Second source", value: "required", copy: "Mocne wnioski czekają na porównanie z drugim źródłem." },
  { id: "issuer", label: "Issuer", value: "event lane", copy: "Stocki wymagają filingów i wydarzeń spółki, nie samego wykresu." },
  { id: "fx", label: "FX boundary", value: "reference", copy: "Waluty mają kurs referencyjny i intraday provider; to nie jest cena transakcyjna." },
  { id: "commodity", label: "Commodity", value: "methodology", copy: "Surowce potrzebują opisu metodologii spot/futures/ETF." },
  { id: "venue", label: "Venue health", value: "separate", copy: "Binance/MEXC/OKX są health layer, nie mieszają się z akcjami." },
  { id: "risk", label: "Risk", value: "review pressure", copy: "Risk pokazuje presję review, nie polecenie kup/sprzedaj." },
  { id: "security", label: "Security", value: "redacted", copy: "Użytkownik widzi wynik, a reguły operatorowe zostają ukryte." },
  { id: "entropy", label: "Entropy", value: "quality", copy: "RNG opisujemy jako jakość źródła i walidacji, bez tworzenia sekretów." },
  { id: "ecc", label: "ECC/BTC", value: "education", copy: "Wyjaśniamy podpisy i adresy, nie uczymy ataku na cudze portfele." },
  { id: "prime", label: "Prime Lab", value: "audit", copy: "π(x) − R(x) i Bajak Protocol są audytem numerycznym i replikacją." },
  { id: "determinism", label: "Determinism", value: "hypothesis", copy: "Animacja pokazuje hipotezę: szum → rezonans → korekta → wynik." },
  { id: "locale", label: "Locale", value: "PL/EN/DE", copy: "Język strony wybiera copy preview i PDF przed renderem." },
  { id: "pdf", label: "PDF", value: "same object", copy: "Download nie ma osobnego randomowego generatora faktów." },
  { id: "next", label: "Next", value: "one action", copy: "AI kończy jednym krokiem, nie ścianą tekstu." },
  { id: "operator", label: "Operator", value: "hidden", copy: "Raw heurystyki, API tokeny i progi zostają poza publicznym UI." },
  { id: "launch", label: "Launch", value: "clean", copy: "Teksty są premium i bezpieczne, ale nie zabijają chęci wejścia w VLM." },
] as const;

export function buildPass377NeuralAuditReadout(input: { symbol: string; name: string; type: string; risk: number; source: string; mode: Pass377Mode }) {
  const count = input.mode === "advanced" ? 20 : input.mode === "pro" ? 14 : 10;
  const seconds = pass377NeuralAuditPhases.reduce((sum, phase) => sum + phase.seconds, 0) + (input.mode === "advanced" ? 2.4 : input.mode === "pro" ? 1.0 : 0.2);
  const band = input.risk >= 58 ? "operator-review" : input.risk >= 42 ? "source-watch" : "clean-readout";
  return {
    version: "PASS377.neural_audit_readout",
    count,
    seconds: Number(seconds.toFixed(1)),
    band,
    headline: `${input.symbol} przechodzi przez jeden VLM Neural Audit: wykres, provider, security, research i PDF parity.`,
    body: `${input.name} (${input.type}) używa źródła ${input.source}. AI pokazuje ${count} krótkich pól, a nie losową ścianę tekstu.`,
    fields: pass377ReadoutFields.slice(0, count),
  };
}

export const pass377PdfParityControl = {
  title: "PASS377 · Neural audit PDF parity control",
  rule: "The PDF is a print renderer of the same resolved report object used by Browser preview and Real Markets modal; locale, fields, missing evidence and next step are locked before render.",
  sections: ["identity", "logo", "Shield chart", "provider proof", "second source", "security", "entropy", "ECC/BTC", "prime lab", "PDF parity"],
} as const;

export const pass377SecurityPlainLaunch = [
  "Security page should say: private key stays private, signature proves control, entropy quality matters, reports are redacted and provider freshness controls confidence.",
  "Research Lab should say: primes and elliptic curves explain why modern cryptography works, while Bajak Protocol remains a numerical audit path until independent replication.",
  "Public copy may be premium and confident, but it must not claim profit, zero risk, wallet breaking or a formal RH proof without review.",
] as const;

export function buildPass377MarketCoverageUniverse() {
  return pass377MarketExpansion;
}
