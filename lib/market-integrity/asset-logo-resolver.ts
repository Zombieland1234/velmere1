import {
  resolvePass481ExchangeBrand,
  resolvePass481Glyph,
  resolvePass481Identity,
} from "@/lib/market-integrity/pass481-asset-identity-registry";

export type VelmereAssetClass =
  | "crypto"
  | "exchange_token"
  | "stock"
  | "etf"
  | "fx"
  | "commodity"
  | "real_estate"
  | "index"
  | "exchange"
  | "market";

export type VelmereAssetLogoInput = {
  symbol: string;
  name?: string;
  id?: string;
  assetClass?: VelmereAssetClass | string;
  imageUrl?: string;
  venue?: string;
};

export type VelmereAssetLogoResolution = {
  symbol: string;
  glyph: string;
  label: string;
  tone: string;
  imageCandidates: string[];
};


const LOCAL_BRAND_LOGOS: Record<string, string> = {
  MSFT: "/market-logos/msft.svg",
  MICROSOFT: "/market-logos/msft.svg",
  AAPL: "/market-logos/aapl.svg",
  APPLE: "/market-logos/aapl.svg",
  NVDA: "/market-logos/nvda.svg",
  NVIDIA: "/market-logos/nvda.svg",
  GOOGL: "/market-logos/googl.svg",
  GOOG: "/market-logos/googl.svg",
  ALPHABET: "/market-logos/googl.svg",
  AMZN: "/market-logos/amzn.svg",
  AMAZON: "/market-logos/amzn.svg",
  META: "/market-logos/meta.svg",
  TSLA: "/market-logos/tsla.svg",
  SAP: "/market-logos/sap.svg",
  VISA: "/market-logos/visa.svg",
  MA: "/market-logos/mastercard.svg",
  MASTERCARD: "/market-logos/mastercard.svg",
  NFLX: "/market-logos/nflx.svg",
  ADBE: "/market-logos/adbe.svg",
  AMD: "/market-logos/amd.svg",
  INTC: "/market-logos/intc.svg",
  INTEL: "/market-logos/intc.svg",
  ORCL: "/market-logos/orcl.svg",
  ORACLE: "/market-logos/orcl.svg",
  IBM: "/market-logos/ibm.svg",
  JPM: "/market-logos/jpm.svg",
  JPMORGAN: "/market-logos/jpm.svg",
  COIN: "/market-logos/coin.svg",
  COINBASE: "/market-logos/coinbase.svg",
  NDAQ: "/market-logos/ndaq.svg",
  NASDAQ: "/market-logos/nasdaq.svg",
  CRM: "/market-logos/crm.svg",
  SALESFORCE: "/market-logos/crm.svg",
  ASML: "/market-logos/asml.svg",
  QCOM: "/market-logos/qcom.svg",
  QUALCOMM: "/market-logos/qcom.svg",
  TXN: "/market-logos/txn.svg",
  ARM: "/market-logos/arm.svg",
  UBER: "/market-logos/uber.svg",
  ABNB: "/market-logos/abnb.svg",
  AIRBNB: "/market-logos/abnb.svg",
  BABA: "/market-logos/baba.svg",
  BMW: "/market-logos/bmw.svg",
  MBG: "/market-logos/mercedes.svg",
  MERCEDES: "/market-logos/mercedes.svg",
  ADS: "/market-logos/adidas.svg",
  ADIDAS: "/market-logos/adidas.svg",
  SONY: "/market-logos/sony.svg",
  SHOP: "/market-logos/shop.svg",
  LVMH: "/market-logos/lvmh.svg",
  BINANCE: "/market-logos/binance.svg",
  MEXC: "/market-logos/mexc.svg",
  OKX: "/market-logos/okx.svg",
  BYBIT: "/market-logos/bybit.svg",
  KRAKEN: "/market-logos/kraken.svg",

  TSM: "/market-logos/tsm.svg",
  TAIWANSEMICONDUCTOR: "/market-logos/tsm.svg",
  AVGO: "/market-logos/avgo.svg",
  BROADCOM: "/market-logos/avgo.svg",
  WMT: "/market-logos/wmt.svg",
  WALMART: "/market-logos/wmt.svg",
  DIS: "/market-logos/dis.svg",
  DISNEY: "/market-logos/dis.svg",
  HD: "/market-logos/hd.svg",
  HOMEDEPOT: "/market-logos/hd.svg",
  BAC: "/market-logos/bac.svg",
  BANKOFAMERICA: "/market-logos/bac.svg",
  VOW3: "/market-logos/vw.svg",
  VW: "/market-logos/vw.svg",
  VOLKSWAGEN: "/market-logos/vw.svg",
  RACE: "/market-logos/race.svg",
  FERRARI: "/market-logos/race.svg",
  MU: "/market-logos/mu.svg",
  MICRON: "/market-logos/mu.svg",
  LRCX: "/market-logos/lrcx.svg",
  LAMRESEARCH: "/market-logos/lrcx.svg",
  KLAC: "/market-logos/klac.svg",
  KLA: "/market-logos/klac.svg",
  NET: "/market-logos/net.svg",
  CLOUDFLARE: "/market-logos/net.svg",
  PYPL: "/market-logos/pypl.svg",
  PAYPAL: "/market-logos/pypl.svg",
  HOOD: "/market-logos/hood.svg",
  ROBINHOOD: "/market-logos/hood.svg",
  MELI: "/market-logos/meli.svg",
  MERCADOLIBRE: "/market-logos/meli.svg",
  TEAM: "/market-logos/team.svg",
  ATLASSIAN: "/market-logos/team.svg",
  SPOT: "/market-logos/spot.svg",
  SPOTIFY: "/market-logos/spot.svg",
  SCHW: "/market-logos/schw.svg",
  UBS: "/market-logos/ubs.svg",
  HSBC: "/market-logos/hsbc.svg",
  RY: "/market-logos/ry.svg",
  TD: "/market-logos/td.svg",
  ENB: "/market-logos/enb.svg",
  COP: "/market-logos/cop.svg",
  SLB: "/market-logos/slb.svg",
  BK: "/market-logos/bk.svg",
  BNP: "/market-logos/bnp.svg",
  ACA: "/market-logos/aca.svg",
  DB1: "/market-logos/db1.svg",
  DEUTSCHEBOERSE: "/market-logos/db1.svg",
  CME: "/market-logos/cme.svg",
  ICE: "/market-logos/ice.svg",
  SPY: "/market-logos/spy.svg",
  QQQ: "/market-logos/qqq.svg",
  GLD: "/market-logos/gld.svg",
  SLV: "/market-logos/slv.svg",
  VNQ: "/market-logos/vnq.svg",
  IYR: "/market-logos/iyr.svg",
  PLD: "/market-logos/pld.svg",

  NVO: "/market-logos/nvo.svg",
  NOVONORDISK: "/market-logos/nvo.svg",
  UNH: "/market-logos/unh.svg",
  UNITEDHEALTH: "/market-logos/unh.svg",
  JNJ: "/market-logos/jnj.svg",
  JOHNSONJOHNSON: "/market-logos/jnj.svg",
  XOM: "/market-logos/xom.svg",
  EXXONMOBIL: "/market-logos/xom.svg",
  PG: "/market-logos/pg.svg",
  PROCTERGAMBLE: "/market-logos/pg.svg",
  COST: "/market-logos/cost.svg",
  COSTCO: "/market-logos/cost.svg",
  ABBV: "/market-logos/abbv.svg",
  ABBVIE: "/market-logos/abbv.svg",
  KO: "/market-logos/ko.svg",
  COCACOLA: "/market-logos/ko.svg",
  PEP: "/market-logos/pep.svg",
  PEPSICO: "/market-logos/pep.svg",
  MRK: "/market-logos/mrk.svg",
  MERCK: "/market-logos/mrk.svg",
  CVX: "/market-logos/cvx.svg",
  CHEVRON: "/market-logos/cvx.svg",
  TMO: "/market-logos/tmo.svg",
  THERMOFISHER: "/market-logos/tmo.svg",
  ACN: "/market-logos/acn.svg",
  ACCENTURE: "/market-logos/acn.svg",
  MCD: "/market-logos/mcd.svg",
  MCDONALDS: "/market-logos/mcd.svg",
  LIN: "/market-logos/lin.svg",
  LINDE: "/market-logos/lin.svg",
  CSCO: "/market-logos/csco.svg",
  CISCO: "/market-logos/csco.svg",
  WFC: "/market-logos/wfc.svg",
  WELLSFARGO: "/market-logos/wfc.svg",
  GE: "/market-logos/ge.svg",
  GENERALELECTRIC: "/market-logos/ge.svg",
  CAT: "/market-logos/cat.svg",
  CATERPILLAR: "/market-logos/cat.svg",
  AMGN: "/market-logos/amgn.svg",
  AMGEN: "/market-logos/amgn.svg",
  ISRG: "/market-logos/isrg.svg",
  INTUITIVESURGICAL: "/market-logos/isrg.svg",
  GS: "/market-logos/gs.svg",
  GOLDMANSACHS: "/market-logos/gs.svg",
  MS: "/market-logos/ms.svg",
  MORGANSTANLEY: "/market-logos/ms.svg",
  RTX: "/market-logos/rtx.svg",
  LOW: "/market-logos/low.svg",
  LOWES: "/market-logos/low.svg",
  HON: "/market-logos/hon.svg",
  HONEYWELL: "/market-logos/hon.svg",
  BKNG: "/market-logos/bkng.svg",
  BOOKING: "/market-logos/bkng.svg",
  PANW: "/market-logos/panw.svg",
  PALOALTONETWORKS: "/market-logos/panw.svg",
  NOW: "/market-logos/now.svg",
  SERVICENOW: "/market-logos/now.svg",
  CRWD: "/market-logos/crwd.svg",
  CROWDSTRIKE: "/market-logos/crwd.svg",
  SNOW: "/market-logos/snow.svg",
  SNOWFLAKE: "/market-logos/snow.svg",
  SMCI: "/market-logos/smci.svg",
  SUPERMICRO: "/market-logos/smci.svg",
  MSTR: "/market-logos/mstr.svg",
  MICROSTRATEGY: "/market-logos/mstr.svg",
  VOO: "/market-logos/voo.svg",
  VTI: "/market-logos/vti.svg",
  DIA: "/market-logos/dia.svg",
  IWM: "/market-logos/iwm.svg",
  EFA: "/market-logos/efa.svg",
  EEM: "/market-logos/eem.svg",
  TLT: "/market-logos/tlt.svg",
  HYG: "/market-logos/hyg.svg",
  LQD: "/market-logos/lqd.svg",
  XLF: "/market-logos/xlf.svg",
  XLE: "/market-logos/xle.svg",
  XLK: "/market-logos/xlk.svg",
  XLV: "/market-logos/xlv.svg",
  ARKK: "/market-logos/arkk.svg",
  XETRA: "/market-logos/xetra.svg",
  EUREX: "/market-logos/eurex.svg",
  NYSE: "/market-logos/nyse.svg",
  CBOE: "/market-logos/cboe.svg",
  LSE: "/market-logos/lse.svg",
  EURONEXT: "/market-logos/euronext.svg",
  HKEX: "/market-logos/hkex.svg",
  JPX: "/market-logos/jpx.svg",
  BITGET: "/market-logos/bitget.svg",
  KUCOIN: "/market-logos/kucoin.svg",
  GATEIO: "/market-logos/gateio.svg",
  GATE: "/market-logos/gateio.svg",
  DERIBIT: "/market-logos/deribit.svg",
  FTX: "/market-logos/ftx.svg",

  BTC: "/market-logos/btc.svg",
  BITCOIN: "/market-logos/btc.svg",
  ETH: "/market-logos/eth.svg",
  ETHEREUM: "/market-logos/eth.svg",
  BNB: "/market-logos/bnb.svg",
  SOL: "/market-logos/sol.svg",
  XRP: "/market-logos/xrp.svg",
  ADA: "/market-logos/ada.svg",
  DOGE: "/market-logos/doge.svg",
  AVAX: "/market-logos/avax.svg",
  DOT: "/market-logos/dot.svg",
  LINK: "/market-logos/link.svg",
  V: "/market-logos/visa.svg",
  NKE: "/market-logos/nke.svg",
  NIKE: "/market-logos/nke.svg",
  AIR: "/market-logos/air.svg",
  AIRBUS: "/market-logos/air.svg",
  RMS: "/market-logos/rms.svg",
  HERMES: "/market-logos/rms.svg",
  KER: "/market-logos/ker.svg",
  KERING: "/market-logos/ker.svg",
  CFR: "/market-logos/cfr.svg",
  RICHEMONT: "/market-logos/cfr.svg",
  MC: "/market-logos/lvmh.svg",
  LVMUY: "/market-logos/lvmh.svg",
  OR: "/market-logos/or.svg",
  LOREAL: "/market-logos/or.svg",
  SIE: "/market-logos/sie.svg",
  SIEMENS: "/market-logos/sie.svg",
  ALV: "/market-logos/alv.svg",
  ALLIANZ: "/market-logos/alv.svg",
  P911: "/market-logos/porsche.svg",
  PORSCHE: "/market-logos/porsche.svg",
  LSEG: "/market-logos/lseg.svg",
  LONDONSTOCKEXCHANGEGROUP: "/market-logos/lseg.svg",
  IWDP: "/market-logos/iwdp.svg",
  XLRE: "/market-logos/xlre.svg",
  SP500: "/market-logos/sp500.svg",
  SANDP500: "/market-logos/sp500.svg",
  NDX: "/market-logos/ndx.svg",
  NASDAQ100: "/market-logos/ndx.svg",
  DAX: "/market-logos/dax.svg",
  FTSE: "/market-logos/ftse.svg",
  NIKKEI: "/market-logos/nikkei.svg",
  STOXX50E: "/market-logos/stoxx50e.svg",
  WIG20TR: "/market-logos/wig20tr.svg",
  EURUSD: "/market-logos/eurusd.svg",
  GBPUSD: "/market-logos/gbpusd.svg",
  USDJPY: "/market-logos/usdjpy.svg",
  USDCHF: "/market-logos/usdchf.svg",
  EURGBP: "/market-logos/eurgbp.svg",
  EURPLN: "/market-logos/eurpln.svg",
  USDPLN: "/market-logos/usdpln.svg",
  EURTRY: "/market-logos/eurtry.svg",
  USDTRY: "/market-logos/usdtry.svg",
  GC: "/market-logos/gc.svg",
  GOLD: "/market-logos/gc.svg",
  SI: "/market-logos/si.svg",
  SILVER: "/market-logos/si.svg",
  CL: "/market-logos/cl.svg",
  OIL: "/market-logos/cl.svg",
  BZ: "/market-logos/bz.svg",
  BRENT: "/market-logos/bz.svg",
  NG: "/market-logos/ng.svg",
  NATGAS: "/market-logos/ng.svg",
  HG: "/market-logos/hg.svg",
  COPPER: "/market-logos/hg.svg",
  ZW: "/market-logos/zw.svg",
  WHEAT: "/market-logos/zw.svg",
  HK0388: "/market-logos/hk0388.svg",
  HKEX388: "/market-logos/hk0388.svg",
  "0388HK": "/market-logos/hk0388.svg",
};

