import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/navigation";
import LuxurySection from "@/components/layout/LuxurySection";

const LOOKS = [
  {
    key: "form",
    image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=1400&auto=format&fit=crop&sat=-100&contrast=20",
    className: "md:col-span-2 xl:col-span-2",
  },
  {
    key: "weight",
    image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=1200&auto=format&fit=crop&sat=-100&contrast=22",
    className: "",
  },
  {
    key: "line",
    image: "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?q=80&w=1200&auto=format&fit=crop&sat=-100&contrast=20",
    className: "",
  },
  {
    key: "silence",
    image: "https://images.unsplash.com/photo-1520975954732-35dd22299614?q=80&w=1400&auto=format&fit=crop&sat=-100&contrast=20",
    className: "md:col-span-2 xl:col-span-2",
  },
];

export default async function LookbookPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Lookbook" });

  return (
    <main className="min-h-[100dvh] bg-velmere-black text-white" data-pass2008-lookbook="editorial-grid-overlay-captions">
      <LuxurySection className="py-24 md:py-32">
        <div className="mb-10 grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="max-w-3xl lg:col-span-8">
            <p className="luxury-kicker text-velmere-gold/[0.80]">{t("kicker")}</p>
            <h1 className="mt-5 max-w-3xl font-serif text-5xl leading-[0.95] text-white md:text-6xl">{t("title")}</h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/[0.56]">{t("intro")}</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {LOOKS.map((look, index) => (
            <article key={look.key} className={`pass2008-look group relative overflow-hidden bg-[#090b0e] ${look.className}`}>
              <div className={`relative ${look.className ? "aspect-[16/10]" : "aspect-[4/5]"}`}>
                <Image
                  src={look.image}
                  alt={t("imageAlt", { number: index + 1 })}
                  fill
                  priority={index === 0}
                  sizes={look.className ? "(min-width: 1280px) 50vw, 100vw" : "(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"}
                  className="object-cover grayscale contrast-125 transition-transform duration-500 group-hover:scale-[1.018]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/[0.82] via-black/[0.08] to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
                  <p className="font-mono text-[9px] uppercase tracking-[0.20em] text-cyan-100/[0.70]">
                    {t(`looks.${look.key}.label`)}
                  </p>
                  <p className="mt-2 max-w-lg text-xs leading-6 text-white/[0.70]">{t(`looks.${look.key}.body`)}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/shop"
            className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#F5F0E8] px-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-black transition-colors hover:bg-white"
          >
            {t("shopCta")}
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/archive"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/[0.15] px-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#F5F0E8] transition-colors hover:bg-white/[0.06]"
          >
            {t("archiveCta")}
          </Link>
        </div>
      </LuxurySection>
    </main>
  );
}
