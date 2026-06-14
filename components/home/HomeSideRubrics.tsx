"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";

const panels = [
  { key: "atelier", x: -88 },
  { key: "access", x: 88 },
] as const;

export default function HomeSideRubrics() {
  const t = useTranslations("Home.sideRubrics");
  const reducedMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return (
    <section className="mx-auto max-w-7xl overflow-x-clip px-5 md:px-12">
      <div className="grid gap-6 md:grid-cols-2 md:gap-8">
        {panels.map((panel) => (
          <motion.article
            key={panel.key}
            initial={reducedMotion ? { opacity: 0 } : isMobile ? { opacity: 0, y: 20 } : { opacity: 0, x: panel.x }}
            whileInView={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true, margin: "-15%" }}
            className="relative min-h-[200px] overflow-hidden rounded-3xl border border-white/[0.10] bg-white/[0.035] p-6 md:min-h-[220px] md:p-8"
          >
            <span className="absolute inset-x-6 top-0 h-px bg-velmere-gold/[0.35]" aria-hidden="true" />
            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.3em] text-velmere-gold/[0.80]">
              {t(`${panel.key}.kicker`)}
            </p>
            <h2 className="mt-4 font-serif text-3xl leading-tight text-white md:text-4xl">
              {t(`${panel.key}.title`)}
            </h2>
            <p className="mt-4 max-w-xl font-sans text-sm leading-7 text-white/[0.58]">
              {t(`${panel.key}.body`)}
            </p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
