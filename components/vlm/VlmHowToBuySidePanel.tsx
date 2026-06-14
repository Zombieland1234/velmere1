"use client";

import { LockKeyhole } from "lucide-react";
import { useTranslations } from "next-intl";

const steps = ["wallet", "network", "officialPage", "verify", "dex", "confirm", "seed"] as const;

export default function VlmHowToBuySidePanel() {
  const t = useTranslations("VlmHowToBuySidePanel");

  return (
    <div className="space-y-8">
      <p className="font-sans text-sm leading-7 text-white/[0.58]">{t("body")}</p>
      <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#d4af37]/[0.25] bg-[#d4af37]/[0.065] px-4 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d4af37]">
        <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
        {t("badge")}
      </span>
      <ol className="grid gap-3">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-4 rounded-2xl border border-white/[0.05] bg-black/[0.24] p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.10] bg-black font-mono text-xs text-[#d4af37]">
              {index + 1}
            </span>
            <span className="font-sans text-sm leading-7 text-white/[0.66]">{t(`steps.${step}`)}</span>
          </li>
        ))}
      </ol>
      <p className="rounded-2xl border border-white/[0.05] bg-black/[0.24] p-4 font-sans text-xs leading-6 text-white/[0.46]">
        {t("footer")}
      </p>
    </div>
  );
}
