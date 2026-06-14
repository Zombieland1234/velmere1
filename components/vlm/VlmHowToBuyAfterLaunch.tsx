"use client";

import { ExternalLink, LockKeyhole } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { SECTION_WIDE } from "@/lib/vlm/layout";

const steps = ["wallet", "network", "officialPage", "verify", "dex", "confirm", "seed"] as const;
const compactSteps = steps.slice(0, 4);

export default function VlmHowToBuyAfterLaunch() {
  const t = useTranslations("VlmHowToBuy");
  const reducedMotion = useReducedMotion();

  return (
    <section className={`${SECTION_WIDE} scroll-mt-28 py-16 md:py-24`}>
      <div className="grid gap-8 rounded-[2rem] border border-white/[0.10] bg-white/[0.035] p-6 md:p-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
        <div>
          <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-velmere-gold/[0.25] bg-velmere-gold/[0.065] px-4 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-velmere-gold">
            <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
            {t("badge")}
          </span>
          <h2 className="mt-5 font-serif text-4xl leading-tight text-white md:text-5xl">{t("title")}</h2>
          <p className="mt-5 font-sans text-sm leading-7 text-white/[0.58]">{t("body")}</p>
        </div>

        <ol className="relative grid gap-3 sm:grid-cols-2">
          <span className="absolute bottom-12 left-[1.12rem] top-5 hidden w-px bg-gradient-to-b from-velmere-gold/[0.55] via-white/[0.10] to-transparent sm:block" aria-hidden="true" />
          {compactSteps.map((step, index) => (
            <motion.li
              key={step}
              initial={reducedMotion ? false : { opacity: 0, x: 28 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-12%" }}
              transition={{ duration: 0.45, delay: index * 0.045, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex gap-4 rounded-2xl border border-white/[0.10] bg-black/[0.24] p-4"
            >
              <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.10] bg-black font-mono text-xs text-velmere-gold">
                {index + 1}
              </span>
              <span className="font-sans text-sm leading-7 text-white/[0.66]">{t(`steps.${step}`)}</span>
            </motion.li>
          ))}
          <li className="flex items-center gap-3 pt-2 font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-white/[0.42] sm:col-span-2">
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            {t("notActive")}
          </li>
          <details className="rounded-2xl border border-white/[0.10] bg-black/[0.18] p-4 sm:col-span-2">
            <summary className="cursor-pointer list-none font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-white/[0.56]">
              {t("fullGuide")}
            </summary>
            <ol className="mt-4 grid gap-3">
              {steps.map((step, index) => (
                <li key={step} className="flex gap-3 font-sans text-sm leading-7 text-white/[0.62]">
                  <span className="font-mono text-velmere-gold">{index + 1}</span>
                  <span>{t(`steps.${step}`)}</span>
                </li>
              ))}
            </ol>
          </details>
        </ol>
      </div>
    </section>
  );
}
