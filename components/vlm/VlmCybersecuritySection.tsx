"use client";

import { CheckCircle2, CircleDashed } from "lucide-react";
import { useTranslations } from "next-intl";

const checklist = [
  "architecture",
  "standardLibrary",
  "accessControl",
  "mintPolicy",
  "multisig",
  "testnet",
  "unitTests",
  "fuzzTests",
  "staticAnalysis",
  "audit",
  "bugBounty",
  "mainnet",
  "monitoring",
  "incidentResponse",
] as const;

const principles = ["nonCustodial", "noCustomCrypto", "tokenGating", "messageSigning", "approvalSafety"] as const;
const risks = ["accessControl", "logicErrors", "reentrancy", "externalCalls", "inputValidation", "integerSafety", "upgradeRisk", "oracleRisk", "dosRisk", "randomness"] as const;

export default function VlmCybersecuritySection() {
  const t = useTranslations("VlmCybersecurity");

  return (
    <section className="rounded-3xl border border-white/[0.10] bg-white/[0.04] p-6 md:p-8">
      <div className="mb-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <div>
          <p className="luxury-kicker text-velmere-gold/[0.80]">{t("kicker")}</p>
          <h2 className="mt-5 font-serif text-4xl leading-tight text-white md:text-5xl">{t("title")}</h2>
        </div>
        <p className="text-sm leading-7 text-white/[0.58]">{t("body")}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        {principles.map((principle) => (
          <article key={principle} className="rounded-2xl border border-white/[0.10] bg-black/[0.24] p-5 md:col-span-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-velmere-gold">
              {t(`principles.${principle}.title`)}
            </p>
            <p className="mt-3 text-sm leading-6 text-white/[0.48]">{t(`principles.${principle}.body`)}</p>
          </article>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {checklist.map((item) => (
          <div key={item} className="flex min-h-16 items-center gap-3 rounded-2xl border border-white/[0.10] bg-black/[0.24] px-4 py-3">
            <CircleDashed className="h-4 w-4 shrink-0 text-velmere-gold" aria-hidden="true" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/[0.64]">
                {t(`checklist.${item}.label`)}
              </p>
              <p className="mt-1 text-xs text-white/[0.40]">{t(`checklist.${item}.status`)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-white/[0.10] bg-black/[0.24] p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/[0.64]">{t("riskTitle")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {risks.map((risk) => (
            <span
              key={risk}
              className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/[0.10] px-3 text-[10px] uppercase tracking-[0.14em] text-white/[0.46]"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-white/[0.28]" aria-hidden="true" />
              {t(`risks.${risk}`)}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
