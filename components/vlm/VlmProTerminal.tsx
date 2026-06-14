"use client";

import { useTranslations } from "next-intl";
import AmuCoreVisualizer from "@/components/vlm/AmuCoreVisualizer";
import AccessFormulaVisual from "@/components/vlm/AccessFormulaVisual";
import PrimeFieldSimulation from "@/components/vlm/PrimeFieldSimulation";
import SecurityReadinessConsole from "@/components/vlm/SecurityReadinessConsole";
import VlmContractRegistryPanel from "@/components/vlm/VlmContractRegistryPanel";
import VlmLiquidityRoute from "@/components/vlm/VlmLiquidityRoute";
import VlmProductionChecklist from "@/components/vlm/VlmProductionChecklist";
import WalletGenesisSimulation from "@/components/vlm/WalletGenesisSimulation";
import { VLM_SCIENTIFIC_CONSTANTS } from "@/lib/vlm/scientific-constants";
import { SECTION_NARROW } from "@/lib/vlm/layout";

const blocks = ["tokenMath", "registry", "security", "amuLab", "walletLogic", "production"] as const;

export default function VlmProTerminal() {
  const t = useTranslations("VlmProTerminal");
  const { amu, rho } = VLM_SCIENTIFIC_CONSTANTS;

  return (
    <section className={`${SECTION_NARROW} scroll-mt-28 py-10 md:py-14`}>
      <div className="mb-8 px-2 md:px-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#d4af37]">{t("kicker")}</p>
        <h2 className="mt-3 font-serif text-3xl tracking-[0.08em] text-[#FFFFF0] md:text-4xl">{t("title")}</h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-white/[0.56]">{t("body")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 px-0 md:grid-cols-3">
        {blocks.map((block) => (
          <article key={block} className="velmere-command-shell velmere-hover-lift min-w-0 rounded-[1.5rem] p-3 md:p-5">
            <h3 className="font-serif text-xl tracking-[0.12em] text-[#FFFFF0] md:text-2xl md:tracking-[0.08em]">{t(`${block}.title`)}</h3>
            <p className="mt-3 text-xs leading-6 text-white/[0.55] md:text-sm md:leading-7">{t(`${block}.body`)}</p>

            {block === "tokenMath" && (
              <dl className="mt-5 divide-y divide-white/[0.05] font-mono text-xs tabular-nums md:text-sm">
                {(["supply", "price", "quote", "buyFee", "sellFee", "lp"] as const).map((row) => (
                  <div key={row} className="grid gap-1 border-b border-white/[0.05] py-3 sm:grid-cols-2">
                    <dt className="text-[10px] uppercase tracking-[0.16em] text-white/[0.40]">{t(`tokenMath.rows.${row}.label`)}</dt>
                    <dd className="break-all text-[#FFFFF0]/[0.85]">{t(`tokenMath.rows.${row}.value`)}</dd>
                  </div>
                ))}
              </dl>
            )}

            {block === "registry" && (
              <div className="mt-5 max-h-[250px] overflow-y-auto scroll-touch pr-1 md:max-h-none md:overflow-visible md:pr-0">
                <VlmContractRegistryPanel compact />
              </div>
            )}

            {block === "security" && (
              <div className="mt-5 max-h-[250px] overflow-y-auto scroll-touch pr-1 md:max-h-none md:overflow-visible md:pr-0 [&>section]:mt-0">
                <SecurityReadinessConsole compact />
              </div>
            )}

            {block === "amuLab" && (
              <div className="mt-5 max-h-[250px] space-y-4 overflow-y-auto scroll-touch pr-1 md:max-h-none md:overflow-visible md:pr-0">
                <p className="terminal-break font-mono text-xs text-[#d4af37] md:text-sm">
                  AMU = {amu} · ρ = {rho} · Hₙ = AMU × ρⁿ
                </p>
                <AmuCoreVisualizer selectedN={4} active />
                <PrimeFieldSimulation active />
              </div>
            )}

            {block === "walletLogic" && (
              <div className="mt-5 max-h-[250px] space-y-5 overflow-y-auto scroll-touch pr-1 md:max-h-none md:overflow-visible md:pr-0">
                <AccessFormulaVisual compact active />
                <WalletGenesisSimulation compact active />
              </div>
            )}

            {block === "production" && (
              <div className="mt-5 max-h-[250px] space-y-5 overflow-y-auto scroll-touch pr-1 md:max-h-none md:overflow-visible md:pr-0">
                <VlmLiquidityRoute compact />
                <VlmProductionChecklist compact />
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
