"use client";

import { FileWarning, Globe2, Landmark, LockKeyhole, Scale, ShieldCheck, WalletCards } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const cards = [
  { key: "contract", icon: LockKeyhole, tone: "locked" },
  { key: "audit", icon: FileWarning, tone: "warning" },
  { key: "networks", icon: Globe2, tone: "neutral" },
  { key: "launch", icon: Landmark, tone: "warning" },
  { key: "wallet", icon: WalletCards, tone: "neutral" },
  { key: "treasury", icon: ShieldCheck, tone: "warning" },
  { key: "legal", icon: Scale, tone: "locked" },
] as const;

const toneClasses = {
  locked: "border-white/[0.10] bg-white/[0.035]",
  warning: "border-velmere-gold/[0.25] bg-velmere-gold/[0.055]",
  neutral: "border-white/[0.10] bg-white/[0.03]",
} as const;

export default function VlmStatusGrid() {
  const t = useTranslations("VlmStatus");

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map(({ key, icon: Icon, tone }) => (
        <article key={key} className={cn("rounded-2xl border p-6", toneClasses[tone])}>
          <div className="flex min-h-[128px] items-start justify-between gap-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/[0.42]">
                {t(`${key}.label`)}
              </p>
              <p className="mt-4 text-sm leading-6 text-white/[0.74]">{t(`${key}.value`)}</p>
              <span className="mt-5 inline-flex min-h-8 items-center rounded-full border border-white/[0.10] px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/[0.48]">
                {t(`${key}.chip`)}
              </span>
            </div>
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.10] bg-black/[0.18]">
              <Icon className="h-4 w-4 text-velmere-gold" aria-hidden="true" />
            </span>
          </div>
        </article>
      ))}
    </section>
  );
}
