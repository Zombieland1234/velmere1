"use client";

import { useTranslations } from "next-intl";
import { getProductLaunchReadiness } from "@/lib/products/readiness";
import { getVisibleProducts } from "@/lib/products/catalog";

export default function ProductLaunchChecklist() {
  const t = useTranslations("ProductLaunchChecklist");
  const products = getVisibleProducts().slice(0, 6);

  return (
    <section className="rounded-[2rem] border border-white/[0.10] bg-white/[0.03] p-6 md:p-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#d4af37]">{t("kicker")}</p>
      <h2 className="mt-4 font-serif text-3xl text-white">{t("title")}</h2>
      <p className="mt-4 text-sm leading-7 text-white/[0.58]">{t("body")}</p>
      <ul className="mt-6 space-y-2 text-sm leading-6 text-white/[0.62]">
        {(t.raw("requirements") as string[]).map((item) => (
          <li key={item} className="flex gap-3">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#d4af37]" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
      {products.length > 0 ? (
        <div className="mt-8 space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/[0.40]">{t("sampleTitle")}</p>
          {products.map((product) => {
            const readiness = getProductLaunchReadiness(product);
            return (
              <div key={product.id} className="rounded-2xl border border-white/[0.10] bg-black/[0.24] p-4">
                <p className="font-semibold text-white">{product.slug}</p>
                <p className="mt-1 text-xs text-white/[0.48]">
                  {readiness.ready ? t("ready") : t("blocked", { count: readiness.reasons.length })}
                </p>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
