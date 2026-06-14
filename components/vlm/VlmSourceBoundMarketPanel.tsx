"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Database, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { useLocale } from "next-intl";
import AdvancedMarketChart, { type AdvancedMarketCandle } from "@/components/market-integrity/AdvancedMarketChart";
import ResolvedAssetLogo from "@/components/market-integrity/AssetLogo";
import type { InterfaceMode } from "@/store/useModeStore";

type RangeKey = "1h" | "4h" | "1d" | "1w";
type VlmQuote = {
  symbol?: string;
  state?: "live" | "unavailable";
  source?: string;
  sourceTimestamp?: number | null;
  currentPrice?: number | null;
  changePercent?: number | null;
  priceChange24h?: number | null;
  marketCap?: number | null;
  fdv?: number | null;
  volume24h?: number | null;
  circulatingSupply?: number | null;
  totalSupply?: number | null;
  maxSupply?: number | null;
  confidenceCap?: number | null;
  missingReason?: string | null;
  candles?: AdvancedMarketCandle[];
};
type QuoteResponse = { ok?: boolean; quotes?: VlmQuote[] };

const copy = {
  pl: {
    title: "VLM · rynek źródłowy",
    body: "Wykres powstaje wyłącznie z obserwacji dostawcy. Brak feedu nie jest zastępowany sztuczną linią.",
    loading: "Sprawdzanie źródła VLM",
    unavailable: "Brak potwierdzonego feedu rynkowego dla VLM",
    unavailableBody: "Velmère nie generuje świec, ceny ani kapitalizacji. Panel jest gotowy na podłączenie kontraktu i notowanej pary u zweryfikowanego dostawcy.",
    retry: "Sprawdź ponownie",
    source: "Źródło",
    freshness: "Świeżość",
    marketCap: "Kapitalizacja",
    fdv: "FDV",
    volume: "Wolumen 24h",
    supply: "Podaż w obiegu",
    confidence: "Limit pewności",
    noSource: "źródło wymagane",
    noData: "brak danych",
    evidence: "No fake-live",
    basic: "Basic pokazuje wyłącznie liczby potwierdzone przez feed.",
    pro: "Pro dodaje świece, podaż, FDV, świeżość i jawne luki danych.",
  },
  de: {
    title: "VLM · quellengebundener Markt",
    body: "Der Chart entsteht nur aus Provider-Beobachtungen. Ein fehlender Feed wird nicht durch eine künstliche Linie ersetzt.",
    loading: "VLM-Quelle wird geprüft",
    unavailable: "Kein bestätigter Marktfeed für VLM",
    unavailableBody: "Velmère erzeugt keine Kerzen, Preise oder Marktkapitalisierung. Das Panel ist für einen verifizierten Contract- und Pair-Feed bereit.",
    retry: "Erneut prüfen",
    source: "Quelle",
    freshness: "Freshness",
    marketCap: "Marktkapitalisierung",
    fdv: "FDV",
    volume: "Volumen 24h",
    supply: "Umlaufmenge",
    confidence: "Konfidenzlimit",
    noSource: "Quelle erforderlich",
    noData: "keine Daten",
    evidence: "No fake-live",
    basic: "Basic zeigt nur durch den Feed bestätigte Zahlen.",
    pro: "Pro ergänzt Kerzen, Supply, FDV, Freshness und sichtbare Datenlücken.",
  },
  en: {
    title: "VLM · source-bound market",
    body: "The chart is built only from provider observations. A missing feed is never replaced by an artificial line.",
    loading: "Checking the VLM source",
    unavailable: "No confirmed market feed for VLM",
    unavailableBody: "Velmère does not generate candles, price or market cap. The panel is ready for a verified contract and listed-pair feed.",
    retry: "Check again",
    source: "Source",
    freshness: "Freshness",
    marketCap: "Market cap",
    fdv: "FDV",
    volume: "Volume 24h",
    supply: "Circulating supply",
    confidence: "Confidence cap",
    noSource: "source required",
    noData: "no data",
    evidence: "No fake-live",
    basic: "Basic shows only figures confirmed by the feed.",
    pro: "Pro adds candles, supply, FDV, freshness and explicit data gaps.",
  },
} as const;

