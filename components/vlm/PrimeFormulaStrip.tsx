import { useTranslations } from "next-intl";
import { VLM_SCIENTIFIC_CONSTANTS } from "@/lib/vlm/scientific-constants";

export default function PrimeFormulaStrip() {
  const t = useTranslations("PrimeFormula");
  const { amu, rho, sqrt10e7 } = VLM_SCIENTIFIC_CONSTANTS;
  const formulas = [
    `AMU = ${sqrt10e7} = ${amu}`,
    `ρ = ${rho}`,
    "Hₙ = AMU × ρⁿ",
    "AccessScore = f(address, balance, network, rules)",
  ];

  return (
    <div className="rounded-2xl border border-white/[0.10] bg-black/[0.22] p-4">
      <div className="flex flex-wrap gap-2">
        {formulas.map((formula) => (
          <span
            key={formula}
            className="rounded-full border border-white/[0.10] bg-white/[0.035] px-3 py-2 font-mono text-[11px] leading-5 text-white/[0.62]"
          >
            {formula}
          </span>
        ))}
      </div>
      <p className="mt-3 font-sans text-xs leading-6 text-white/[0.44]">{t("disclaimer")}</p>
    </div>
  );
}
