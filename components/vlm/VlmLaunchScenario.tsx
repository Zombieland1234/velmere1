import { useTranslations } from "next-intl";
import { SECTION_WIDE } from "@/lib/vlm/layout";

const groups = [
  { key: "core", items: ["name", "symbol", "network", "mvpChain", "supply", "minting"] },
  { key: "fees", items: ["buyTax", "sellTax", "transferTax", "maxBuyTax", "maxSellTax"] },
  { key: "liquidity", items: ["liquidity", "price", "status"] },
  { key: "safety", items: ["noBlacklist", "noHoneypot", "noSellLock", "noOwnerMint", "noCustomCrypto", "treasury"] },
] as const;

export default function VlmLaunchScenario() {
  const t = useTranslations("VlmLaunchScenario");

  return (
    <section className={`${SECTION_WIDE} scroll-mt-28 py-16 md:py-24`}>
      <div className="rounded-[2rem] border border-white/[0.10] bg-white/[0.035] p-6 md:p-10">
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
          <div>
            <p className="luxury-kicker text-velmere-gold/[0.80]">{t("kicker")}</p>
            <h2 className="mt-5 font-serif text-4xl leading-tight text-white md:text-5xl">{t("title")}</h2>
            <p className="mt-5 font-sans text-sm leading-7 text-white/[0.58]">{t("body")}</p>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {groups.map((group) => (
              <article key={group.key} className="rounded-3xl border border-white/[0.10] bg-black/[0.24] p-5 md:p-6">
                <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.24em] text-velmere-gold/[0.80]">
                  {t(`groups.${group.key}`)}
                </p>
                <div className="mt-5 divide-y divide-white/[0.10]">
                  {group.items.map((item) => {
                    const label = item in t.raw("items") ? t(`items.${item}.label`) : t(`safeguards.${item}`);
                    const value = item in t.raw("items") ? t(`items.${item}.value`) : t("planned");
                    return (
                      <div key={item} className="grid gap-2 py-3 sm:grid-cols-[0.9fr_1.1fr] sm:items-center">
                        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-white/[0.40]">
                          {label}
                        </p>
                        <p className="font-mono text-sm leading-6 text-[#F5F0E8] tabular-nums sm:text-right">
                          <span className="whitespace-nowrap">{value}</span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