function resolveLocale(locale: string) {
  return locale === "de" || locale === "en" ? locale : "pl";
}
function compact(value: number | null | undefined, locale: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 2 }).format(value);
}
function price(value: number | null | undefined, locale: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return new Intl.NumberFormat(locale, { style: "currency", currency: "USD", maximumFractionDigits: Math.abs(value) < 1 ? 6 : 2 }).format(value);
}

export default function VlmSourceBoundMarketPanel({ mode }: { mode: InterfaceMode }) {
  const safeLocale = resolveLocale(useLocale());
  const c = copy[safeLocale];
  const [range, setRange] = useState<RangeKey>("1w");
  const [quote, setQuote] = useState<VlmQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const refreshMarket = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/market-integrity/real-markets?symbols=${encodeURIComponent("VLM-USD")}&range=${range}&detail=1`, { signal: controller.signal })
      .then((response) => response.json() as Promise<QuoteResponse>)
      .then((payload) => setQuote(payload?.quotes?.[0] ?? null))
      .catch((error: unknown) => {
        if ((error as { name?: string })?.name !== "AbortError") setQuote(null);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [attempt, range]);

  const candles = useMemo(
    () => (quote?.candles ?? []).filter((candle) => [candle.timestamp, candle.open, candle.high, candle.low, candle.close].every(Number.isFinite)),
    [quote?.candles],
  );
  const live = quote?.state === "live" && candles.length > 1;
  const observedAt = quote?.sourceTimestamp ? new Date(quote.sourceTimestamp * 1000).toLocaleString(safeLocale) : c.noData;
  const change = typeof quote?.priceChange24h === "number" ? quote.priceChange24h : typeof quote?.changePercent === "number" ? quote.changePercent : null;
  const metrics = mode === "pro"
    ? [
        [c.marketCap, compact(quote?.marketCap, safeLocale)],
        [c.fdv, compact(quote?.fdv, safeLocale)],
        [c.volume, compact(quote?.volume24h, safeLocale)],
        [c.supply, compact(quote?.circulatingSupply, safeLocale)],
        [c.confidence, typeof quote?.confidenceCap === "number" ? `${quote.confidenceCap}/100` : null],
      ] as const
    : [
        [c.marketCap, compact(quote?.marketCap, safeLocale)],
        [c.volume, compact(quote?.volume24h, safeLocale)],
        [c.confidence, typeof quote?.confidenceCap === "number" ? `${quote.confidenceCap}/100` : null],
      ] as const;

  return (
    <div className="grid gap-4 p-4 md:p-7" data-pass483-vlm-source-bound-chart="true">
      <div className="flex flex-col gap-4 rounded-[1.5rem] border border-white/[0.09] bg-black/[0.34] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <ResolvedAssetLogo symbol="VLM" name="Velmère" assetClass="crypto" className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-velmere-gold/[0.30] bg-velmere-gold/[0.08] font-mono text-[10px] font-black text-velmere-gold" />
          <div className="min-w-0">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-velmere-gold">{c.title}</p>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-white/[0.50]">{c.body}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5">
          {(["1h", "4h", "1d", "1w"] as RangeKey[]).map((item) => (
            <button key={item} type="button" onClick={() => setRange(item)} className={`rounded-full border px-3 py-2 font-mono text-[8px] uppercase tracking-[0.12em] ${range === item ? "border-velmere-gold/[0.35] bg-velmere-gold/[0.10] text-velmere-gold" : "border-white/[0.10] text-white/[0.38]"}`}>{item.toUpperCase()}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid min-h-[22rem] place-items-center rounded-[1.5rem] border border-white/[0.09] bg-black/[0.50]">
          <div className="text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-velmere-gold" /><p className="mt-4 font-mono text-[9px] uppercase tracking-[0.16em] text-white/[0.44]">{c.loading}</p></div>
        </div>
      ) : live ? (
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="velmere-readout-card rounded-2xl p-4"><span className="font-mono text-[8px] uppercase tracking-[0.13em] text-white/[0.30]">VLM / USD</span><strong className="mt-2 block font-mono text-lg text-white">{price(quote?.currentPrice, safeLocale) ?? c.noData}</strong></div>
            <div className="velmere-readout-card rounded-2xl p-4"><span className="font-mono text-[8px] uppercase tracking-[0.13em] text-white/[0.30]">24H</span><strong className={`mt-2 block font-mono text-lg ${typeof change === "number" && change < 0 ? "text-rose-200" : "text-emerald-200"}`}>{typeof change === "number" ? `${change >= 0 ? "+" : ""}${change.toFixed(2)}%` : c.noData}</strong></div>
            <div className="velmere-readout-card rounded-2xl p-4"><span className="font-mono text-[8px] uppercase tracking-[0.13em] text-white/[0.30]">{c.freshness}</span><strong className="mt-2 block break-words text-xs text-white/[0.72]">{observedAt}</strong></div>
          </div>
          <AdvancedMarketChart candles={candles} locale={safeLocale} symbol="VLM" source={quote?.source} range={range} analysisDepth={mode === "pro" ? "pro" : "basic"} confidenceCap={quote?.confidenceCap ?? null} providerRouteId="vlm-usd-primary" onRefreshDue={refreshMarket} />
          <div className={`grid gap-3 ${mode === "pro" ? "sm:grid-cols-5" : "sm:grid-cols-3"}`}>
            {metrics.map(([label, value]) => <div key={label} className="velmere-readout-card rounded-2xl p-4"><p className="font-mono text-[8px] uppercase tracking-[0.13em] text-white/[0.30]">{label}</p><p className="mt-2 break-words font-mono text-sm text-white/[0.72]">{value ?? c.noData}</p></div>)}
          </div>
        </div>
      ) : (
        <div className="grid min-h-[22rem] place-items-center rounded-[1.5rem] border border-amber-200/[0.16] bg-amber-300/[0.035] p-6 text-center">
          <div className="max-w-xl">
            <AlertTriangle className="mx-auto h-7 w-7 text-amber-200/[0.72]" />
            <h4 className="mt-4 text-xl font-semibold text-white">{c.unavailable}</h4>
            <p className="mt-3 text-sm leading-7 text-white/[0.50]">{c.unavailableBody}</p>
            <p className="mt-4 rounded-2xl border border-white/[0.08] bg-black/[0.24] p-4 text-xs leading-6 text-white/[0.46]">{mode === "pro" ? c.pro : c.basic}</p>
            <button type="button" onClick={refreshMarket} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/[0.12] px-5 font-mono text-[9px] uppercase tracking-[0.15em] text-white/[0.60] transition hover:text-white"><RefreshCw className="h-4 w-4" />{c.retry}</button>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="velmere-readout-card flex items-start gap-3 rounded-2xl p-4"><Database className="mt-0.5 h-4 w-4 text-cyan-200/[0.62]" /><div><p className="font-mono text-[8px] uppercase tracking-[0.13em] text-white/[0.30]">{c.source}</p><p className="mt-2 text-xs leading-5 text-white/[0.58]">{quote?.source || c.noSource}</p></div></div>
        <div className="velmere-readout-card flex items-start gap-3 rounded-2xl p-4" data-tone="ready"><ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-200/[0.62]" /><div><p className="font-mono text-[8px] uppercase tracking-[0.13em] text-white/[0.30]">{c.evidence}</p><p className="mt-2 text-xs leading-5 text-white/[0.58]">{mode === "pro" ? c.pro : c.basic}</p></div></div>
        <div className="velmere-readout-card flex items-start gap-3 rounded-2xl p-4" data-tone="gold"><AlertTriangle className="mt-0.5 h-4 w-4 text-amber-200/[0.62]" /><div><p className="font-mono text-[8px] uppercase tracking-[0.13em] text-white/[0.30]">{c.freshness}</p><p className="mt-2 text-xs leading-5 text-white/[0.58]">{observedAt}</p></div></div>
      </div>
    </div>
  );
}
