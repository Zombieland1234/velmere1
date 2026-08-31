"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  CheckCircle2,
  Info,
  Loader2,
  Minus,
  Search,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

type Indicator = {
  name: string;
  value: number;
  weight: number;
  status: "safe" | "watch" | "warning" | "critical";
};

type Trend = {
  direction: "up" | "down" | "flat";
  change7d: number;
  change30d: number;
};

type Alert = {
  type: string;
  message: string;
  severity: "info" | "warning" | "critical";
};

type RiskData = {
  ok: boolean;
  token?: string;
  overallScore?: number;
  riskLevel?: "low" | "medium" | "high" | "critical";
  indicators?: Indicator[];
  trend?: Trend;
  alerts?: Alert[];
  error?: string;
};

function riskColor(level?: string) {
  switch (level) {
    case "low":
      return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
    case "medium":
      return "text-amber-400 bg-amber-400/10 border-amber-400/20";
    case "high":
      return "text-orange-400 bg-orange-400/10 border-orange-400/20";
    case "critical":
      return "text-red-400 bg-red-400/10 border-red-400/20";
    default:
      return "text-white/[0.46] bg-white/[0.04] border-white/[0.08]";
  }
}

function scoreColor(score: number) {
  if (score <= 30) return "text-emerald-400";
  if (score <= 60) return "text-amber-400";
  if (score <= 80) return "text-orange-400";
  return "text-red-400";
}

function statusColor(status: string) {
  switch (status) {
    case "safe":
      return "bg-emerald-400";
    case "watch":
      return "bg-amber-400";
    case "warning":
      return "bg-orange-400";
    case "critical":
      return "bg-red-400";
    default:
      return "bg-white/[0.20]";
  }
}

function severityIcon(severity: string) {
  switch (severity) {
    case "critical":
      return <ShieldAlert className="h-4 w-4 text-red-400 shrink-0" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-orange-400 shrink-0" />;
    case "info":
      return <Info className="h-4 w-4 text-blue-400 shrink-0" />;
    default:
      return <Bell className="h-4 w-4 text-white/[0.36] shrink-0" />;
  }
}

function trendIcon(direction?: string) {
  switch (direction) {
    case "up":
      return <TrendingUp className="h-4 w-4 text-emerald-400" />;
    case "down":
      return <TrendingDown className="h-4 w-4 text-red-400" />;
    default:
      return <Minus className="h-4 w-4 text-white/[0.36]" />;
  }
}

