"use client";

import { useTranslations } from "next-intl";
import { SECTION_NARROW } from "@/lib/vlm/layout";

const basicReadiness = ["supply", "network", "price", "quote", "fee", "registry"] as const;
const basicDeployment = ["contract", "route", "pool", "audit"] as const;
const proExtra = ["chainId", "explorer", "router", "treasury", "lp", "abi", "auditUrl"] as const;

function RowTable({
  title,
  rows,
  namespace,
}: {
  title: string;
  rows: readonly string[];
  namespace: "readiness" | "deployment";
}) {
  const t = useTranslations("VlmMarketSnapshot");

  return (
    <div className="rounded-[2rem] border border-white/[0.10] bg-[#121212]/[0.90] p-6 md:p-8">
      <h3 className="font-serif text-xl text-[#FFFFF0] md:text-2xl">{title}</h3>
      <dl className="mt-5 divide-y divide-white/[0.05]">
        {rows.map((row) => (
          <div key={row} className="grid gap-1 py-3.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:gap-4">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/[0.40]">
              {t(`${namespace}.${row}.label`)}
            </dt>
            <dd className="font-mono text-sm tabular-nums leading-6 text-[#FFFFF0]/[0.85] break-words">
              {t(`${namespace}.${row}.value`)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function VlmMarketSnapshot({ mode }: { mode?: "basic" | "pro" } = {}) {
  const t = useTranslations("VlmMarketSnapshot");
  const isPro = mode ? mode === "pro" : false;

  const deploymentRows = isPro ? [...basicDeployment, ...proExtra] : basicDeployment;

  return (
    <div id="vlm-implementation-status" className={`${SECTION_NARROW} scroll-mt-28 py-10 md:py-14`}>
      <div className="mb-6 max-w-xl px-2 md:px-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#d4af37]">{t("kicker")}</p>
        <h2 className="mt-3 font-serif text-3xl text-[#FFFFF0] md:text-4xl">{t("title")}</h2>
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <RowTable title={t("readinessTitle")} rows={basicReadiness} namespace="readiness" />
        <RowTable title={t("deploymentTitle")} rows={deploymentRows} namespace="deployment" />
      </div>
    </div>
  );
}
