import { useTranslations } from "next-intl";

const rows = ["address", "chainId", "network", "explorer", "dexRoute", "pool", "router", "audit", "treasury"] as const;
const pendingRows = new Set(["address", "chainId", "explorer", "dexRoute", "pool"]);

export default function VlmContractRegistryPanel({ compact = false }: { compact?: boolean } = {}) {
  const t = useTranslations("VlmContractRegistry");

  return (
    <section className={`${compact ? "rounded-none p-3" : "rounded-[2rem] p-5 md:p-6"} border border-white/[0.10] bg-white/[0.035]`}>
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.24em] text-velmere-gold/[0.80]">
            {t("kicker")}
          </p>
          <h2 className={`${compact ? "mt-2 text-xl" : "mt-3 text-3xl"} font-serif leading-tight tracking-[0.08em] text-white`}>{t("title")}</h2>
        </div>
        <span className="rounded-full border border-white/[0.10] px-3 py-2 font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-white/[0.44]">
          {t("badge")}
        </span>
      </div>

      <div className="mt-5 divide-y divide-white/[0.10]">
        {rows.map((row) => (
          <div key={row} className="grid gap-2 py-3 sm:grid-cols-[0.75fr_1.25fr] sm:items-center">
            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-white/[0.38]">
              {t(`rows.${row}.label`)}
            </p>
            <div className="flex items-center gap-3 sm:justify-end">
              <span
                className={`h-2 w-2 rounded-full ${pendingRows.has(row) ? "bg-white/[0.30]" : "bg-velmere-gold/[0.80]"}`}
                aria-hidden="true"
              />
              <p className="terminal-break break-all font-mono text-xs leading-6 text-white/[0.68] tabular-nums md:text-sm">{t(`rows.${row}.value`)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
