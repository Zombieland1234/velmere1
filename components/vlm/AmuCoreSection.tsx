"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import AmuCoreVisualizer from "@/components/vlm/AmuCoreVisualizer";
import PrimeFormulaStrip from "@/components/vlm/PrimeFormulaStrip";
import { VLM_SCIENTIFIC_CONSTANTS } from "@/lib/vlm/scientific-constants";
import { SECTION_WIDE } from "@/lib/vlm/layout";

const cardKeys = ["amu", "rho", "primeField", "security"] as const;
const harmonicIndexes = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export default function AmuCoreSection() {
  const t = useTranslations("AmuCore");
  const [selectedN, setSelectedN] = useState(4);
  const { amu, rho, sqrt10e7 } = VLM_SCIENTIFIC_CONSTANTS;
  const harmonicValue = useMemo(() => amu * Math.pow(rho, selectedN), [amu, rho, selectedN]);
  const values = {
    amu: String(amu),
    rho: String(rho),
    primeField: "AMU × ρⁿ",
    security: t("visualOnly"),
  };

  return (
    <section className={`${SECTION_WIDE} scroll-mt-28 py-16 md:py-24`}>
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
        <div className="min-w-0 lg:col-span-5">
          <p className="luxury-kicker text-velmere-gold/[0.80]">{t("kicker")}</p>
          <h2 className="mt-5 font-serif text-4xl leading-tight text-white md:text-5xl">{t("title")}</h2>
          <p className="mt-5 font-sans text-lg leading-8 text-white/[0.72]">{t("subtitle")}</p>
          <p className="mt-5 font-sans text-sm leading-7 text-white/[0.56]">{t("body")}</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {cardKeys.map((key) => (
              <article key={key} className="rounded-2xl border border-white/[0.10] bg-white/[0.035] p-5">
                <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.24em] text-white/[0.42]">
                  {t(`cards.${key}.label`)}
                </p>
                <p className="mt-4 break-words font-mono text-lg text-[#F5F0E8]">{values[key]}</p>
                <p className="mt-3 font-sans text-xs leading-6 text-white/[0.46]">
                  {key === "amu" ? `${sqrt10e7} / ${t(`cards.${key}.body`)}` : t(`cards.${key}.body`)}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-6">
            <PrimeFormulaStrip />
          </div>

          <div className="mt-6 rounded-2xl border border-white/[0.10] bg-black/[0.24] p-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-white/[0.42]">
                  {t("harmonicControl")}
                </p>
                <p className="mt-2 font-mono text-sm leading-6 text-[#F5F0E8]">
                  Hₙ = AMU × ρⁿ
                </p>
              </div>
              <p className="font-mono text-sm tabular-nums text-velmere-gold">
                H{selectedN} = {harmonicValue.toLocaleString("en-US", { maximumFractionDigits: 4 })}
              </p>
            </div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {harmonicIndexes.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSelectedN(n)}
                  aria-pressed={selectedN === n}
                  className={`min-h-10 min-w-10 rounded-full border font-mono text-xs transition-colors ${
                    selectedN === n
                      ? "border-velmere-gold bg-velmere-gold text-black"
                      : "border-white/[0.10] bg-white/[0.035] text-white/[0.58] hover:border-white/[0.24] hover:text-white"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="mt-3 font-sans text-xs leading-6 text-white/[0.42]">{t("formulaDisclaimer")}</p>
          </div>
        </div>

        <div className="min-w-0 lg:col-span-7">
          <AmuCoreVisualizer selectedN={selectedN} />
        </div>
      </div>
    </section>
  );
}
