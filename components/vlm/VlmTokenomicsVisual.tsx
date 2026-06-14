"use client";

import { useTranslations } from "next-intl";

const segments = [
  { key: "public", value: 40, color: "bg-velmere-gold" },
  { key: "treasury", value: 30, color: "bg-[#D8D5CF]" },
  { key: "team", value: 20, color: "bg-white/[0.56]" },
  { key: "liquidity", value: 10, color: "bg-white/[0.28]" },
] as const;

export default function VlmTokenomicsVisual() {
  const t = useTranslations("VlmTokenomics");

  return (
    <section className="velmere-command-shell rounded-[1.5rem] p-4 md:p-6">
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="luxury-kicker text-velmere-gold/[0.80]">{t("kicker")}</p>
          <h2 className="mt-5 font-serif text-4xl leading-tight text-white md:text-5xl">{t("title")}</h2>
          <p className="mt-5 text-sm leading-7 text-white/[0.58]">{t("body")}</p>
          <p className="velmere-readout-card mt-5 rounded-[1.25rem] p-4 text-sm leading-7 text-white/[0.70]" data-tone="gold">
            {t("draftNotice")}
          </p>
        </div>

        <div className="space-y-4">
          {segments.map((segment) => (
            <article key={segment.key} className="velmere-readout-card rounded-[1.25rem] p-4">
              <div className="mb-2 flex items-center justify-between gap-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/[0.66]">
                  {t(`${segment.key}.label`)}
                </p>
                <p className="font-mono text-2xl font-semibold tabular-nums text-white">{segment.value}%</p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
                <div className={`h-full rounded-full ${segment.color}`} style={{ width: `${segment.value}%` }} />
              </div>
              <p className="mt-2 text-xs leading-6 text-white/[0.44]">{t(`${segment.key}.note`)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
