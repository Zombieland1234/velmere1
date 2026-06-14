"use client";

import { useTranslations } from "next-intl";

const steps = ["plan", "code", "test", "audit", "deploy", "monitor"] as const;

export default function VlmSecurityRoadmap() {
  const t = useTranslations("VlmSecurity");

  return (
    <section className="rounded-3xl border border-white/[0.10] bg-white/[0.04] p-6 md:p-8">
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <p className="luxury-kicker text-velmere-gold/[0.80]">{t("kicker")}</p>
          <h2 className="mt-5 font-serif text-4xl leading-tight text-white md:text-5xl">{t("title")}</h2>
          <p className="mt-5 text-sm leading-7 text-white/[0.58]">{t("body")}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {steps.map((step) => (
            <div key={step} className="rounded-2xl border border-white/[0.10] bg-black/[0.24] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/[0.64]">
                {t(`steps.${step}.title`)}
              </p>
              <p className="mt-3 text-sm leading-6 text-white/[0.46]">{t(`steps.${step}.status`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
