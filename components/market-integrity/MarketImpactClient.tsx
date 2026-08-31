"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowUpDown,
  BarChart3,
  CheckCircle2,
  Loader2,
  Minus,
  Search,
  TrendingDown,
  Waves,
} from "lucide-react";

type LargeOrderImpact = {
  size: string;
  estimatedSlippage: number;
  marketImpactBps: number;
};

type StressTest = {
  scenario: string;
  impact: number;
  slippageEstimate: number;
};

type OrderBook = {
  source: string;
  bestBid: number;
  bestAsk: number;
  spreadPercent: number;
  bidDepthUsd: number;
  askDepthUsd: number;
};

type ImpactData = {
  ok: boolean;
  token?: string;
  liquidityDepth?: number;
  slippageEstimate?: number;
  orderbookImbalance?: number;
  largeOrderImpact?: LargeOrderImpact[];
  stressTest?: StressTest[];
  orderbook?: OrderBook;
  error?: string;
};

function formatUsd(v?: number) {
  if (v === undefined || v === null || Number.isNaN(v)) return "—";
  if (v < 1) return `$${v.toFixed(4)}`;
  return `$${new Intl.NumberFormat("en-US", { notation: v >= 1_000_000 ? "compact" : "standard", maximumFractionDigits: 2 }).format(v)}`;
}

