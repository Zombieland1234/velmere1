"use client";

import { useTranslations } from "next-intl";
import { SECTION_NARROW } from "@/lib/vlm/layout";

type VlmProtocolLabTeaserProps = {
  onOpen: () => void;
};

export default function VlmProtocolLabTeaser({ onOpen }: VlmProtocolLabTeaserProps) {
  const t = useTranslations("VlmProtocolLabTeaser");

  return (
    <section className={`${SECTION_NARROW} scroll-mt-28 py-10 md:py-12`}>
      <div className="flex flex-col gap-6 rounded-[2rem] border border-white/[0.05] bg-white/[0.03] p-8 md:flex-row md:items-center md:justify-between md:p-10">
        <div className="max-w-xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#d4af37]">{t("kicker")}</p>
          <h2 className="mt-4 font-serif text-2xl leading-tight text-[#FFFFF0] md:text-3xl">{t("title")}</h2>
          <p className="mt-4 font-sans text-sm leading-7 text-white/[0.58]">{t("body")}</p>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.04] px-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/[0.72] transition-colors hover:border-white/[0.20] hover:text-white"
        >
          {t("cta")}
        </button>
      </div>
    </section>
  );
}
