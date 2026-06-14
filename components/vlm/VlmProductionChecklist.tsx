"use client";

import { useTranslations } from "next-intl";
import { SECTION_NARROW } from "@/lib/vlm/layout";

const phases = ["store", "platform", "vlm"] as const;

export default function VlmProductionChecklist({ compact = false }: { compact?: boolean } = {}) {
  const t = useTranslations("VlmProductionChecklist");

  return (
    <section className={compact ? "py-0" : `${SECTION_NARROW} py-8 md:py-12`}>
      <div className={compact ? "mb-5 max-w-2xl" : "mb-8 max-w-2xl"}>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#d4af37]">{t("kicker")}</p>
        <h2 className={`${compact ? "mt-3 text-xl" : "mt-4 text-3xl md:text-4xl"} font-serif leading-tight tracking-[0.08em] text-[#FFFFF0]`}>{t("title")}</h2>
        <p className="mt-4 font-sans text-xs leading-6 text-white/[0.56] md:text-sm md:leading-7">{t("body")}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {phases.map((phase) => (
          <article key={phase} className="rounded-none border border-white/[0.05] bg-white/[0.03] p-4 md:p-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#d4af37]">{t(`phases.${phase}.kicker`)}</p>
            <h3 className="mt-3 font-serif text-xl text-[#FFFFF0]">{t(`phases.${phase}.title`)}</h3>
            <ul className="mt-5 space-y-2.5">
              {(t.raw(`phases.${phase}.items`) as string[]).map((item) => (
                <li key={item} className="flex gap-2.5 font-mono text-[11px] leading-6 text-white/[0.58] md:text-sm">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#d4af37]" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
