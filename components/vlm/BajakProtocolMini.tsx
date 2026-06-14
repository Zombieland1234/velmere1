"use client";

import { motion } from "framer-motion";
import { KeyRound, LockKeyhole, Network, Orbit } from "lucide-react";
import { useTranslations } from "next-intl";

const entrance = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-10%" },
  transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
} as const;

const miniCards = [
  { key: "amu", icon: Orbit },
  { key: "primeField", icon: Network },
  { key: "walletGenesis", icon: KeyRound },
  { key: "security", icon: LockKeyhole },
] as const;

export default function BajakProtocolMini() {
  const t = useTranslations("BajakProtocolLab");

  return (
    <section className="mx-auto max-w-7xl px-6 py-14 md:px-12 md:py-20">
      <motion.div {...entrance} className="rounded-[2rem] border border-white/[0.10] bg-white/[0.03] p-6 md:p-8">
        <div className="grid gap-7 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
          <div>
            <p className="luxury-kicker text-velmere-gold/[0.80]">{t("kicker")}</p>
            <h2 className="mt-4 max-w-xl font-serif text-4xl leading-tight text-white md:text-5xl">{t("title")}</h2>
            <p className="mt-5 max-w-2xl font-sans text-sm leading-7 text-white/[0.58]">{t("subtitle")}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {miniCards.map(({ key, icon: Icon }) => (
              <article key={key} className="rounded-2xl border border-white/[0.10] bg-black/[0.24] p-5">
                <Icon className="h-4 w-4 text-velmere-gold" aria-hidden="true" />
                <p className="mt-4 font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-white/[0.42]">{t(`cards.${key}.label`)}</p>
                <p className="mt-2 font-sans text-xs leading-6 text-white/[0.58]">{t(`cards.${key}.body`)}</p>
              </article>
            ))}
          </div>
        </div>
        <div className="mt-6 rounded-full border border-velmere-gold/[0.20] bg-velmere-gold/[0.055] px-5 py-3 font-sans text-[10px] uppercase tracking-[0.2em] text-velmere-gold/[0.80]">
          Basic view / conceptual identity only / not an audit
        </div>
      </motion.div>
    </section>
  );
}
