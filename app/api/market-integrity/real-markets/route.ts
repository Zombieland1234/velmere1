import { NextResponse } from "next/server";
import {
  resolvePass458ProviderTruthQuote,
  pass458ProviderTruthRouterContract,
} from "@/lib/market-integrity/pass458-provider-truth-router";
import type { Pass458RangeKey } from "@/lib/market-integrity/pass458-provider-truth-router";
import { pass460ProviderConsensusContract } from "@/lib/market-integrity/pass460-provider-consensus";
import { pass461VenueHealthContract } from "@/lib/market-integrity/pass461-venue-health-runtime";
import { pass462CrossVenueConsensusContract } from "@/lib/market-integrity/pass462-cross-venue-consensus";
import { pass463CanonicalPairCoverageContract } from "@/lib/market-integrity/pass463-canonical-pair-coverage";
import { pass464FundamentalQualityContract } from "@/lib/market-integrity/pass464-fundamental-quality";
import { pass465SecXbrlQualityContract } from "@/lib/market-integrity/pass465-sec-xbrl-quality";
import {
  realMarketsDataContract,
  toCanonicalRealMarketInstrument,
} from "@/lib/market-integrity/real-markets-data-contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const instruments = {
  btc: "BTC-USD",
  eth: "ETH-USD",
  sol: "SOL-USD",
  bnb: "BNB-USD",
  mx: "MX-USD",
  mexc: "MX-USD",
  okb: "OKB-USD",
  mnt: "MNT-USD",
  xrp: "XRP-USD",
  ada: "ADA-USD",
  aapl: "AAPL",
  nvda: "NVDA",
  msft: "MSFT",
  googl: "GOOGL",
  amzn: "AMZN",
  meta: "META",
  tsla: "TSLA",
  lvmh: "MC.PA",
  amd: "AMD",
  tsm: "TSM",
  avgo: "AVGO",
  gs: "GS",
  bac: "BAC",
  visa: "V",
  mastercard: "MA",
  nvo: "NVO",
  airbus: "AIR.PA",
  bmw: "BMW.DE",
  mercedes: "MBG.DE",
  vw: "VOW3.DE",
  adidas: "ADS.DE",
  loreal: "OR.PA",
  ferrari: "RACE",
  porsche: "P911.DE",
  sony: "SONY",
  shopify: "SHOP",
  doge: "DOGE-USD",
  link: "LINK-USD",
  avax: "AVAX-USD",
  dot: "DOT-USD",
  lseg: "LSEG.L",
  deutscheboerse: "DB1.DE",
  hkex: "0388.HK",
  eurusd: "EURUSD=X",
  eurpln: "EURPLN=X",
  usdpln: "USDPLN=X",
  usdjpy: "JPY=X",
  gbpusd: "GBPUSD=X",
  eurtry: "EURTRY=X",
  usdtry: "TRY=X",
  eurgbp: "EURGBP=X",
  usdchf: "CHF=X",
  spy: "SPY",
  qqq: "QQQ",
  tlt: "TLT",
  hyg: "HYG",
  efa: "EFA",
  gld: "GLD",
  vnq: "VNQ",
  iyr: "IYR",
  xlre: "XLRE",
  pld: "PLD",
  gold: "GC=F",
  silver: "SI=F",
  wti: "CL=F",
  brent: "BZ=F",
  copper: "HG=F",
  natgas: "NG=F",
  wheat: "ZW=F",
  coin: "COIN",
  cme: "CME",
  ice: "ICE",
  ndaq: "NDAQ",
  coinbase: "COIN",
  eurex: "DB1.DE",
  xetra: "DB1.DE",
  stoxx50: "^STOXX50E",
  nikkei: "^N225",
} as const;

type InstrumentId = keyof typeof instruments;

const rangeConfig = {
  "15m": { range: "1d", interval: "1m", maxCandles: 24 },
  "1h": { range: "1d", interval: "1m", maxCandles: 60 },
  "4h": { range: "1d", interval: "5m", maxCandles: 48 },
  "1d": { range: "1d", interval: "5m" },
  "1w": { range: "5d", interval: "30m" },
  "1mo": { range: "1mo", interval: "1d" },
} as const;

