import type { UniversalAssetRow } from "./universal-asset-market-matrix";

export type Pass375Mode = "basic" | "pro" | "advanced";

function marketRow(input: Partial<UniversalAssetRow> & Pick<UniversalAssetRow, "id" | "rank" | "symbol" | "name" | "assetClass" | "riskPressure" | "sparkTone">): UniversalAssetRow {
  const family = input.assetClass === "fx" ? "FX" : input.assetClass === "commodity" ? "commodity" : input.assetClass === "real_estate" ? "real-estate proxy" : input.assetClass === "etf" ? "ETF" : "equity";
  return {
    sourceRhythm: input.sourceRhythm ?? `${family} provider heartbeat + timestamp + cache-age rail`,
    priceLane: input.priceLane ?? `${family} OHLCV candle lane rendered in the same Shield modal`,
    volumeLane: input.volumeLane ?? `${family} volume, gap, spread and volatility lane`,
    proofOrDisclosureLane: input.proofOrDisclosureLane ?? `${family} disclosure/reference calendar lane`,
    secondSourceLane: input.secondSourceLane ?? "primary provider ↔ second provider before strong confidence",
    confidenceFloor: input.confidenceFloor ?? 55,
    adapterState: input.adapterState ?? "provider_required",
    humanCopy: input.humanCopy ?? `${input.symbol} ma ten sam kontrakt UX co crypto Shield: logo, świece, provider state, risk, Basic / Pro / Advanced i AI Brain bez fake-live.` ,
    nextAdapterStep: input.nextAdapterStep ?? "Wire provider key, timestamp, cache age, fallback flag, OHLCV adapter, second-source comparison and disclosure calendar.",
    ...input,
  };
}

export const pass375ProviderConnectorMap = {
  version: "PASS375.provider_connector_matrix",
  publicRule: "Real Markets can list a broad global universe, but live confidence opens only when provider timestamp, cache age, fallback flag and second-source check exist.",
  lanes: [
    { id: "equities", provider: "equity OHLCV + issuer disclosure", ui: "stock row + Shield candle modal + SEC/issuer event lane", boundary: "no fake current price without timestamp" },
    { id: "fx", provider: "ECB/reference + intraday FX provider", ui: "FX row + volatility band + reference-time badge", boundary: "reference rate is context, not transaction price" },
    { id: "commodities", provider: "spot/futures/ETF bridge", ui: "commodity row + XAU/XAG/OIL chart + methodology badge", boundary: "different venues can quote different references" },
    { id: "real_estate", provider: "REIT ETF + macro release calendar", ui: "real-estate proxy row + slow macro badge", boundary: "slow context, not second-by-second alarm" },
    { id: "exchange_health", provider: "Binance/MEXC/Coinbase/Kraken/OKX/Bybit adapters", ui: "venue health card + reserves/API/social lanes", boundary: "not a solvency certificate" },
  ],
  apiTargets: ["/api/market-integrity/real-markets/catalog", "/api/search/lens-report", "/api/market-integrity/report"],
} as const;

