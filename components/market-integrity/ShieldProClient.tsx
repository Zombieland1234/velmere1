"use client";

import { useState } from "react";
import {
  Brain,
  CheckCircle2,
  ChevronRight,
  AlertTriangle,
  Info,
  Loader2,
  Search,
  Shield,
  XCircle,
} from "lucide-react";

type AiResult = {
  verdict: string;
  headline: string;
  summary: string;
  keyFindings: string[];
  contradictions: string[];
  missingData: string[];
  nextChecks: string[];
  sources: string[];
};

type BrainResult = {
  brainScore: number;
  activeLayers: number;
  confidence: number;
};

type ShieldProData = {
  ok: boolean;
  token?: string;
  result?: { overallScore?: number; riskLevel?: string };
  brain?: BrainResult;
  ai?: AiResult;
  history?: Array<{ date: string; score: number }>;
  error?: string;
};

type Depth = "basic" | "pro" | "advanced";

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

function verdictColor(verdict?: string) {
  const v = (verdict ?? "").toLowerCase();
  if (v.includes("safe") || v.includes("low") || v.includes("clear")) return "text-emerald-400";
  if (v.includes("caution") || v.includes("medium") || v.includes("watch")) return "text-amber-400";
  if (v.includes("high") || v.includes("warning") || v.includes("risky")) return "text-orange-400";
  if (v.includes("critical") || v.includes("danger") || v.includes("scam")) return "text-red-400";
  return "text-velmere-gold";
}

const depthOptions: Array<{ value: Depth; label: string }> = [
  { value: "basic", label: "Basic" },
  { value: "pro", label: "Pro" },
  { value: "advanced", label: "Advanced" },
];

