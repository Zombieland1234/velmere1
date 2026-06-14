"use client";

import { useMemo, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { useTranslations } from "next-intl";

const inputs = ["address", "balance", "network", "rules"] as const;

/**
 * AccessScore = f(address, balance, network, rules) — UI eligibility model only.
 * See docs/VLM_SCIENTIFIC_IDENTITY.md. Not cryptographic proof.
 */
export default function AccessFormulaVisual({ compact = false, active = true }: { compact?: boolean; active?: boolean } = {}) {
  const t = useTranslations("AccessFormula");
  const [state, setState] = useState({
    address: "missing",
    balance: "zero",
    network: "unsupported",
    rules: "locked",
  });

  const reason = useMemo(() => {
    if (state.address === "missing") return "missingAddress";
    if (state.network === "unsupported") return "contractNotDeployed";
    if (state.rules === "locked") return "rulesInactive";
    return "auditRequired";
  }, [state]);

  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/[0.10] bg-[#121212]/[0.90] p-5 md:p-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#d4af37]">{t("kicker")}</p>
      <h2 className={`mt-3 font-serif leading-tight text-[#FFFFF0] ${compact ? "text-2xl" : "text-3xl md:text-4xl"}`}>
        {t("title")}
      </h2>
      <p className="mt-4 text-sm leading-7 text-white/[0.58]">{t("body")}</p>

      <div className="mt-5 rounded-2xl border border-white/[0.05] bg-black/[0.20] p-4">
        <p className="font-mono text-xs text-white/[0.55]">AccessScore = f(address, balance, network, rules)</p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {inputs.map((key) => (
          <div key={key} className="min-w-0 rounded-2xl border border-white/[0.05] bg-black/[0.20] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/[0.38]">{t(`labels.${key}`)}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Object.entries(t.raw(`options.${key}`) as Record<string, string>).map(([option, label]) => (
                <button
                  key={option}
                  type="button"
                  disabled={!active}
                  onClick={() => setState((current) => ({ ...current, [key]: option }))}
                  className={`min-h-9 rounded-full border px-2.5 text-[9px] font-semibold uppercase tracking-[0.1em] transition-colors ${
                    state[key] === option
                      ? "border-[#d4af37] bg-[#d4af37] text-black"
                      : "border-white/[0.10] text-white/[0.48]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col items-center gap-5">
        <div
          className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full border border-[#d4af37]/[0.30] bg-[#0a0a0a] text-center"
          aria-hidden={!active}
        >
          <LockKeyhole className="h-5 w-5 text-[#d4af37]" />
          <span className="mt-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/[0.54]">{t("gate")}</span>
        </div>

        <div className="w-full max-w-md rounded-2xl border border-[#d4af37]/[0.20] bg-[#d4af37]/[0.06] p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#d4af37]">{t("labels.result")}</p>
          <p className="mt-2 text-lg font-semibold text-white">{t("result")}</p>
          <p className="mt-2 text-xs leading-6 text-white/[0.58]">{t(`reasons.${reason}`)}</p>
        </div>
      </div>

      <p className="mt-5 border-t border-white/[0.05] pt-4 text-xs leading-6 text-white/[0.44]">{t("disclaimer")}</p>
      {compact ? (
        <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-white/[0.32]">{t("internalNote")}</p>
      ) : null}
    </div>
  );
}
