"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import AccessFormulaVisual from "@/components/vlm/AccessFormulaVisual";
import AmuCoreVisualizer from "@/components/vlm/AmuCoreVisualizer";
import PrimeFieldSimulation from "@/components/vlm/PrimeFieldSimulation";
import PrimeFormulaStrip from "@/components/vlm/PrimeFormulaStrip";
import WalletGenesisSimulation from "@/components/vlm/WalletGenesisSimulation";
import { VLM_SCIENTIFIC_CONSTANTS } from "@/lib/vlm/scientific-constants";
import { SECTION_NARROW } from "@/lib/vlm/layout";

const tabs = ["amu", "prime", "formula", "wallet"] as const;
const harmonicIndexes = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export default function VlmProtocolLabTabs() {
  const t = useTranslations("VlmProtocolLabTabs");
  const amuT = useTranslations("AmuCore");
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("amu");
  const [selectedN, setSelectedN] = useState(4);
  const { amu, rho } = VLM_SCIENTIFIC_CONSTANTS;
  const harmonicValue = useMemo(() => amu * Math.pow(rho, selectedN), [amu, rho, selectedN]);

  return (
    <section className={`${SECTION_NARROW} scroll-mt-28 py-12 md:py-16`}>
      <div className="rounded-[2rem] border border-white/[0.10] bg-white/[0.035] p-5 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
          <div>
            <p className="luxury-kicker text-velmere-gold/[0.80]">{t("kicker")}</p>
            <h2 className="mt-5 font-serif text-4xl leading-tight text-white md:text-5xl">{t("title")}</h2>
            <p className="mt-5 font-sans text-sm leading-7 text-white/[0.58]">{t("body")}</p>
            <p className="mt-4 rounded-2xl border border-white/[0.10] bg-black/[0.24] p-4 font-sans text-xs leading-6 text-white/[0.44]">
              {t("internalNote")}
            </p>
          </div>

          <div>
            <div className="grid gap-2 sm:grid-cols-4">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  aria-pressed={activeTab === tab}
                  className={`min-h-11 rounded-full border px-4 font-sans text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors ${
                    activeTab === tab
                      ? "border-velmere-gold bg-velmere-gold text-black"
                      : "border-white/[0.10] bg-black/[0.18] text-white/[0.48] hover:border-white/[0.24] hover:text-white"
                  }`}
                >
                  {t(`tabs.${tab}`)}
                </button>
              ))}
            </div>

            <div className="mt-5">
              {activeTab === "amu" && (
                <div className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
                  <div className="rounded-[2rem] border border-white/[0.10] bg-black/[0.24] p-5">
                    <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.24em] text-white/[0.42]">
                      {amuT("harmonicControl")}
                    </p>
                    <p className="mt-3 font-mono text-sm leading-6 text-[#F5F0E8]">Hₙ = AMU × ρⁿ</p>
                    <p className="mt-3 font-mono text-sm tabular-nums text-velmere-gold">
                      H{selectedN} = {harmonicValue.toLocaleString("en-US", { maximumFractionDigits: 4 })}
                    </p>
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
                              : "border-white/[0.10] text-white/[0.52] hover:border-white/[0.24] hover:text-white"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <div className="mt-5">
                      <PrimeFormulaStrip />
                    </div>
                  </div>
                  <AmuCoreVisualizer selectedN={selectedN} />
                </div>
              )}

              {activeTab === "prime" && <PrimeFieldSimulation />}
              {activeTab === "formula" && <AccessFormulaVisual compact active />}
              {activeTab === "wallet" && <WalletGenesisSimulation compact active />}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
