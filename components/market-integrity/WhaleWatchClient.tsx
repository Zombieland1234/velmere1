"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Eye,
  Info,
  Loader2,
  Search,
  Users,
  Wallet,
} from "lucide-react";

type TopHolder = {
  address: string;
  balance: number;
  percentage: number;
  role: string;
};

type Concentration = {
  top10Pct: number;
  top20Pct: number;
  giniCoefficient: number;
  holderCount: number;
};

type SellPressure = {
  estimatedSellVolume: number;
  buyVolumeRatio: number;
  netPressure: number;
};

type Cluster = {
  label: string;
  addresses: string[];
  totalPct: number;
  confidence: string;
};

type WhaleData = {
  ok: boolean;
  token?: string;
  topHolders?: TopHolder[];
  concentration?: Concentration;
  sellPressure?: SellPressure;
  clusters?: Cluster[];
  dataCompleteness?: number;
  warnings?: string[];
  error?: string;
};

function formatUsd(v?: number) {
  if (v === undefined || v === null || Number.isNaN(v)) return "—";
  if (v < 1) return `$${v.toFixed(4)}`;
  return `$${new Intl.NumberFormat("en-US", { notation: v >= 1_000_000 ? "compact" : "standard", maximumFractionDigits: 2 }).format(v)}`;
}

function formatPct(v?: number) {
  if (v === undefined || v === null || Number.isNaN(v)) return "—";
  return `${v.toFixed(2)}%`;
}