function resolveLocalBrandLogo(symbol: string, name?: string) {
  const symbolKey = String(symbol ?? "").trim().toUpperCase();
  const baseSymbolKey = symbolKey.replace(/[./-].*$/, "");
  const normalizedSymbolKey = symbolKey.replace(/[^A-Z0-9]/g, "");
  const nameKey = String(name ?? "").trim().toUpperCase();
  const normalizedNameKey = nameKey
    .replace(/[.'’]/g, "")
    .replace(/\s+(INC|GROUP|AG|SE|PLC|CORP|CORPORATION|HOLDINGS|TECHNOLOGIES|PREFERENCE|CLASS A|CLASS B)$/i, "")
    .replace(/[^A-Z0-9]/g, "");
  return (
    LOCAL_BRAND_LOGOS[symbolKey] ??
    LOCAL_BRAND_LOGOS[baseSymbolKey] ??
    LOCAL_BRAND_LOGOS[normalizedSymbolKey] ??
    LOCAL_BRAND_LOGOS[nameKey] ??
    LOCAL_BRAND_LOGOS[normalizedNameKey]
  );
}

function unique(values: Array<string | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

export function proxiedVelmereLogo(url?: string) {
  if (!url) return undefined;
  if (url.startsWith("/")) return url;
  if (!url.startsWith("https://")) return undefined;
  return `/api/market-integrity/icon?url=${encodeURIComponent(url)}`;
}

function normalizeAssetClass(value?: string): VelmereAssetClass {
  const normalized = String(value ?? "market").trim().toLowerCase();
  if (
    normalized === "crypto" ||
    normalized === "exchange_token" ||
    normalized === "stock" ||
    normalized === "etf" ||
    normalized === "fx" ||
    normalized === "commodity" ||
    normalized === "real_estate" ||
    normalized === "index" ||
    normalized === "exchange"
  ) return normalized;
  return "market";
}

export function resolveVelmereAssetLogo(input: VelmereAssetLogoInput): VelmereAssetLogoResolution {
  const rawSymbol = String(input.symbol ?? "").trim().toUpperCase();
  const symbol = rawSymbol || "MARKET";
  const venue = String(input.venue ?? input.name ?? symbol).trim();
  const requestedClass = normalizeAssetClass(input.assetClass);
  const identity = resolvePass481Identity(symbol) ?? resolvePass481Identity(venue);
  const assetClass = requestedClass === "market" ? identity?.assetClass ?? "market" : requestedClass;
  const isCrypto = assetClass === "crypto" || assetClass === "exchange_token";
  const isExchange = assetClass === "exchange";
  const simpleIcon = identity?.simpleIcon ?? resolvePass481ExchangeBrand(venue) ?? resolvePass481ExchangeBrand(symbol);
  const providerSymbol = encodeURIComponent(symbol);
  const localBrandLogo = resolveLocalBrandLogo(symbol, input.name || identity?.label);

  const imageCandidates = unique([
    proxiedVelmereLogo(input.imageUrl),
    proxiedVelmereLogo(identity?.imageUrl),
    localBrandLogo,
    !isCrypto && !isExchange ? `/api/market-integrity/asset-logo?symbol=${providerSymbol}` : undefined,
    simpleIcon ? proxiedVelmereLogo(`https://cdn.simpleicons.org/${simpleIcon}?viewbox=auto`) : undefined,
  ]);

  return {
    symbol,
    glyph: resolvePass481Glyph(symbol),
    label: input.name || identity?.label || input.venue || symbol,
    tone:
      assetClass === "commodity"
        ? "commodity"
        : assetClass === "fx"
          ? "fx"
          : assetClass === "index"
            ? "index"
            : assetClass === "real_estate"
              ? "real-estate"
              : isExchange
                ? "exchange"
                : isCrypto
                  ? "crypto"
                  : "brand",
    imageCandidates,
  };
}

export function resolveVelmereExchangeLogo(venue: string) {
  return resolveVelmereAssetLogo({ symbol: venue, venue, name: venue, assetClass: "exchange" });
}

/* PASS476 compatibility coverage: KUCOIN · BITGET · TSLA · XAU/USD. Canonical identities now live in pass481-asset-identity-registry. */