export default function ShieldProClient({ locale }: { locale: string }) {
  const [query, setQuery] = useState("");
  const [depth, setDepth] = useState<Depth>("basic");
  const [data, setData] = useState<ShieldProData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = {
    en: {
      title: "Shield Pro",
      subtitle: "Enhanced risk analysis with deeper VLM Brain integration and second-source verification.",
      placeholder: "Enter token symbol (e.g. SOL, BTC, PEPE)",
      analyze: "Analyze",
      scanning: "Scanning…",
      verdict: "AI Verdict",
      headline: "Headline",
      summary: "Summary",
      keyFindings: "Key Findings",
      contradictions: "Contradictions",
      missingData: "Missing Data",
      nextChecks: "Next Checks",
      sources: "Sources",
      brainScore: "Brain Score",
      activeLayers: "Active Layers",
      confidence: "Confidence",
      overallScore: "Overall Score",
      riskLevel: "Risk Level",
      depthTier: "Analysis Depth",
      noData: "Enter a token symbol to start Shield Pro analysis.",
      noFindings: "No findings.",
      noIssues: "No issues detected.",
      errorPrefix: "Analysis failed:",
    },
    pl: {
      title: "Shield Pro",
      subtitle: "Zaawansowana analiza ryzyka z głębszą integracją VLM Brain i weryfikacją z drugiego źródła.",
      placeholder: "Wpisz symbol tokena (np. SOL, BTC, PEPE)",
      analyze: "Analizuj",
      scanning: "Skanowanie…",
      verdict: "Werdykt AI",
      headline: "Nagłówek",
      summary: "Podsumowanie",
      keyFindings: "Główne Wnioski",
      contradictions: "Sprzeczności",
      missingData: "Brakujące Dane",
      nextChecks: "Następne Sprawdzenia",
      sources: "Źródła",
      brainScore: "Wynik Brain",
      activeLayers: "Aktywne Warstwy",
      confidence: "Pewność",
      overallScore: "Ogólny Wynik",
      riskLevel: "Poziom Ryzyka",
      depthTier: "Głębokość Analizy",
      noData: "Wpisz symbol tokena, aby rozpocząć analizę Shield Pro.",
      noFindings: "Brak wniosków.",
      noIssues: "Nie wykryto problemów.",
      errorPrefix: "Analiza nie powiodła się:",
    },
    de: {
      title: "Shield Pro",
      subtitle: "Erweiterte Risikoanalyse mit tieferer VLM-Brain-Integration und Zweitquellen-Verifizierung.",
      placeholder: "Token-Symbol eingeben (z.B. SOL, BTC, PEPE)",
      analyze: "Analysieren",
      scanning: "Scanning…",
      verdict: "KI-Verdikt",
      headline: "Schlagzeile",
      summary: "Zusammenfassung",
      keyFindings: "Wichtige Erkenntnisse",
      contradictions: "Widersprüche",
      missingData: "Fehlende Daten",
      nextChecks: "Nächste Prüfungen",
      sources: "Quellen",
      brainScore: "Brain-Bewertung",
      activeLayers: "Aktive Layer",
      confidence: "Konfidenz",
      overallScore: "Gesamtbewertung",
      riskLevel: "Risikoniveau",
      depthTier: "Analyse-Tiefe",
      noData: "Token-Symbol eingeben, um Shield Pro Analyse zu starten.",
      noFindings: "Keine Erkenntnisse.",
      noIssues: "Keine Probleme erkannt.",
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
        `/api/market-integrity/shield-pro?symbol=${encodeURIComponent(symbol)}&depth=${depth}`,
      );
      const json: ShieldProData = await res.json();
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
        className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
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
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/[0.36]">{c.depthTier}:</span>
          <div className="flex gap-1">
            {depthOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDepth(opt.value)}
                className={`rounded-lg border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                  depth === opt.value
                    ? "border-velmere-gold/40 bg-velmere-gold/15 text-velmere-gold"
                    : "border-white/[0.08] bg-white/[0.02] text-white/[0.36] hover:bg-white/[0.06]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
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
          <Shield className="h-10 w-10 text-white/[0.12]" />
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
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-mono text-4xl font-semibold text-white">
                  {data.result?.overallScore ?? "—"}
                </span>
                <span className="font-mono text-sm text-white/[0.26]">/100</span>
              </div>
              {data.result?.riskLevel && (
                <span className={`mt-3 inline-block rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${riskColor(data.result.riskLevel)}`}>
                  {data.result.riskLevel}
                </span>
              )}
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-[#0B0B0D] p-5">
              <p className="velmere-label text-white/[0.36]">{c.brainScore}</p>
              <div className="mt-3">
                <span className="font-mono text-4xl font-semibold text-velmere-gold">
                  {data.brain?.brainScore ?? "—"}
                </span>
              </div>
              <div className="mt-3 flex gap-4">
                <div>
                  <p className="text-[10px] text-white/[0.30]">{c.activeLayers}</p>
                  <p className="font-mono text-xs text-white/[0.64]">{data.brain?.activeLayers ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/[0.30]">{c.confidence}</p>
                  <p className="font-mono text-xs text-white/[0.64]">
                    {data.brain?.confidence !== undefined ? `${(data.brain.confidence * 100).toFixed(0)}%` : "—"}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-[#0B0B0D] p-5">
              <p className="velmere-label text-white/[0.36]">{c.verdict}</p>
              <p className={`mt-3 font-serif text-lg font-semibold ${verdictColor(data.ai?.verdict)}`}>
                {data.ai?.verdict ?? "—"}
              </p>
              <p className="mt-2 text-xs text-white/[0.46]">{data.ai?.headline ?? ""}</p>
            </div>
          </div>

          {data.ai?.summary && (
            <div className="rounded-xl border border-white/[0.08] bg-[#0B0B0D] p-5">
              <p className="velmere-label text-white/[0.36]">{c.summary}</p>
              <p className="mt-3 text-sm leading-7 text-white/[0.64]">{data.ai.summary}</p>
            </div>
          )}

          {data.ai?.keyFindings && data.ai.keyFindings.length > 0 && (
            <div className="rounded-xl border border-white/[0.08] bg-[#0B0B0D] p-5">
              <p className="velmere-label text-white/[0.36]">{c.keyFindings}</p>
              <ul className="mt-3 space-y-2">
                {data.ai.keyFindings.map((finding, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-white/[0.72]">
                    <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-velmere-gold" />
                    {finding}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.ai?.contradictions && data.ai.contradictions.length > 0 && (
            <div className="rounded-xl border border-orange-400/15 bg-orange-400/5 p-5">
              <p className="velmere-label text-orange-400/80">{c.contradictions}</p>
              <ul className="mt-3 space-y-2">
                {data.ai.contradictions.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-orange-300/80">
                    <AlertTriangle className="mt-1 h-3.5 w-3.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.ai?.missingData && data.ai.missingData.length > 0 && (
            <div className="rounded-xl border border-amber-400/15 bg-amber-400/5 p-5">
              <p className="velmere-label text-amber-400/80">{c.missingData}</p>
              <ul className="mt-3 space-y-2">
                {data.ai.missingData.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-amber-300/80">
                    <Info className="mt-1 h-3.5 w-3.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.ai?.nextChecks && data.ai.nextChecks.length > 0 && (
            <div className="rounded-xl border border-white/[0.08] bg-[#0B0B0D] p-5">
              <p className="velmere-label text-white/[0.36]">{c.nextChecks}</p>
              <ul className="mt-3 space-y-2">
                {data.ai.nextChecks.map((check, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-white/[0.64]">
                    <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-400/60" />
                    {check}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.ai?.sources && data.ai.sources.length > 0 && (
            <div className="rounded-xl border border-white/[0.08] bg-[#0B0B0D] p-5">
              <p className="velmere-label text-white/[0.36]">{c.sources}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.ai.sources.map((src, idx) => (
                  <span
                    key={idx}
                    className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 font-mono text-[10px] text-white/[0.46]"
                  >
                    {src}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