export const pass375RealMarketCoveragePatch: UniversalAssetRow[] = [
  marketRow({ id: "pass375-ms", rank: 209, symbol: "MS", name: "Morgan Stanley", assetClass: "stock", riskPressure: 36, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + bank stress basket" }),
  marketRow({ id: "pass375-c", rank: 210, symbol: "C", name: "Citigroup", assetClass: "stock", riskPressure: 40, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + bank credit basket" }),
  marketRow({ id: "pass375-wfc", rank: 211, symbol: "WFC", name: "Wells Fargo", assetClass: "stock", riskPressure: 39, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + bank disclosure lane" }),
  marketRow({ id: "pass375-blk", rank: 212, symbol: "BLK", name: "BlackRock", assetClass: "stock", riskPressure: 34, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + asset manager flow basket" }),
  marketRow({ id: "pass375-bx", rank: 213, symbol: "BX", name: "Blackstone", assetClass: "stock", riskPressure: 43, sparkTone: "watch", proofOrDisclosureLane: "SEC filing + private markets / real estate proxy" }),
  marketRow({ id: "pass375-spgi", rank: 214, symbol: "SPGI", name: "S&P Global", assetClass: "stock", riskPressure: 30, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + market data peer lane" }),
  marketRow({ id: "pass375-mco", rank: 215, symbol: "MCO", name: "Moody's", assetClass: "stock", riskPressure: 31, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + ratings/credit lane" }),
  marketRow({ id: "pass375-ice", rank: 216, symbol: "ICE", name: "Intercontinental Exchange", assetClass: "stock", riskPressure: 32, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + exchange operator lane" }),
  marketRow({ id: "pass375-cme", rank: 217, symbol: "CME", name: "CME Group", assetClass: "stock", riskPressure: 33, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + futures exchange lane" }),
  marketRow({ id: "pass375-nDAQ", rank: 218, symbol: "NDAQ", name: "Nasdaq", assetClass: "stock", riskPressure: 34, sparkTone: "flat", proofOrDisclosureLane: "SEC filing + exchange technology lane" }),
  marketRow({ id: "pass375-lseg", rank: 219, symbol: "LSEG.L", name: "London Stock Exchange Group", assetClass: "stock", riskPressure: 34, sparkTone: "flat", proofOrDisclosureLane: "issuer disclosure + market data/exchange lane" }),
  marketRow({ id: "pass375-dbk", rank: 220, symbol: "DBK.DE", name: "Deutsche Bank", assetClass: "stock", riskPressure: 45, sparkTone: "watch", proofOrDisclosureLane: "EU issuer disclosure + bank stress basket" }),
  marketRow({ id: "pass375-bnp", rank: 221, symbol: "BNP.PA", name: "BNP Paribas", assetClass: "stock", riskPressure: 38, sparkTone: "flat", proofOrDisclosureLane: "EU issuer disclosure + bank peer lane" }),
  marketRow({ id: "pass375-ubs", rank: 222, symbol: "UBSG.SW", name: "UBS", assetClass: "stock", riskPressure: 39, sparkTone: "flat", proofOrDisclosureLane: "issuer disclosure + Swiss bank peer lane" }),
  marketRow({ id: "pass375-barclays", rank: 223, symbol: "BARC.L", name: "Barclays", assetClass: "stock", riskPressure: 41, sparkTone: "watch", proofOrDisclosureLane: "issuer disclosure + UK bank stress lane" }),
  marketRow({ id: "pass375-gbppln", rank: 253, symbol: "GBP/PLN", name: "British Pound / Zloty", assetClass: "fx", riskPressure: 39, sparkTone: "flat", adapterState: "provider_required" }),
  marketRow({ id: "pass375-chfpln", rank: 254, symbol: "CHF/PLN", name: "Swiss Franc / Zloty", assetClass: "fx", riskPressure: 36, sparkTone: "flat", adapterState: "provider_required" }),
  marketRow({ id: "pass375-eurczk", rank: 255, symbol: "EUR/CZK", name: "Euro / Czech Koruna", assetClass: "fx", riskPressure: 34, sparkTone: "flat", adapterState: "provider_required" }),
  marketRow({ id: "pass375-usdmxn", rank: 256, symbol: "USD/MXN", name: "Dollar / Mexican Peso", assetClass: "fx", riskPressure: 44, sparkTone: "watch", adapterState: "provider_required" }),
  marketRow({ id: "pass375-usdbrl", rank: 257, symbol: "USD/BRL", name: "Dollar / Brazilian Real", assetClass: "fx", riskPressure: 50, sparkTone: "watch", adapterState: "provider_required" }),
  marketRow({ id: "pass375-usdzar", rank: 258, symbol: "USD/ZAR", name: "Dollar / South African Rand", assetClass: "fx", riskPressure: 52, sparkTone: "watch", adapterState: "provider_required" }),
  marketRow({ id: "pass375-usdinr", rank: 259, symbol: "USD/INR", name: "Dollar / Indian Rupee", assetClass: "fx", riskPressure: 38, sparkTone: "flat", adapterState: "provider_required" }),
  marketRow({ id: "pass375-usdcny", rank: 260, symbol: "USD/CNY", name: "Dollar / Chinese Yuan", assetClass: "fx", riskPressure: 43, sparkTone: "watch", adapterState: "provider_required" }),
  marketRow({ id: "pass375-usdsgd", rank: 261, symbol: "USD/SGD", name: "Dollar / Singapore Dollar", assetClass: "fx", riskPressure: 33, sparkTone: "flat", adapterState: "provider_required" }),
  marketRow({ id: "pass375-eurtry", rank: 262, symbol: "EUR/TRY", name: "Euro / Turkish Lira", assetClass: "fx", riskPressure: 61, sparkTone: "watch", adapterState: "provider_required" }),
  marketRow({ id: "pass375-uso", rank: 370, symbol: "USO", name: "US Oil Fund", assetClass: "etf", riskPressure: 48, sparkTone: "watch", proofOrDisclosureLane: "ETF methodology + energy futures bridge" }),
  marketRow({ id: "pass375-ung", rank: 371, symbol: "UNG", name: "Natural Gas Fund", assetClass: "etf", riskPressure: 58, sparkTone: "watch", proofOrDisclosureLane: "ETF methodology + gas futures bridge" }),
  marketRow({ id: "pass375-dbc", rank: 372, symbol: "DBC", name: "Commodity Basket ETF", assetClass: "etf", riskPressure: 43, sparkTone: "watch", proofOrDisclosureLane: "ETF methodology + commodity basket" }),
  marketRow({ id: "pass375-gdx", rank: 373, symbol: "GDX", name: "Gold Miners ETF", assetClass: "etf", riskPressure: 49, sparkTone: "watch", proofOrDisclosureLane: "ETF holdings + gold equity proxy" }),
  marketRow({ id: "pass375-ura", rank: 374, symbol: "URA", name: "Uranium ETF", assetClass: "etf", riskPressure: 54, sparkTone: "watch", proofOrDisclosureLane: "ETF holdings + uranium basket" }),
  marketRow({ id: "pass375-xbi", rank: 375, symbol: "XBI", name: "Biotech ETF", assetClass: "etf", riskPressure: 53, sparkTone: "watch", proofOrDisclosureLane: "ETF holdings + biotech sector basket" }),
  marketRow({ id: "pass375-smh", rank: 376, symbol: "SMH", name: "Semiconductor ETF", assetClass: "etf", riskPressure: 46, sparkTone: "watch", proofOrDisclosureLane: "ETF holdings + semiconductor basket" }),
  marketRow({ id: "pass375-iyr", rank: 460, symbol: "IYR", name: "US Real Estate ETF", assetClass: "real_estate", riskPressure: 45, sparkTone: "watch", adapterState: "slow_macro", proofOrDisclosureLane: "REIT ETF + housing macro release calendar" }),
  marketRow({ id: "pass375-xlre", rank: 461, symbol: "XLRE", name: "Real Estate Select Sector ETF", assetClass: "real_estate", riskPressure: 42, sparkTone: "watch", adapterState: "slow_macro", proofOrDisclosureLane: "REIT ETF + rate sensitivity lane" }),
  marketRow({ id: "pass375-rem", rank: 462, symbol: "REM", name: "Mortgage REIT ETF", assetClass: "real_estate", riskPressure: 55, sparkTone: "watch", adapterState: "slow_macro", proofOrDisclosureLane: "mortgage REIT + credit spread proxy" }),
  marketRow({ id: "pass375-vnqi", rank: 463, symbol: "VNQI", name: "Global ex-US Real Estate ETF", assetClass: "real_estate", riskPressure: 46, sparkTone: "watch", adapterState: "slow_macro", proofOrDisclosureLane: "global REIT proxy + FX context" }),
  marketRow({ id: "pass375-copper", rank: 560, symbol: "HG=F", name: "Copper futures proxy", assetClass: "commodity", riskPressure: 46, sparkTone: "watch", proofOrDisclosureLane: "futures reference + industrial demand proxy" }),
  marketRow({ id: "pass375-natgas", rank: 561, symbol: "NG=F", name: "Natural gas futures proxy", assetClass: "commodity", riskPressure: 57, sparkTone: "watch", proofOrDisclosureLane: "futures reference + storage/weather proxy" }),
  marketRow({ id: "pass375-soy", rank: 562, symbol: "ZS=F", name: "Soybean futures proxy", assetClass: "commodity", riskPressure: 42, sparkTone: "flat", proofOrDisclosureLane: "futures reference + agriculture calendar" }),
  marketRow({ id: "pass375-wheat", rank: 563, symbol: "ZW=F", name: "Wheat futures proxy", assetClass: "commodity", riskPressure: 47, sparkTone: "watch", proofOrDisclosureLane: "futures reference + agriculture calendar" }),
  marketRow({ id: "pass375-coffee", rank: 564, symbol: "KC=F", name: "Coffee futures proxy", assetClass: "commodity", riskPressure: 49, sparkTone: "watch", proofOrDisclosureLane: "futures reference + soft commodity calendar" }),
] as const;

export const pass375BrainScenePhases = [
  { id: "intake", label: "Intake", seconds: 0.8, copy: "Symbol, rynek i język strony są rozwiązywane przed animacją." },
  { id: "provider", label: "Provider lock", seconds: 1.1, copy: "AI Brain sprawdza timestamp, cache age, fallback i drugi provider." },
  { id: "chart", label: "Shield chart", seconds: 1.0, copy: "Świece, wolumen i timeframe są wspólne dla crypto, FX, stocków i ETF." },
  { id: "neural", label: "Neural flow", seconds: 1.4, copy: "Niebieskie ścieżki zbierają źródła, liquidity, issuer/macro i security boundary." },
  { id: "collapse", label: "Readout field", seconds: 1.3, copy: "Mózg zamienia się w 10/14/20 krótkich wyników zamiast debugowych kafelków." },
  { id: "parity", label: "PDF parity", seconds: 0.9, copy: "Preview i pobrany PDF używają tego samego resolved report object." },
] as const;

export const pass375PdfExactPreviewContract = {
  version: "PASS375.pdf_preview_download_same_object",
  rule: "Browser modal, HTML A4 preview and binary PDF must render the same resolved report fields; only layout may differ.",
  localeRule: "PL/EN/DE is selected before content is generated, not after rendering.",
  pages: ["core", "market", "second source", "source ledger", "asset profile", "AI brain", "cryptography", "unified output", "provider connectors"],
} as const;

export const pass375SecurityLaunchPlainText = [
  "Velmère pokazuje publicznie tylko zasadę ochrony: sesja, podpis, źródła, redakcja i review.",
  "Klucz prywatny oraz seed phrase pozostają poza systemem i poza raportem.",
  "Real RNG opisujemy jako jakość źródeł entropii i walidacji, bez publikowania instrukcji tworzenia sekretów.",
  "AI Brain może tłumaczyć kryptografię, bankowe warstwy ochrony, ECC i liczby pierwsze, ale nie zdradza progów operatorowych.",
] as const;

export function buildPass375MarketCoverageUniverse() {
  return pass375RealMarketCoveragePatch;
}

export function buildPass375AiBrainScenario(input: { symbol: string; name: string; type: string; risk: number; source: string; mode: Pass375Mode }) {
  const fieldCount = input.mode === "advanced" ? 20 : input.mode === "pro" ? 14 : 10;
  const seconds = pass375BrainScenePhases.reduce((sum, phase) => sum + phase.seconds, 0) + (input.mode === "advanced" ? 3.2 : input.mode === "pro" ? 1.7 : 0.6);
  const band = input.risk >= 58 ? "hard-review" : input.risk >= 42 ? "source-watch" : "clean-terminal";
  return {
    version: "PASS375.unified_provider_ai_brain_scene",
    fieldCount,
    seconds: Number(seconds.toFixed(1)),
    band,
    headline: `${input.symbol} przechodzi przez jeden terminal: provider, chart, brain, security i PDF w tym samym języku.`,
    body: `${input.name} (${input.type}) używa źródła ${input.source}. Publiczny opis zależy od ryzyka ${input.risk}/100, ale nie udaje danych live bez providera.`,
    outputs: ["Identity", "Price lane", "OHLCV", "Volume", "Risk", "Provider", "Second source", "Issuer / macro", "Security", "Entropy", "ECC / wallet", "Prime Lab", "Missing data", "Next step", "PDF parity", "Operator boundary", "Language", "Timestamp", "Fallback", "Receipt"].slice(0, fieldCount),
  };
}
