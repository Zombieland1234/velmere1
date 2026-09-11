import {
  validateCanonicalInstrumentIdentity,
  type CanonicalInstrumentIdentity,
} from "./canonical-instrument";

export interface RealMarketInstrumentMasterRecord {
  displayName: string;
  legacySymbols: string[];
  legacyIdentifiers: string[];
  identity: CanonicalInstrumentIdentity;
}

function record(
  displayName: string,
  legacySymbols: string[],
  legacyIdentifiers: string[],
  identity: CanonicalInstrumentIdentity,
): RealMarketInstrumentMasterRecord {
  const validation = validateCanonicalInstrumentIdentity(identity);
  if (!validation.valid) {
    throw new Error(`invalid_real_market_master:${identity.instrumentId}:${validation.errors.join("|")}`);
  }
  return { displayName, legacySymbols, legacyIdentifiers, identity };
}

const commonUsEquity = {
  instrumentType: "equity" as const,
  settlementType: "cash" as const,
  priceType: "last" as const,
  timezone: "America/New_York",
  marketCalendar: "US_EQUITIES",
  jurisdiction: ["US_SEC", "US_FINRA"],
  dataProvider: "UNVERIFIED_REPORT_INPUT",
  asOf: null,
  freshnessSeconds: null,
  contractMonth: null,
  expiry: null,
  rollMethodology: null,
  baseCurrency: null,
  quoteCurrency: "USD",
};

const commonUsEtf = {
  instrumentType: "etf" as const,
  settlementType: "cash" as const,
  priceType: "last" as const,
  timezone: "America/New_York",
  marketCalendar: "US_EQUITIES",
  jurisdiction: ["US_SEC", "US_FINRA"],
  dataProvider: "UNVERIFIED_REPORT_INPUT",
  asOf: null,
  freshnessSeconds: null,
  contractMonth: null,
  expiry: null,
  rollMethodology: null,
  baseCurrency: null,
  quoteCurrency: "USD",
};

const futuresCommon = {
  instrumentType: "future" as const,
  priceType: "settlement" as const,
  timezone: "America/Chicago",
  marketCalendar: "CME_GLOBEX",
  jurisdiction: ["US_CFTC", "CME_RULEBOOK"],
  dataProvider: "UNVERIFIED_REPORT_INPUT",
  asOf: null,
  freshnessSeconds: null,
  contractMonth: null,
  expiry: null,
  rollMethodology: "front-month continuous contract; exact delivery month must be resolved at observation time",
};

