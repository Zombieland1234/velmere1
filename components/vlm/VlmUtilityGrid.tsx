"use client";

import { Archive, Clock, Crown, FlaskConical, Shirt, Users } from "lucide-react";
import { useTranslations } from "next-intl";

const items = [
  { key: "privateDrops", icon: Shirt },
  { key: "archive", icon: Archive },
  { key: "privileges", icon: Crown },
  { key: "voice", icon: Users },
  { key: "earlyAccess", icon: Clock },
  { key: "communityLayer", icon: FlaskConical },
] as const;

export default function VlmUtilityGrid() {
  const t = useTranslations("VlmUtility");

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map(({ key, icon: Icon }) => (
        <article key={key} className="rounded-2xl border border-white/[0.10] bg-white/[0.04] p-6">
          <Icon className="h-5 w-5 text-velmere-gold" aria-hidden="true" />
          <h3 className="mt-5 font-sans text-xl font-semibold leading-tight text-white">{t(`${key}.title`)}</h3>
          <p className="mt-4 text-sm leading-7 text-white/[0.56]">{t(`${key}.body`)}</p>
        </article>
      ))}
    </section>
  );
}