function formatPct(v?: number) {
  if (v === undefined || v === null || Number.isNaN(v)) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

function formatBps(v?: number) {
  if (v === undefined || v === null || Number.isNaN(v)) return "—";
  return `${v.toFixed(1)} bps`;
}

function imbalanceColor(v?: number) {
  if (v === undefined || v === null) return "text-white/[0.46]";
  if (Math.abs(v) < 0.1) return "text-emerald-400";
  if (Math.abs(v) < 0.3) return "text-amber-400";
  return "text-orange-400";
}

function impactBarColor(impact: number) {
  if (impact < 5) return "bg-emerald-400";
  if (impact < 15) return "bg-amber-400";
  if (impact < 30) return "bg-orange-400";
  return "bg-red-400";
}

export default function MarketImpactClient({ locale }: { locale: string }) {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<ImpactData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = {
    en: {
      title: "Market Impact Analysis",
      subtitle: "Stress tests, liquidity depth, slippage estimation, and large order impact modeling.",
      placeholder: "Enter token symbol (e.g. SOL, BTC, PEPE)",
      analyze: "Analyze",
      scanning: "Scanning…",
      orderBook: "Order Book",
      bestBid: "Best Bid",
      bestAsk: "Best Ask",
      spread: "Spread",
      bidDepth: "Bid Depth",
      askDepth: "Ask Depth",
      slippage: "Slippage Estimate",
      liquidity: "Liquidity Depth",
      imbalance: "Orderbook Imbalance",
      largeOrders: "Large Order Impact",
      orderSize: "Order Size",
      estSlippage: "Est. Slippage",
      impactBps: "Impact (bps)",
      stressTests: "Stress Test Scenarios",
      scenario: "Scenario",
      impact: "Impact",
      stressSlippage: "Slippage Est.",
      noData: "Enter a token symbol to analyze market impact.",
      noStressTests: "No stress test data available.",
      noLargeOrders: "No large order impact data available.",
      errorPrefix: "Analysis failed:",
    },
    pl: {
      title: "Analiza Wpływu Rynkowego",
      subtitle: "Testy stress, głębokość płynności, szacowanie slippage i wpływ dużych zleceń.",
      placeholder: "Wpisz symbol tokena (np. SOL, BTC, PEPE)",
      analyze: "Analizuj",
      scanning: "Skanowanie…",
      orderBook: "Księga Zleceń",
      bestBid: "Najl. Bid",
      bestAsk: "Najl. Ask",
      spread: "Spread",
      bidDepth: "Gł. Bid",
      askDepth: "Gł. Ask",
      slippage: "Szac. Slippage",
      liquidity: "Głęb. Płynności",
      imbalance: "Nierówn. Księgi",
      largeOrders: "Wpływ Dużych Zleceń",
      orderSize: "Rozmiar",
      estSlippage: "Szac. Slippage",
      impactBps: "Impact (bps)",
      stressTests: "Scenariusze Stress Test",
      scenario: "Scenariusz",
      impact: "Impact",
      stressSlippage: "Szac. Slippage",
      noData: "Wpisz symbol tokena, aby analizować wpływ rynkowy.",
      noStressTests: "Brak danych stress test.",
      noLargeOrders: "Brak danych wpływu dużych zleceń.",
      errorPrefix: "Analiza nie powiodła się:",
    },
    de: {
      title: "Markt-Impact-Analyse",
      subtitle: "Stress-Tests, Liquiditätstiefe, Slippage-Schätzung und Large-Order-Impact-Modellierung.",
      placeholder: "Token-Symbol eingeben (z.B. SOL, BTC, PEPE)",
      analyze: "Analysieren",
      scanning: "Scanning…",
      orderBook: "Orderbuch",
      bestBid: "Best Bid",
      bestAsk: "Best Ask",
      spread: "Spread",
      bidDepth: "Bid-Tiefe",
      askDepth: "Ask-Tiefe",
      slippage: "Slippage-Schätzung",
      liquidity: "Liquiditätstiefe",
      imbalance: "Orderbuch-Ungleichgewicht",
      largeOrders: "Large-Order-Impact",
      orderSize: "Auftragsgröße",
      estSlippage: "Geschätztes Slippage",
      impactBps: "Impact (bps)",
      stressTests: "Stress-Test-Szenarien",
      scenario: "Szenario",
      impact: "Impact",
      stressSlippage: "Geschätztes Slippage",
      noData: "Token-Symbol eingeben, um Markt-Impact zu analysieren.",
      noStressTests: "Keine Stress-Test-Daten verfügbar.",
      noLargeOrders: "Keine Large-Order-Impact-Daten verfügbar.",
      errorPrefix: "Analyse fehlgeschlagen:",
    },
  };

  const c = copy[locale as keyof typeof copy] ?? copy.en;

  async function analyze() {
    const symbol = query.trim();
    if (!symbol) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(
        `/api/market-integrity/market-impact?symbol=${encodeURIComponent(symbol)}`,
      );
      const json: ImpactData = await res.json();
      if (!json.ok) throw new Error(json.error || "Analysis failed");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <p className="velmere-label text-velmere-gold">{c.title}</p>
      <h1 className="mt-3 font-serif text-3xl leading-tight tracking-[-0.04em] text-white md:text-4xl">
        {c.title}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-white/[0.46]">
        {c.subtitle}
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          analyze();
        }}
        className="mt-8 flex items-center gap-3"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/[0.30]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={c.placeholder}
            className="w-full rounded-xl border border-white/[0.08] bg-[#0B0B0D] py-3 pl-10 pr-4 text-sm text-white/[0.82] placeholder:text-white/[0.26] outline-none transition-colors focus:border-velmere-gold/40"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="inline-flex items-center gap-2 rounded-xl border border-velmere-gold/30 bg-velmere-gold/10 px-5 py-3 text-sm font-medium text-velmere-gold transition-colors hover:bg-velmere-gold/20 disabled:opacity-40"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {loading ? c.scanning : c.analyze}
        </button>
      </form>

      {error && (
        <div className="mt-6 rounded-xl border border-red-400/20 bg-red-400/5 p-4">
          <p className="text-sm text-red-300">{c.errorPrefix} {error}</p>
        </div>
      )}

      {!loading && !error && !data && (
        <div className="mt-12 flex flex-col items-center justify-center py-16 text-center">
          <Waves className="h-10 w-10 text-white/[0.12]" />
          <p className="mt-4 text-sm text-white/[0.30]">{c.noData}</p>
        </div>
      )}

      {loading && (
        <div className="mt-12 flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-velmere-gold" />
          <p className="mt-4 text-sm text-white/[0.40]">{c.scanning}</p>
        </div>
      )}

      {data && (
        <div className="mt-8 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-white/[0.08] bg-[#0B0B0D] p-5">
              <p className="velmere-label text-white/[0.36]">{c.slippage}</p>
              <p className="mt-3 font-mono text-3xl font-semibold text-white">
                {formatPct(data.slippageEstimate)}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-[#0B0B0D] p-5">
              <p className="velmere-label text-white/[0.36]">{c.liquidity}</p>
              <p className="mt-3 font-mono text-3xl font-semibold text-white">
                {formatUsd(data.liquidityDepth)}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-[#0B0B0D] p-5">
              <p className="velmere-label text-white/[0.36]">{c.imbalance}</p>
              <p className={`mt-3 font-mono text-3xl font-semibold ${imbalanceColor(data.orderbookImbalance)}`}>
                {data.orderbookImbalance !== undefined
                  ? `${data.orderbookImbalance > 0 ? "+" : ""}${(data.orderbookImbalance * 100).toFixed(1)}%`
                  : "—"}
              </p>
            </div>
          </div>

          {data.orderbook && (
            <div className="rounded-xl border border-white/[0.08] bg-[#0B0B0D] p-5">
              <p className="velmere-label text-white/[0.36]">{c.orderBook}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                  <p className="text-xs text-white/[0.36]">{c.bestBid}</p>
                  <p className="mt-1 font-mono text-sm text-emerald-400">{formatUsd(data.orderbook.bestBid)}</p>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                  <p className="text-xs text-white/[0.36]">{c.bestAsk}</p>
                  <p className="mt-1 font-mono text-sm text-red-400">{formatUsd(data.orderbook.bestAsk)}</p>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                  <p className="text-xs text-white/[0.36]">{c.spread}</p>
                  <p className="mt-1 font-mono text-sm text-white/[0.82]">{formatPct(data.orderbook.spreadPercent)}</p>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                  <p className="text-xs text-white/[0.36]">{c.bidDepth}</p>
                  <p className="mt-1 font-mono text-sm text-white/[0.82]">{formatUsd(data.orderbook.bidDepthUsd)}</p>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                  <p className="text-xs text-white/[0.36]">{c.askDepth}</p>
                  <p className="mt-1 font-mono text-sm text-white/[0.82]">{formatUsd(data.orderbook.askDepthUsd)}</p>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                  <p className="text-xs text-white/[0.36]">Source</p>
                  <p className="mt-1 font-mono text-xs text-white/[0.54]">{data.orderbook.source}</p>
                </div>
              </div>
            </div>
          )}

          {data.largeOrderImpact && data.largeOrderImpact.length > 0 ? (
            <div className="rounded-xl border border-white/[0.08] bg-[#0B0B0D] p-5">
              <p className="velmere-label text-white/[0.36]">{c.largeOrders}</p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/[0.08]">
                      <th className="pb-2 font-mono text-[10px] uppercase tracking-wider text-white/[0.30]">{c.orderSize}</th>
                      <th className="pb-2 font-mono text-[10px] uppercase tracking-wider text-white/[0.30]">{c.estSlippage}</th>
                      <th className="pb-2 font-mono text-[10px] uppercase tracking-wider text-white/[0.30]">{c.impactBps}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.largeOrderImpact.map((row, idx) => (
                      <tr key={idx} className="border-b border-white/[0.04]">
                        <td className="py-2.5 text-sm text-white/[0.82]">{row.size}</td>
                        <td className="py-2.5 font-mono text-sm text-white/[0.64]">{formatPct(row.estimatedSlippage)}</td>
                        <td className="py-2.5 font-mono text-sm text-white/[0.64]">{formatBps(row.marketImpactBps)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.08] bg-[#0B0B0D] p-5">
              <p className="velmere-label text-white/[0.36]">{c.largeOrders}</p>
              <p className="mt-4 text-sm text-white/[0.30]">{c.noLargeOrders}</p>
            </div>
          )}

          {data.stressTest && data.stressTest.length > 0 ? (
            <div className="rounded-xl border border-white/[0.08] bg-[#0B0B0D] p-5">
              <p className="velmere-label text-white/[0.36]">{c.stressTests}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {data.stressTest.map((test, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4"
                  >
                    <p className="text-sm font-medium text-white/[0.82]">{test.scenario}</p>
                    <div className="mt-3 space-y-2">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white/[0.36]">{c.impact}</span>
                          <span className="font-mono text-xs text-white/[0.64]">{formatPct(test.impact)}</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className={`h-full rounded-full ${impactBarColor(Math.abs(test.impact))}`}
                            style={{ width: `${Math.min(100, Math.abs(test.impact) * 3)}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/[0.36]">{c.stressSlippage}</span>
                        <span className="font-mono text-xs text-white/[0.64]">{formatPct(test.slippageEstimate)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.08] bg-[#0B0B0D] p-5">
              <p className="velmere-label text-white/[0.36]">{c.stressTests}</p>
              <p className="mt-4 text-sm text-white/[0.30]">{c.noStressTests}</p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
