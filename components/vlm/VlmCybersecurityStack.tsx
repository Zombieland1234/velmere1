import { AlertTriangle, Eye, KeyRound, LockKeyhole, ScanSearch, ShieldCheck, Siren, TestTube2 } from "lucide-react";
import { useTranslations } from "next-intl";
import SecurityReadinessConsole from "@/components/vlm/SecurityReadinessConsole";

const stack = [
  { key: "custody", icon: KeyRound },
  { key: "standard", icon: ShieldCheck },
  { key: "accessControl", icon: LockKeyhole },
  { key: "testnet", icon: TestTube2 },
  { key: "staticAnalysis", icon: ScanSearch },
  { key: "audit", icon: AlertTriangle },
  { key: "monitoring", icon: Eye },
  { key: "incident", icon: Siren },
] as const;

const visualItems = ["amu", "prime", "bajak", "genesis", "formula"] as const;
const realItems = ["openzeppelin", "fixedSupply", "noOwnerMint", "multisig", "testnet", "staticAnalysis", "audit"] as const;

export default function VlmCybersecurityStack() {
  const t = useTranslations("CybersecurityStack");

  return (
    <section className="mx-auto w-full max-w-6xl scroll-mt-28 px-6 py-12 md:px-12 md:py-16">
      <div className="rounded-[2rem] border border-white/[0.10] bg-[#111111] p-6 md:p-10">
        <div className="max-w-4xl">
          <p className="luxury-kicker text-velmere-gold/[0.80]">{t("kicker")}</p>
          <h2 className="mt-5 font-serif text-4xl leading-tight text-white md:text-5xl">{t("title")}</h2>
          <p className="mt-5 font-sans text-sm leading-7 text-white/[0.58]">{t("body")}</p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <article className="rounded-3xl border border-white/[0.10] bg-black/[0.24] p-5 md:p-6">
            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.24em] text-white/[0.42]">
              {t("visualLayer.title")}
            </p>
            <p className="mt-3 font-sans text-sm leading-7 text-white/[0.56]">{t("visualLayer.body")}</p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {visualItems.map((item) => (
                <div key={item} className="rounded-2xl border border-white/[0.10] bg-white/[0.035] p-4">
                  <p className="font-sans text-xs font-semibold uppercase tracking-[0.16em] text-white/[0.70]">
                    {t(`visualLayer.items.${item}`)}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-velmere-gold/[0.20] bg-velmere-gold/[0.055] p-5 md:p-6">
            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.24em] text-velmere-gold">
              {t("realLayer.title")}
            </p>
            <p className="mt-3 font-sans text-sm leading-7 text-white/[0.62]">{t("realLayer.body")}</p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {realItems.map((item) => (
                <div key={item} className="rounded-2xl border border-white/[0.10] bg-black/[0.20] p-4">
                  <p className="font-sans text-xs font-semibold uppercase tracking-[0.16em] text-white/[0.72]">
                    {t(`realLayer.items.${item}`)}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </div>

        <SecurityReadinessConsole />

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stack.map(({ key, icon: Icon }) => (
            <article key={key} className="rounded-2xl border border-white/[0.10] bg-black/[0.24] p-5">
              <Icon className="h-5 w-5 text-velmere-gold" aria-hidden="true" />
              <p className="mt-5 font-sans text-sm font-semibold uppercase tracking-[0.16em] text-white">
                {t(`cards.${key}.title`)}
              </p>
              <p className="mt-3 font-sans text-xs leading-6 text-white/[0.50]">{t(`cards.${key}.body`)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