export const REAL_MARKET_INSTRUMENT_MASTER: RealMarketInstrumentMasterRecord[] = [
  record("Apple Inc. Common Stock", ["AAPL"], ["nasdaq:aapl"], {
    ...commonUsEquity, instrumentId: "equity-us-aapl", assetClass: "equity", economicExposure: "Apple Inc. common equity", underlying: "Apple Inc.", canonicalSymbol: "AAPL", providerSymbol: "AAPL", venue: "NASDAQ Stock Market", mic: "XNAS",
  }),
  record("Microsoft Corporation Common Stock", ["MSFT"], ["nasdaq:msft"], {
    ...commonUsEquity, instrumentId: "equity-us-msft", assetClass: "equity", economicExposure: "Microsoft Corporation common equity", underlying: "Microsoft Corporation", canonicalSymbol: "MSFT", providerSymbol: "MSFT", venue: "NASDAQ Stock Market", mic: "XNAS",
  }),
  record("NVIDIA Corporation Common Stock", ["NVDA"], ["nasdaq:nvda"], {
    ...commonUsEquity, instrumentId: "equity-us-nvda", assetClass: "equity", economicExposure: "NVIDIA Corporation common equity", underlying: "NVIDIA Corporation", canonicalSymbol: "NVDA", providerSymbol: "NVDA", venue: "NASDAQ Stock Market", mic: "XNAS",
  }),
  record("Amazon.com, Inc. Common Stock", ["AMZN"], ["nasdaq:amzn"], {
    ...commonUsEquity, instrumentId: "equity-us-amzn", assetClass: "equity", economicExposure: "Amazon.com, Inc. common equity", underlying: "Amazon.com, Inc.", canonicalSymbol: "AMZN", providerSymbol: "AMZN", venue: "NASDAQ Stock Market", mic: "XNAS",
  }),
  record("Alphabet Inc. Class A Common Stock", ["GOOGL"], ["nasdaq:googl"], {
    ...commonUsEquity, instrumentId: "equity-us-googl", assetClass: "equity", economicExposure: "Alphabet Inc. Class A common equity", underlying: "Alphabet Inc.", canonicalSymbol: "GOOGL", providerSymbol: "GOOGL", venue: "NASDAQ Stock Market", mic: "XNAS",
  }),
  record("Meta Platforms, Inc. Class A Common Stock", ["META"], ["nasdaq:meta"], {
    ...commonUsEquity, instrumentId: "equity-us-meta", assetClass: "equity", economicExposure: "Meta Platforms, Inc. Class A common equity", underlying: "Meta Platforms, Inc.", canonicalSymbol: "META", providerSymbol: "META", venue: "NASDAQ Stock Market", mic: "XNAS",
  }),
  record("Tesla, Inc. Common Stock", ["TSLA"], ["nasdaq:tsla"], {
    ...commonUsEquity, instrumentId: "equity-us-tsla", assetClass: "equity", economicExposure: "Tesla, Inc. common equity", underlying: "Tesla, Inc.", canonicalSymbol: "TSLA", providerSymbol: "TSLA", venue: "NASDAQ Stock Market", mic: "XNAS",
  }),
  record("Berkshire Hathaway Inc. Class B Common Stock", ["BRK.B", "BRK-B"], ["nyse:brk-b"], {
    ...commonUsEquity, instrumentId: "equity-us-brk-b", assetClass: "equity", economicExposure: "Berkshire Hathaway Inc. Class B common equity", underlying: "Berkshire Hathaway Inc.", canonicalSymbol: "BRK.B", providerSymbol: "BRK.B", venue: "New York Stock Exchange", mic: "XNYS",
  }),
  record("JPMorgan Chase & Co. Common Stock", ["JPM"], ["nyse:jpm"], {
    ...commonUsEquity, instrumentId: "equity-us-jpm", assetClass: "equity", economicExposure: "JPMorgan Chase & Co. common equity", underlying: "JPMorgan Chase & Co.", canonicalSymbol: "JPM", providerSymbol: "JPM", venue: "New York Stock Exchange", mic: "XNYS",
  }),
  record("Visa Inc. Class A Common Stock", ["V"], ["nyse:v"], {
    ...commonUsEquity, instrumentId: "equity-us-v", assetClass: "equity", economicExposure: "Visa Inc. Class A common equity", underlying: "Visa Inc.", canonicalSymbol: "V", providerSymbol: "V", venue: "New York Stock Exchange", mic: "XNYS",
  }),
  record("SPDR S&P 500 ETF Trust", ["SPY"], ["nyse-arca:spy"], {
    ...commonUsEtf, instrumentId: "etf-us-spy", assetClass: "etf", economicExposure: "S&P 500 equity index exposure via SPDR S&P 500 ETF Trust", underlying: "S&P 500 Index", canonicalSymbol: "SPY", providerSymbol: "SPY", venue: "NYSE Arca", mic: "ARCX",
  }),
  record("Invesco QQQ Trust Series 1", ["QQQ"], ["nasdaq:qqq"], {
    ...commonUsEtf, instrumentId: "etf-us-qqq", assetClass: "etf", economicExposure: "Nasdaq-100 equity index exposure via Invesco QQQ Trust", underlying: "Nasdaq-100 Index", canonicalSymbol: "QQQ", providerSymbol: "QQQ", venue: "NASDAQ Stock Market", mic: "XNAS",
  }),
  record("CME Gold Front-Month Future", ["XAU", "GC"], ["cme:gc-front"], {
    ...futuresCommon, instrumentId: "future-cme-gc-front", assetClass: "commodity", economicExposure: "CME/COMEX Gold front-month futures exposure", underlying: "Gold", canonicalSymbol: "GC", providerSymbol: "CME:GC-FRONT", venue: "CME/COMEX", mic: "XCME", baseCurrency: null, quoteCurrency: "USD", settlementType: "physical",
  }),
  record("CME Silver Front-Month Future", ["XAG", "SI"], ["cme:si-front"], {
    ...futuresCommon, instrumentId: "future-cme-si-front", assetClass: "commodity", economicExposure: "CME/COMEX Silver front-month futures exposure", underlying: "Silver", canonicalSymbol: "SI", providerSymbol: "CME:SI-FRONT", venue: "CME/COMEX", mic: "XCME", baseCurrency: null, quoteCurrency: "USD", settlementType: "physical",
  }),
  record("NYMEX WTI Crude Oil Front-Month Future", ["CL"], ["nymex:cl-front"], {
    ...futuresCommon, instrumentId: "future-nymex-cl-front", assetClass: "commodity", economicExposure: "NYMEX WTI Light Sweet Crude Oil front-month futures exposure", underlying: "WTI Crude Oil", canonicalSymbol: "CL", providerSymbol: "NYMEX:CL-FRONT", venue: "NYMEX", mic: "XNYM", baseCurrency: null, quoteCurrency: "USD", settlementType: "physical",
  }),
  record("NYMEX Henry Hub Natural Gas Front-Month Future", ["NG"], ["nymex:ng-front"], {
    ...futuresCommon, instrumentId: "future-nymex-ng-front", assetClass: "commodity", economicExposure: "NYMEX Henry Hub Natural Gas front-month futures exposure", underlying: "Henry Hub Natural Gas", canonicalSymbol: "NG", providerSymbol: "NYMEX:NG-FRONT", venue: "NYMEX", mic: "XNYM", baseCurrency: null, quoteCurrency: "USD", settlementType: "physical",
  }),
  record("CME Euro FX Front-Month Future", ["EURUSD", "6E"], ["cme:6e-front"], {
    ...futuresCommon, instrumentId: "future-cme-6e-front", assetClass: "fx", economicExposure: "CME Euro FX futures exposure", underlying: "EUR/USD exchange rate", canonicalSymbol: "6E", providerSymbol: "CME:6E-FRONT", venue: "CME", mic: "XCME", baseCurrency: "EUR", quoteCurrency: "USD", settlementType: "physical",
  }),
  record("CME Japanese Yen Front-Month Future", ["USDJPY", "6J"], ["cme:6j-front"], {
    ...futuresCommon, instrumentId: "future-cme-6j-front", assetClass: "fx", economicExposure: "CME Japanese Yen futures exposure", underlying: "Japanese Yen / US Dollar futures contract", canonicalSymbol: "6J", providerSymbol: "CME:6J-FRONT", venue: "CME", mic: "XCME", baseCurrency: "JPY", quoteCurrency: "USD", settlementType: "physical",
  }),
  record("Cboe Volatility Index (VIX)", ["VIX"], ["cboe:vix"], {
    instrumentId: "index-cboe-vix", assetClass: "index", instrumentType: "index", economicExposure: "Cboe Volatility Index reference level", underlying: "S&P 500 option-implied volatility", canonicalSymbol: "VIX", providerSymbol: "VIX", venue: "Cboe", mic: "XCBO", baseCurrency: null, quoteCurrency: null, contractMonth: null, expiry: null, settlementType: "none", priceType: "index", timezone: "America/Chicago", marketCalendar: "CBOE_INDEX", jurisdiction: ["US_CBOE"], dataProvider: "UNVERIFIED_REPORT_INPUT", asOf: null, freshnessSeconds: null, rollMethodology: null,
  }),
  record("iShares 20+ Year Treasury Bond ETF", ["TLT"], ["nasdaq:tlt"], {
    ...commonUsEtf, instrumentId: "etf-us-tlt", assetClass: "etf", economicExposure: "Long-duration US Treasury exposure via iShares 20+ Year Treasury Bond ETF", underlying: "US Treasury bonds with remaining maturities above 20 years", canonicalSymbol: "TLT", providerSymbol: "TLT", venue: "NASDAQ Stock Market", mic: "XNAS",
  }),
];

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function resolveRealMarketInstrumentMaster(input: {
  symbol?: string | null;
  identifier?: string | null;
}): RealMarketInstrumentMasterRecord | null {
  const symbol = normalize(input.symbol);
  const identifier = normalize(input.identifier);
  return REAL_MARKET_INSTRUMENT_MASTER.find((entry) =>
    entry.legacySymbols.some((candidate) => normalize(candidate) === symbol) ||
    entry.legacyIdentifiers.some((candidate) => normalize(candidate) === identifier) ||
    normalize(entry.identity.canonicalSymbol) === symbol ||
    normalize(entry.identity.providerSymbol) === identifier
  ) ?? null;
}
