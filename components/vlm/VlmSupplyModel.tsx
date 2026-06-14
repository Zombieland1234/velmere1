"use client";

import { useTranslations } from "next-intl";

const sections = ["dynamic", "emission", "genesis", "governance", "burnLock", "vesting"] as const;

export default function VlmSupplyModel() {
  const t = useTranslations("VlmSupply");

  return (
    <section className="rounded-3xl border border-white/[0.10] bg-white/[0.04] p-6 md:p-8">
      <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <div>
          <p className="luxury-kicker text-velmere-gold/[0.80]">{t("kicker")}</p>
          <h2 className="mt-5 font-serif text-4xl leading-tight text-white md:text-5xl">{t("title")}</h2>
          <p className="mt-5 text-sm leading-7 text-white/[0.58]">{t("body")}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {sections.map((section) => (
            <article key={section} className="rounded-2xl border border-white/[0.10] bg-black/[0.24] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/[0.66]">
                {t(`sections.${section}.title`)}
              </p>
              <p className="mt-3 text-sm leading-6 text-white/[0.48]">{t(`sections.${section}.body`)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