export default function RiskIndicatorClient({ locale }: { locale: string }) {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<RiskData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = {
    en: {
      title: "Risk Indicator",
      subtitle: "Composite risk scoring, multi-factor classification, alerts, and trend analysis.",
      placeholder: "Enter token symbol (e.g. SOL, BTC, PEPE)",
      analyze: "Analyze",
      scanning: "Scanning…",
      overallScore: "Overall Score",
      riskLevel: "Risk Level",
      indicators: "Risk Indicators",
      trend: "Trend",
      change7d: "7d Change",
      change30d: "30d Change",
      alerts: "Alerts",
      noAlerts: "No active alerts.",
      noData: "Enter a token symbol to view risk indicators.",
      errorPrefix: "Analysis failed:",
    },
    pl: {
      title: "Wskaźnik Ryzyka",
      subtitle: "Złożony scoring ryzyka, klasyfikacja wieloczynnikowa, alerty i analiza trendów.",
      placeholder: "Wpisz symbol tokena (np. SOL, BTC, PEPE)",
      analyze: "Analizuj",
      scanning: "Skanowanie…",
      overallScore: "Ogólny Wynik",
      riskLevel: "Poziom Ryzyka",
      indicators: "Wskaźniki Ryzyka",
      trend: "Trend",
      change7d: "Zmiana 7d",
      change30d: "Zmiana 30d",
      alerts: "Alerty",
      noAlerts: "Brak aktywnych alertów.",
      noData: "Wpisz symbol tokena, aby zobaczyć wskaźniki ryzyka.",
      errorPrefix: "Analiza nie powiodła się:",
    },
    de: {
      title: "Risiko-Indikator",
      subtitle: "Gesamtrisiko-Bewertung, Multi-Faktor-Klassifizierung, Alerts und Trendanalyse.",
      placeholder: "Token-Symbol eingeben (z.B. SOL, BTC, PEPE)",
      analyze: "Analysieren",
      scanning: "Scanning…",
      overallScore: "Gesamtbewertung",
      riskLevel: "Risikoniveau",
      indicators: "Risiko-Indikatoren",
      trend: "Trend",
      change7d: "7T Änderung",
      change30d: "30T Änderung",
      alerts: "Alerts",
      noAlerts: "Keine aktiven Alerts.",
      noData: "Token-Symbol eingeben, um Risiko-Indikatoren anzuzeigen.",
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
        `/api/market-integrity/risk-indicator?symbol=${encodeURIComponent(symbol)}`,
      );
      const json: RiskData = await res.json();
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
          <BarChart3 className="h-10 w-10 text-white/[0.12]" />
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
              <p className="velmere-label text-white/[0.36]">{c.overallScore}</p>
              <div className="mt-4 flex items-baseline gap-2">
                <span
                  className={`font-mono text-5xl font-semibold leading-none ${scoreColor(data.overallScore ?? 0)}`}
                >
                  {data.overallScore ?? "—"}
                </span>
                <span className="font-mono text-sm text-white/[0.26]">/100</span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-velmere-gold transition-all duration-500"
                  style={{ width: `${Math.max(4, Math.min(100, data.overallScore ?? 0))}%` }}
                />
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-[#0B0B0D] p-5">
              <p className="velmere-label text-white/[0.36]">{c.riskLevel}</p>
              <div className="mt-4">
                <span
                  className={`inline-block rounded-full border px-3 py-1.5 font-mono text-xs font-medium uppercase tracking-wider ${riskColor(data.riskLevel)}`}
                >
                  {data.riskLevel ?? "—"}
                </span>
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-[#0B0B0D] p-5">
              <p className="velmere-label text-white/[0.36]">{c.trend}</p>
              <div className="mt-4 flex items-center gap-3">
                {trendIcon(data.trend?.direction)}
                <div>
                  <p className="text-xs text-white/[0.36]">{c.change7d}</p>
                  <p className="font-mono text-sm text-white/[0.82]">
                    {data.trend?.change7d !== undefined
                      ? `${data.trend.change7d > 0 ? "+" : ""}${data.trend.change7d.toFixed(1)}%`
                      : "—"}
                  </p>
                </div>
                <div className="ml-4">
                  <p className="text-xs text-white/[0.36]">{c.change30d}</p>
                  <p className="font-mono text-sm text-white/[0.82]">
                    {data.trend?.change30d !== undefined
                      ? `${data.trend.change30d > 0 ? "+" : ""}${data.trend.change30d.toFixed(1)}%`
                      : "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {data.indicators && data.indicators.length > 0 && (
            <div className="rounded-xl border border-white/[0.08] bg-[#0B0B0D] p-5">
              <p className="velmere-label text-white/[0.36]">{c.indicators}</p>
              <div className="mt-4 space-y-3">
                {data.indicators.map((ind) => (
                  <div key={ind.name} className="flex items-center gap-3">
                    <span className="w-40 shrink-0 truncate text-xs text-white/[0.54]">
                      {ind.name}
                    </span>
                    <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className={`absolute inset-y-0 left-0 rounded-full ${statusColor(ind.status)} transition-all duration-500`}
                        style={{ width: `${Math.max(2, Math.min(100, ind.value))}%`, opacity: 0.6 }}
                      />
                    </div>
                    <span className="w-12 shrink-0 text-right font-mono text-xs text-white/[0.46]">
                      {ind.value}
                    </span>
                    <span className="w-10 shrink-0 text-right font-mono text-[10px] text-white/[0.26]">
                      ×{ind.weight}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-white/[0.08] bg-[#0B0B0D] p-5">
            <p className="velmere-label text-white/[0.36]">{c.alerts}</p>
            {data.alerts && data.alerts.length > 0 ? (
              <div className="mt-4 space-y-2">
                {data.alerts.map((alert, idx) => (
                  <div
                    key={`${alert.type}-${idx}`}
                    className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
                  >
                    {severityIcon(alert.severity)}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white/[0.82]">{alert.message}</p>
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-white/[0.26]">
                        {alert.type}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider border ${riskColor(alert.severity === "critical" ? "critical" : alert.severity === "warning" ? "high" : "low")}`}
                    >
                      {alert.severity}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-2 text-sm text-white/[0.30]">
                <CheckCircle2 className="h-4 w-4" />
                {c.noAlerts}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
