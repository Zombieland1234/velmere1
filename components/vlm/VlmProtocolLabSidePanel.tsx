"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import AccessFormulaVisual from "@/components/vlm/AccessFormulaVisual";
import AmuCoreVisualizer from "@/components/vlm/AmuCoreVisualizer";
import PrimeFieldSimulation from "@/components/vlm/PrimeFieldSimulation";
import PrimeFormulaStrip from "@/components/vlm/PrimeFormulaStrip";
import SecurityReadinessConsole from "@/components/vlm/SecurityReadinessConsole";
import WalletGenesisSimulation from "@/components/vlm/WalletGenesisSimulation";
import { VLM_SCIENTIFIC_CONSTANTS } from "@/lib/vlm/scientific-constants";

const tabs = ["amu", "prime", "formula", "wallet", "security"] as const;
const harmonicIndexes = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export default function VlmProtocolLabSidePanel() {
  const t = useTranslations("VlmProtocolLabSidePanel");
  const amuT = useTranslations("AmuCore");
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("amu");
  const [selectedN, setSelectedN] = useState(4);
  const { amu, rho } = VLM_SCIENTIFIC_CONSTANTS;
  const harmonicValue = useMemo(() => amu * Math.pow(rho, selectedN), [amu, rho, selectedN]);

  return (
    <div className="space-y-6">
      <p className="font-sans text-sm leading-7 text-white/[0.58]">{t("body")}</p>

      <div className="-mx-1 flex gap-2 overflow-x-auto pb-1 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            aria-pressed={activeTab === tab}
            className={`min-h-11 shrink-0 rounded-full border px-3 font-sans text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors ${
              activeTab === tab
                ? "border-[#d4af37] bg-[#d4af37] text-black"
                : "border-white/[0.10] bg-black/[0.18] text-white/[0.48] hover:border-white/[0.24] hover:text-white"
            }`}
          >
            {t(`tabs.${tab}`)}
          </button>
        ))}
      </div>

      <div className="min-h-[320px]">
        {activeTab === "amu" && (
          <div className="grid gap-5">
            <div className="rounded-[2rem] border border-white/[0.05] bg-black/[0.24] p-5">
              <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.24em] text-white/[0.42]">
                {amuT("harmonicControl")}
              </p>
              <p className="mt-3 font-mono text-sm leading-6 text-[#FFFFF0]">Hₙ = AMU × ρⁿ</p>
              <p className="mt-3 font-mono text-sm tabular-nums text-[#d4af37]">
                H{selectedN} = {harmonicValue.toLocaleString("en-US", { maximumFractionDigits: 4 })}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {harmonicIndexes.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSelectedN(n)}
                    aria-pressed={selectedN === n}
                    className={`min-h-10 min-w-10 rounded-full border font-mono text-xs transition-colors ${
                      selectedN === n
                        ? "border-[#d4af37] bg-[#d4af37] text-black"
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
            <AmuCoreVisualizer selectedN={selectedN} active />
          </div>
        )}
        {activeTab === "prime" && <PrimeFieldSimulation active />}
        {activeTab === "formula" && <AccessFormulaVisual compact active />}
        {activeTab === "wallet" && <WalletGenesisSimulation compact active />}
        {activeTab === "security" && (
          <div className="[&>section]:mt-0">
            <SecurityReadinessConsole />
          </div>
        )}
      </div>
    </div>
  );
}
