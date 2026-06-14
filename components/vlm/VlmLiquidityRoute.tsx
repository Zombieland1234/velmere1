import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { SECTION_NARROW } from "@/lib/vlm/layout";

const rows = ["lp", "price", "quote", "buyFee", "sellFee", "transferFee", "route", "compatibility", "risk"] as const;
const examples = ["buyExample", "sellExample", "treasury", "burn"] as const;

export default function VlmLiquidityRoute({ compact = false }: { compact?: boolean } = {}) {
  const t = useTranslations("VlmLiquidityRoute");

  return (
    <section className={compact ? "" : `${SECTION_NARROW} scroll-mt-28 py-12 md:py-16`}>
      <div className={`rounded-[2rem] border border-white/[0.05] bg-white/[0.035] ${compact ? "p-6" : "p-6 md:p-8"}`}>
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="luxury-kicker text-velmere-gold/[0.80]">{t("kicker")}</p>
            <h2 className="mt-5 font-serif text-4xl leading-tight text-white md:text-5xl">{t("title")}</h2>
            <p className="mt-5 font-sans text-sm leading-7 text-white/[0.58]">{t("body")}</p>
            <p className="mt-5 rounded-2xl border border-white/[0.10] bg-black/[0.24] p-4 font-sans text-xs leading-6 text-white/[0.46]">
              {t("clarityNote")}
            </p>
          </div>

          <div className="grid gap-4">
            <div className="rounded-3xl border border-white/[0.10] bg-black/[0.24] p-5">
              <div className="divide-y divide-white/[0.10]">
                {rows.map((row) => (
                  <div key={row} className="grid gap-2 py-3 sm:grid-cols-[0.8fr_1.2fr] sm:items-center">
                    <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-white/[0.38]">
                      {t(`rows.${row}.label`)}
                    </p>
                    <p className="font-mono text-sm leading-6 text-[#F5F0E8] tabular-nums sm:text-right">
                      <span className="whitespace-nowrap">{t(`rows.${row}.value`)}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {examples.map((item) => (
                <article key={item} className="rounded-2xl border border-white/[0.10] bg-white/[0.025] p-4">
                  <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-white/[0.38]">
                    {t(`examples.${item}.label`)}
                  </p>
                  <p className="mt-2 font-sans text-sm leading-6 text-white/[0.64]">{t(`examples.${item}.value`)}</p>
                </article>
              ))}
            </div>

            <div className="rounded-2xl border border-velmere-gold/[0.25] bg-velmere-gold/[0.065] p-4">
              <div className="flex gap-3">
                <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-velmere-gold" aria-hidden="true" />
                <p className="font-sans text-xs leading-6 text-white/[0.58]">{t("warning")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
