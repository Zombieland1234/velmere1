"use client";

import { Activity, AlertTriangle, BarChart3, Database, ExternalLink, ShieldCheck, Sigma } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import TokenRiskBadge from "@/components/market-integrity/TokenRiskBadge";
import type { TokenRiskResult } from "@/lib/market-integrity/risk-types";

function formatNumber(value?: number, options?: Intl.NumberFormatOptions) {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", options ?? { maximumFractionDigits: 2 }).format(value);
}

function formatUsd(value?: number) {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  if (value < 1) return `$${formatNumber(value, { maximumSignificantDigits: 4 })}`;
  return `$${formatNumber(value, { notation: value >= 1_000_000 ? "compact" : "standard", maximumFractionDigits: 2 })}`;
}

const ringClasses = {
  low: "from-emerald-300/[0.26] via-emerald-400/[0.08] to-transparent",
  medium: "from-amber-300/[0.28] via-amber-400/[0.08] to-transparent",
  high: "from-orange-300/[0.30] via-orange-400/[0.10] to-transparent",
  critical: "from-red-300/[0.34] via-fuchsia-500/[0.11] to-transparent",
} as const;

export default function TokenRiskCard({ result, elevated = false }: { result: TokenRiskResult; elevated?: boolean }) {
  const t = useTranslations("MarketIntegrity");
  const locale = useLocale();
  const asset = result.token;
  const generated = new Date(result.generatedAt);
  const generatedLabel = Number.isNaN(generated.getTime())
    ? "—"
    : new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(generated);

  const metrics = [
    { icon: BarChart3, label: t("metrics.price"), value: formatUsd(result.metrics.currentPrice) },
    { icon: Activity, label: t("metrics.change24h"), value: result.metrics.priceChange24h === undefined ? "—" : `${formatNumber(result.metrics.priceChange24h)}%` },
    { icon: Database, label: t("metrics.liquidity"), value: formatUsd(result.metrics.liquidityUsd) },
    { icon: Sigma, label: t("metrics.volume"), value: formatUsd(result.metrics.volume24h) },
  ];

  return (
    <article className={`relative overflow-hidden rounded-[2rem] border border-white/[0.10] bg-[#0d0d10] shadow-velmere-card ${elevated ? "lg:col-span-2" : ""}`}>
      <div className={`pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.11),transparent_32%)] opacity-70`} />
      <div className={`pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-gradient-to-br blur-3xl ${ringClasses[result.level]}`} />

      <div className="relative p-5 md:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="velmere-label text-velmere-gold">{t("cardKicker")}</p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <h2 className="font-serif text-4xl leading-none tracking-[-0.045em] text-white md:text-5xl">
                {asset.symbol}
              </h2>
              <p className="pb-1 text-sm text-white/[0.48]">{asset.name}</p>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/[0.54]">
              {t("dataQuality", { quality: t(`quality.${result.dataQuality}`) })} · {generatedLabel}
            </p>
          </div>
          <TokenRiskBadge level={result.level} label={t(`badges.${result.badge}`)} />
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[13rem_1fr] lg:items-stretch">
          <div className="rounded-[1.5rem] border border-white/[0.10] bg-black/[0.26] p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/[0.42]">{t("riskScore")}</p>
            <div className="mt-4 flex items-end gap-2">
              <span className="font-mono text-6xl font-semibold leading-none text-white">{result.score}</span>
              <span className="pb-2 font-mono text-sm text-white/[0.35]">/100</span>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.08]">
              <div className="h-full rounded-full bg-velmere-gold" style={{ width: `${Math.max(4, Math.min(100, result.score))}%` }} />
            </div>
            <p className="mt-4 text-xs leading-6 text-white/[0.42]">{t("scoreNote")}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-[1.5rem] border border-white/[0.10] bg-white/[0.035] p-4">
                <Icon className="h-4 w-4 text-velmere-gold" />
                <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.16em] text-white/[0.35]">{label}</p>
                <p className="mt-2 font-mono text-sm text-white/[0.80]">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          {result.signals.map((signal) => (
            <div key={signal.id} className="rounded-2xl border border-white/[0.10] bg-black/[0.20] p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-velmere-gold" />
                <div>
                  <p className="text-sm font-semibold text-white/[0.86]">{t(`signals.${signal.id}.label`)}</p>
                  <p className="mt-2 text-xs leading-6 text-white/[0.48]">{t(`signals.${signal.id}.description`)}</p>
                </div>
                <span className="ml-auto rounded-full border border-white/[0.10] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-white/[0.45]">
                  +{signal.points}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-white/[0.10] bg-black/[0.24] p-4 text-xs leading-6 text-white/[0.44] md:flex-row md:items-center md:justify-between">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-velmere-gold" />
            <p>{t("legalDisclaimer")}</p>
          </div>
          {asset.url ? (
            <a href={asset.url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-velmere-gold hover:text-white">
              {t("openSource")} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