type YahooChart = {
  chart?: {
    result?: Array<{
      meta?: {
        currency?: string;
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        regularMarketTime?: number;
        exchangeName?: string;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
  };
};

const safeSymbol = /^[A-Za-z0-9.^=\-]{1,24}$/;

async function loadQuote(
  id: string,
  symbol: string,
  rangeKey: keyof typeof rangeConfig,
) {
  const config = rangeConfig[rangeKey];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${config.range}&interval=${config.interval}&includePrePost=false&events=div%2Csplits`;
  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "Velmere-Market-Integrity/1.0",
      },
      next: {
        revalidate:
          rangeKey === "15m" || rangeKey === "1h" || rangeKey === "4h" || rangeKey === "1d"
            ? 60
            : 300,
      },
    });
    if (!response.ok) throw new Error(`provider_${response.status}`);
    const payload = (await response.json()) as YahooChart;
    const result = payload.chart?.result?.[0];
    const quote = result?.indicators?.quote?.[0];
    const timestamps = result?.timestamp || [];
    if (!result || !quote || !timestamps.length)
      throw new Error("provider_empty");

    const allCandles = timestamps.flatMap((timestamp, index) => {
      const open = quote.open?.[index];
      const high = quote.high?.[index];
      const low = quote.low?.[index];
      const close = quote.close?.[index];
      if (
        ![open, high, low, close].every(
          (value) => typeof value === "number" && Number.isFinite(value),
        )
      )
        return [];
      return [
        {
          timestamp,
          open: open as number,
          high: high as number,
          low: low as number,
          close: close as number,
          volume:
            typeof quote.volume?.[index] === "number"
              ? (quote.volume[index] as number)
              : null,
        },
      ];
    });
    const candles =
      "maxCandles" in config
        ? allCandles.slice(-config.maxCandles)
        : allCandles;
    const currentPrice =
      result.meta?.regularMarketPrice ?? candles.at(-1)?.close ?? null;
    const previousClose =
      candles[0]?.open ?? result.meta?.chartPreviousClose ?? null;
    const changePercent =
      currentPrice !== null && previousClose
        ? ((currentPrice - previousClose) / previousClose) * 100
        : null;
    const sourceTimestamp =
      result.meta?.regularMarketTime ?? candles.at(-1)?.timestamp ?? null;

    return {
      id,
      symbol,
      state: "live" as const,
      source: "Yahoo Finance chart adapter",
      sourceTimestamp,
      exchange: result.meta?.exchangeName || null,
      currency: result.meta?.currency || null,
      currentPrice,
      changePercent,
      candles,
    };
  } catch {
    return {
      id,
      symbol,
      state: "unavailable" as const,
      source: "Yahoo Finance chart adapter",
      sourceTimestamp: null,
      exchange: null,
      currency: null,
      currentPrice: null,
      changePercent: null,
      candles: [],
    };
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") || "").trim().slice(0, 60);
  if (query) {
    try {
      const response = await fetch(
        `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=16&newsCount=0&enableFuzzyQuery=true`,
        {
          headers: {
            accept: "application/json",
            "user-agent": "Velmere-Market-Integrity/1.0",
          },
          next: { revalidate: 300 },
        },
      );
      if (!response.ok) throw new Error(`provider_${response.status}`);
      const payload = (await response.json()) as {
        quotes?: Array<{
          symbol?: string;
          shortname?: string;
          longname?: string;
          exchange?: string;
          exchDisp?: string;
          quoteType?: string;
          typeDisp?: string;
        }>;
      };
      const results = (payload.quotes || [])
        .filter((item) => item.symbol && safeSymbol.test(item.symbol))
        .slice(0, 12)
        .map((item) => ({
          symbol: item.symbol as string,
          name: item.longname || item.shortname || item.symbol || "",
          exchange: item.exchDisp || item.exchange || null,
          quoteType: item.quoteType || item.typeDisp || "UNKNOWN",
          source: "Yahoo Finance search adapter",
        }));
      return NextResponse.json(
        { ok: true, generatedAt: new Date().toISOString(), results },
        { headers: { "cache-control": "no-store" } },
      );
    } catch {
      return NextResponse.json(
        { ok: false, error: "provider_search_unavailable", results: [] },
        { status: 502, headers: { "cache-control": "no-store" } },
      );
    }
  }

  const ids = (url.searchParams.get("ids") || "")
    .split(",")
    .map((id) => id.trim().toLowerCase())
    .filter((id): id is InstrumentId => id in instruments)
    .slice(0, 18);
  const dynamicSymbols = (url.searchParams.get("symbols") || "")
    .split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter((symbol) => safeSymbol.test(symbol))
    .slice(0, 18);
  const detail = url.searchParams.get("detail") === "1";
  const rangeValue = url.searchParams.get("range");
  const rangeKey =
    rangeValue === "15m" ||
    rangeValue === "1h" ||
    rangeValue === "4h" ||
    rangeValue === "1d" ||
    rangeValue === "1w" ||
    rangeValue === "1mo"
      ? rangeValue
      : "1w";
  const providerRangeKey: Pass458RangeKey = rangeKey === "15m" ? "1h" : rangeKey;

  if (!ids.length && !dynamicSymbols.length) {
    return NextResponse.json(
      { ok: false, error: "no_supported_instruments" },
      { status: 400 },
    );
  }

  const requested = [
    ...ids.map((id) => ({ id, symbol: instruments[id] })),
    ...dynamicSymbols.map((symbol) => ({ id: symbol.toLowerCase(), symbol })),
  ].filter(
    (item, index, all) =>
      all.findIndex((candidate) => candidate.symbol === item.symbol) === index,
  );
  const quotes = await Promise.all(
    requested.map(({ id, symbol }) =>
      resolvePass458ProviderTruthQuote({
        id,
        symbol,
        rangeKey: providerRangeKey,
        compatibilityLoader: loadQuote,
        allowKeyedProvider: detail && requested.length === 1,
      }),
    ),
  );
  return NextResponse.json(
    {
      ok: true,
      generatedAt: new Date().toISOString(),
      range: rangeKey,
      router: pass458ProviderTruthRouterContract,
      consensus: pass460ProviderConsensusContract,
      venueHealth: pass461VenueHealthContract,
      crossVenue: pass462CrossVenueConsensusContract,
      pairCoverage: pass463CanonicalPairCoverageContract,
      fundamentalQuality: pass464FundamentalQualityContract,
      secXbrlQuality: pass465SecXbrlQualityContract,
      detailHydration: detail && requested.length === 1,
      dataContract: realMarketsDataContract,
      canonicalQuotes: quotes.map((quote) =>
        toCanonicalRealMarketInstrument(quote),
      ),
      quotes,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
