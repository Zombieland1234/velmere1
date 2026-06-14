import { Cpu, KeyRound, LockKeyhole, Network, Orbit } from "lucide-react";
import { useTranslations } from "next-intl";
import PrimeFieldSimulation from "@/components/vlm/PrimeFieldSimulation";
import PrimeFormulaStrip from "@/components/vlm/PrimeFormulaStrip";
import { SECTION_WIDE } from "@/lib/vlm/layout";

const cards = [
  { key: "amu", icon: Orbit },
  { key: "rho", icon: Network },
  { key: "primeField", icon: Cpu },
  { key: "walletGenesis", icon: KeyRound },
  { key: "security", icon: LockKeyhole },
] as const;

export default function BajakProtocolLab() {
  const t = useTranslations("BajakProtocolLab");

  return (
    <section className={`${SECTION_WIDE} scroll-mt-28 py-16 md:py-24`}>
      <div className="rounded-[2rem] border border-white/[0.10] bg-white/[0.035] p-6 md:p-10">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-5">
            <p className="luxury-kicker text-velmere-gold/[0.80]">{t("kicker")}</p>
            <h2 className="mt-5 font-serif text-4xl leading-tight text-white md:text-5xl">{t("title")}</h2>
            <p className="mt-5 font-sans text-sm leading-7 text-white/[0.58]">{t("subtitle")}</p>
            <p className="mt-5 font-sans text-sm leading-7 text-white/[0.52]">{t("body")}</p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {cards.map(({ key, icon: Icon }) => (
                <article key={key} className="rounded-2xl border border-white/[0.10] bg-black/[0.24] p-4">
                  <Icon className="h-4 w-4 text-velmere-gold" aria-hidden="true" />
                  <p className="mt-4 font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-white/[0.42]">
                    {t(`cards.${key}.label`)}
                  </p>
                  <p className="mt-2 font-sans text-xs leading-6 text-white/[0.58]">{t(`cards.${key}.body`)}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="min-w-0 lg:col-span-7">
            <PrimeFieldSimulation />
          </div>
        </div>

        <div className="mt-8">
          <PrimeFormulaStrip />
        </div>
      </div>
    </section>
  );
}
