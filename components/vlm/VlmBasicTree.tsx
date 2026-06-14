"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";

const branches = ["archive", "drops", "voice", "wallet", "future", "square"] as const;

export default function VlmBasicTree() {
  const t = useTranslations("Vlm");
  const reducedMotion = useReducedMotion();

  return (
    <section className="rounded-[2rem] border border-white/[0.10] bg-white/[0.032] p-6 md:p-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#d4af37]">{t("accessTree.kicker")}</p>
      <div className="mt-8 grid gap-8 md:grid-cols-[0.45fr_1fr] md:items-start">
        <div className="relative flex min-h-40 items-center justify-center rounded-3xl border border-white/[0.10] bg-black/[0.24]">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, scale: 0.94 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-15%" }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="flex h-28 w-28 items-center justify-center rounded-full border border-[#d4af37]/[0.35] bg-[#d4af37]/[0.10] font-serif text-3xl text-[#FFFFF0]"
          >
            VLM
          </motion.div>
          <span className="absolute bottom-0 left-1/2 hidden h-10 w-px -translate-x-1/2 bg-[#d4af37]/[0.35] md:block" />
        </div>

        <div className="relative grid gap-3">
          <span className="absolute bottom-6 left-4 top-6 w-px bg-gradient-to-b from-[#d4af37]/[0.60] via-white/[0.12] to-transparent" aria-hidden="true" />
          {branches.map((branch, index) => (
            <motion.article
              key={branch}
              initial={reducedMotion ? false : { opacity: 0, x: 28 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-15%" }}
              transition={{ duration: 0.55, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
              whileHover={reducedMotion ? undefined : { y: -3, borderColor: "rgba(212,175,55,0.32)" }}
              className="relative ml-8 rounded-2xl border border-white/[0.10] bg-black/[0.20] p-5"
            >
              <span className="absolute -left-8 top-7 h-px w-8 bg-[#d4af37]/[0.45]" aria-hidden="true" />
              <span className="absolute -left-[2.2rem] top-[1.55rem] h-3 w-3 rounded-full border border-[#d4af37]/[0.45] bg-black" aria-hidden="true" />
              <h3 className="font-serif text-2xl leading-tight text-[#FFFFF0]">{t(`accessTree.${branch}.title`)}</h3>
              <p className="mt-2 text-sm leading-7 text-white/[0.58]">{t(`accessTree.${branch}.body`)}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
