import { useTranslations } from "next-intl";
import { SECTION_NARROW } from "@/lib/vlm/layout";

const steps = ["install", "create", "store", "network", "verify", "connect", "read"] as const;

export default function VlmWalletFlow({ compact = false }: { compact?: boolean } = {}) {
  const t = useTranslations("VlmWalletFlow");

  if (compact) {
    return (
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#d4af37]">{t("kicker")}</p>
        <h3 className="mt-3 font-serif text-2xl text-[#FFFFF0]">{t("title")}</h3>
        <ol className="mt-5 grid gap-3">
          {steps.map((step, index) => (
            <li key={step} className="rounded-2xl border border-white/[0.05] bg-white/[0.03] p-4">
              <p className="font-mono text-xs text-[#d4af37]">0{index + 1}</p>
              <p className="mt-2 font-sans text-sm font-semibold uppercase tracking-[0.14em] text-white">
                {t(`steps.${step}.title`)}
              </p>
              <p className="mt-2 font-sans text-xs leading-6 text-white/[0.50]">{t(`steps.${step}.body`)}</p>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <section className={`${SECTION_NARROW} scroll-mt-28 py-12 md:py-16`}>
      <div className="rounded-[2rem] border border-white/[0.10] bg-[#0A0A0A] p-6 md:p-8">
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
          <div>
            <p className="luxury-kicker text-velmere-gold/[0.80]">{t("kicker")}</p>
            <h2 className="mt-5 font-serif text-4xl leading-tight text-white md:text-5xl">{t("title")}</h2>
            <p className="mt-5 font-sans text-sm leading-7 text-white/[0.58]">{t("body")}</p>
          </div>
          <ol className="grid gap-3 sm:grid-cols-2">
            {steps.map((step, index) => (
              <li key={step} className="rounded-2xl border border-white/[0.10] bg-white/[0.03] p-4">
                <p className="font-mono text-xs text-velmere-gold">0{index + 1}</p>
                <p className="mt-3 font-sans text-sm font-semibold uppercase tracking-[0.14em] text-white">
                  {t(`steps.${step}.title`)}
                </p>
                <p className="mt-2 font-sans text-xs leading-6 text-white/[0.50]">{t(`steps.${step}.body`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
