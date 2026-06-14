"use client";

import { Check, LockKeyhole, MoreHorizontal, ShieldAlert } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";

const steps = [
  { key: "concept", status: "done" },
  { key: "brandAccess", status: "inProgress" },
  { key: "legalReview", status: "required" },
  { key: "contractArchitecture", status: "required" },
  { key: "testnet", status: "locked" },
  { key: "staticAnalysis", status: "locked" },
  { key: "audit", status: "locked" },
  { key: "mainnet", status: "locked" },
  { key: "activation", status: "locked" },
] as const;

function StatusIcon({ status }: { status: (typeof steps)[number]["status"] }) {
  if (status === "done") return <Check className="h-4 w-4" aria-hidden="true" />;
  if (status === "inProgress") return <MoreHorizontal className="h-4 w-4" aria-hidden="true" />;
  if (status === "required") return <ShieldAlert className="h-4 w-4" aria-hidden="true" />;
  return <LockKeyhole className="h-4 w-4" aria-hidden="true" />;
}

export default function VlmRoadmap() {
  const t = useTranslations("VlmRoadmap");
  const reducedMotion = useReducedMotion();

  return (
    <section className="rounded-3xl border border-white/[0.10] bg-white/[0.04] p-6 md:p-8">
      <p className="luxury-kicker text-velmere-gold/[0.80]">{t("kicker")}</p>
      <h2 className="mt-5 font-serif text-4xl leading-tight text-white md:text-5xl">{t("title")}</h2>

      <div className="relative mt-10">
        <div className="absolute left-5 top-0 hidden h-full w-px bg-gradient-to-b from-velmere-gold/[0.70] via-white/[0.10] to-transparent md:block" />
        <div className="grid gap-4">
          {steps.map((step, index) => {
            const active = step.status === "inProgress";
            return (
              <motion.article
                key={step.key}
                initial={reducedMotion ? false : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-12%" }}
                transition={{ duration: 0.42, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
                className={`relative grid gap-4 rounded-2xl border p-5 md:grid-cols-[auto_0.8fr_1fr] md:items-center md:pl-16 ${
                  active
                    ? "border-velmere-gold/[0.28] bg-velmere-gold/[0.065]"
                    : step.status === "locked"
                      ? "border-white/[0.10] bg-black/[0.18] opacity-72"
                      : "border-white/[0.10] bg-black/[0.24]"
                }`}
              >
                <span className="absolute left-0 top-5 hidden h-10 w-10 items-center justify-center rounded-full border border-white/[0.10] bg-black text-velmere-gold md:inline-flex">
                  <StatusIcon status={step.status} />
                </span>
                <span className="font-mono text-xs text-white/[0.34]">0{index + 1}</span>
                <h3 className="font-sans text-lg font-semibold leading-tight text-white md:text-xl">
                  {t(`steps.${step.key}.title`)}
                </h3>
                <p className="font-sans text-xs font-semibold uppercase tracking-[0.16em] text-white/[0.42] md:text-right">
                  {t(`statuses.${step.status}`)}
                </p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