function shortenAddress(addr: string) {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function concentrationColor(pct: number) {
  if (pct < 20) return "text-emerald-400";
  if (pct < 40) return "text-amber-400";
  if (pct < 60) return "text-orange-400";
  return "text-red-400";
}

function giniColor(g: number) {
  if (g < 0.4) return "text-emerald-400";
  if (g < 0.6) return "text-amber-400";
  if (g < 0.8) return "text-orange-400";
  return "text-red-400";
}

function pressureColor(ratio: number) {
  if (ratio > 1.5) return "text-emerald-400";
  if (ratio > 1.0) return "text-amber-400";
  if (ratio > 0.5) return "text-orange-400";
  return "text-red-400";
}

function roleBadgeColor(role: string) {
  const r = role.toLowerCase();
  if (r.includes("exchange") || r.includes("cex")) return "border-blue-400/20 bg-blue-400/10 text-blue-300";
  if (r.includes("team") || r.includes("founder")) return "border-purple-400/20 bg-purple-400/10 text-purple-300";
  if (r.includes("vesting") || r.includes("lock")) return "border-amber-400/20 bg-amber-400/10 text-amber-300";
  if (r.includes("bridge")) return "border-cyan-400/20 bg-cyan-400/10 text-cyan-300";
  return "border-white/[0.08] bg-white/[0.04] text-white/[0.54]";
}

function confidenceColor(conf: string) {
  const c = conf.toLowerCase();
  if (c.includes("high")) return "text-emerald-400";
  if (c.includes("medium")) return "text-amber-400";
  return "text-white/[0.46]";
}

export default function WhaleWatchClient({ locale }: { locale: string }) {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<WhaleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = {
    en: {
      title: "Whale Watch",
      subtitle: "Holder tracking, concentration analysis, sell-side pressure estimation, and wallet clustering.",
      placeholder: "Enter token symbol (e.g. SOL, BTC, PEPE)",
      analyze: "Analyze",
      scanning: "Scanning…",
      topHolders: "Top Holders",
      address: "Address",
      balance: "Balance",
      share: "Share",
      role: "Role",
      concentration: "Concentration",
      top10: "Top 10 Holders",
      top20: "Top 20 Holders",
      gini: "Gini Coefficient",
      holders: "Total Holders",
      sellPressure: "Sell Pressure",
      sellVol: "Est. Sell Volume",
      buyRatio: "Buy/Sell Ratio",
      netPressure: "Net Pressure",
      clusters: "Wallet Clusters",
      clusterLabel: "Label",
      clusterPct: "Total %",
      clusterConf: "Confidence",
      clusterAddrs: "Addresses",
      warnings: "Warnings",
      noData: "Enter a token symbol to analyze whale activity.",
      noHolders: "No holder data available.",
      noClusters: "No cluster data available.",
      noWarnings: "No warnings.",
      dataComplete: "Data completeness",
      errorPrefix: "Analysis failed:",
    },
    pl: {
      title: "Whale Watch",
      subtitle: "Śledzenie holderów, analiza koncentracji, szacowanie presji sell-side i clustering portfeli.",
      placeholder: "Wpisz symbol tokena (np. SOL, BTC, PEPE)",
      analyze: "Analizuj",
      scanning: "Skanowanie…",
      topHolders: "Top Holders",
      address: "Adres",
      balance: "Saldo",
      share: "Udział",
      role: "Rola",
      concentration: "Koncentracja",
      top10: "Top 10 Holderów",
      top20: "Top 20 Holderów",
      gini: "Współczynnik Gini",
      holders: "Łącznie Holderów",
      sellPressure: "Presja Sell",
      sellVol: "Szac. Wolumen Sell",
      buyRatio: "Stosunek Buy/Sell",
      netPressure: "Presja Netto",
      clusters: "Klastery Portfeli",
      clusterLabel: "Etykieta",
      clusterPct: "Łączny %",
      clusterConf: "Pewność",
      clusterAddrs: "Adresy",
      warnings: "Ostrzeżenia",
      noData: "Wpisz symbol tokena, aby analizować aktywność wielorybów.",
      noHolders: "Brak danych holderów.",
      noClusters: "Brak danych klastrowych.",
      noWarnings: "Brak ostrzeżeń.",
      dataComplete: "Kompletność danych",
      errorPrefix: "Analiza nie powiodła się:",
    },
    de: {
      title: "Whale Watch",
      subtitle: "Holder-Tracking, Konzentrationsanalyse, Verkaufsdruck-Schätzung und Wallet-Clustering.",
      placeholder: "Token-Symbol eingeben (z.B. SOL, BTC, PEPE)",
      analyze: "Analysieren",
      scanning: "Scanning…",
      topHolders: "Top Holder",
      address: "Adresse",
      balance: "Guthaben",
      share: "Anteil",
      role: "Rolle",
      concentration: "Konzentration",
      top10: "Top 10 Holder",
      top20: "Top 20 Holder",
      gini: "Gini-Koeffizient",
      holders: "Gesamt Holder",
      sellPressure: "Verkaufsdruck",
      sellVol: "Gesch. Verkaufsvol.",
      buyRatio: "Kauf/Verkauf-Verhältnis",
      netPressure: "Netto-Druck",
      clusters: "Wallet-Cluster",
      clusterLabel: "Bezeichnung",
      clusterPct: "Gesamt %",
      clusterConf: "Konfidenz",
      clusterAddrs: "Adressen",
      warnings: "Warnungen",
      noData: "Token-Symbol eingeben, um Whale-Aktivität zu analysieren.",
      noHolders: "Keine Holder-Daten verfügbar.",
      noClusters: "Keine Cluster-Daten verfügbar.",
      noWarnings: "Keine Warnungen.",
      dataComplete: "Daten-Vollständigkeit",
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
        `/api/market-integrity/whale-watch?symbol=${encodeURIComponent(symbol)}`,
      );
      const json: WhaleData = await res.json();
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
          <Eye className="h-10 w-10 text-white/[0.12]" />
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
          {data.concentration && (
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-white/[0.08] bg-[#0B0B0D] p-5">
                <p className="velmere-label text-white/[0.36]">{c.top10}</p>
                <p className={`mt-3 font-mono text-3xl font-semibold ${concentrationColor(data.concentration.top10Pct)}`}>
                  {formatPct(data.concentration.top10Pct)}
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-[#0B0B0D] p-5">
                <p className="velmere-label text-white/[0.36]">{c.top20}</p>
                <p className={`mt-3 font-mono text-3xl font-semibold ${concentrationColor(data.concentration.top20Pct)}`}>
                  {formatPct(data.concentration.top20Pct)}
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-[#0B0B0D] p-5">
                <p className="velmere-label text-white/[0.36]">{c.gini}</p>
                <p className={`mt-3 font-mono text-3xl font-semibold ${giniColor(data.concentration.giniCoefficient)}`}>
                  {data.concentration.giniCoefficient.toFixed(3)}
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-[#0B0B0D] p-5">
                <p className="velmere-label text-white/[0.36]">{c.holders}</p>
                <p className="mt-3 font-mono text-3xl font-semibold text-white">
                  {new Intl.NumberFormat("en-US").format(data.concentration.holderCount)}
                </p>
              </div>
            </div>
          )}

          {data.sellPressure && (
            <div className="rounded-xl border border-white/[0.08] bg-[#0B0B0D] p-5">
              <p className="velmere-label text-white/[0.36]">{c.sellPressure}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                  <p className="text-xs text-white/[0.36]">{c.sellVol}</p>
                  <p className="mt-1 font-mono text-sm text-white/[0.82]">
                    {formatUsd(data.sellPressure.estimatedSellVolume)}
                  </p>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                  <p className="text-xs text-white/[0.36]">{c.buyRatio}</p>
                  <p className={`mt-1 font-mono text-sm font-medium ${pressureColor(data.sellPressure.buyVolumeRatio)}`}>
                    {data.sellPressure.buyVolumeRatio.toFixed(2)}x
                  </p>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                  <p className="text-xs text-white/[0.36]">{c.netPressure}</p>
                  <p className={`mt-1 font-mono text-sm ${data.sellPressure.netPressure > 0 ? "text-red-400" : "text-emerald-400"}`}>
                    {data.sellPressure.netPressure > 0 ? "+" : ""}
                    {formatUsd(data.sellPressure.netPressure)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {data.topHolders && data.topHolders.length > 0 ? (
            <div className="rounded-xl border border-white/[0.08] bg-[#0B0B0D] p-5">
              <p className="velmere-label text-white/[0.36]">{c.topHolders}</p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/[0.08]">
                      <th className="pb-2 font-mono text-[10px] uppercase tracking-wider text-white/[0.30]">#</th>
                      <th className="pb-2 font-mono text-[10px] uppercase tracking-wider text-white/[0.30]">{c.address}</th>
                      <th className="pb-2 font-mono text-[10px] uppercase tracking-wider text-white/[0.30]">{c.balance}</th>
                      <th className="pb-2 font-mono text-[10px] uppercase tracking-wider text-white/[0.30]">{c.share}</th>
                      <th className="pb-2 font-mono text-[10px] uppercase tracking-wider text-white/[0.30]">{c.role}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topHolders.map((holder, idx) => (
                      <tr key={holder.address} className="border-b border-white/[0.04]">
                        <td className="py-2.5 font-mono text-xs text-white/[0.30]">{idx + 1}</td>
                        <td className="py-2.5 font-mono text-xs text-white/[0.54]">{shortenAddress(holder.address)}</td>
                        <td className="py-2.5 font-mono text-xs text-white/[0.64]">{formatUsd(holder.balance)}</td>
                        <td className="py-2.5 font-mono text-xs text-white/[0.64]">{formatPct(holder.percentage)}</td>
                        <td className="py-2.5">
                          <span className={`inline-block rounded-full border px-2 py-0.5 font-mono text-[10px] ${roleBadgeColor(holder.role)}`}>
                            {holder.role}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.08] bg-[#0B0B0D] p-5">
              <p className="velmere-label text-white/[0.36]">{c.topHolders}</p>
              <p className="mt-4 text-sm text-white/[0.30]">{c.noHolders}</p>
            </div>
          )}

          {data.clusters && data.clusters.length > 0 ? (
            <div className="rounded-xl border border-white/[0.08] bg-[#0B0B0D] p-5">
              <p className="velmere-label text-white/[0.36]">{c.clusters}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {data.clusters.map((cluster, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-white/[0.82]">{cluster.label}</p>
                      <span className={`font-mono text-xs ${confidenceColor(cluster.confidence)}`}>
                        {cluster.confidence}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-4">
                      <div>
                        <p className="text-[10px] text-white/[0.30]">{c.clusterPct}</p>
                        <p className="font-mono text-sm text-white/[0.64]">{formatPct(cluster.totalPct)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/[0.30]">{c.clusterAddrs}</p>
                        <p className="font-mono text-sm text-white/[0.64]">{cluster.addresses.length}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.08] bg-[#0B0B0D] p-5">
              <p className="velmere-label text-white/[0.36]">{c.clusters}</p>
              <p className="mt-4 text-sm text-white/[0.30]">{c.noClusters}</p>
            </div>
          )}

          {data.warnings && data.warnings.length > 0 && (
            <div className="rounded-xl border border-amber-400/15 bg-amber-400/5 p-5">
              <p className="velmere-label text-amber-400/80">{c.warnings}</p>
              <ul className="mt-3 space-y-2">
                {data.warnings.map((w, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-amber-300/80">
                    <AlertTriangle className="mt-1 h-3.5 w-3.5 shrink-0" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.dataCompleteness !== undefined && (
            <div className="rounded-xl border border-white/[0.08] bg-[#0B0B0D] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/[0.36]">{c.dataComplete}</span>
                <span className="font-mono text-xs text-white/[0.54]">{(data.dataCompleteness * 100).toFixed(0)}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-velmere-gold transition-all duration-500"
                  style={{ width: `${Math.min(100, data.dataCompleteness * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
