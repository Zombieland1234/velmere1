import { getTranslations } from "next-intl/server";
import { Link } from "@/navigation";
import VlmFaq from "@/components/vlm/VlmFaq";

export default async function VlmTokenFaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "VlmPublic.faqLink" });

  return (
    <main className="min-h-[100dvh] bg-black text-[#FFFFF0]">
      <section className="mx-auto max-w-5xl px-6 py-24 md:px-12 md:py-32">
        <Link
          href="/vlm-token"
          className="inline-flex min-h-11 items-center rounded-full border border-white/[0.14] px-5 font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-white/[0.58] transition-colors hover:border-white/[0.28] hover:text-white"
        >
          {t("back")}
        </Link>
        <div className="mt-10">
          <VlmFaq />
        </div>
      </section>
    </main>
  );
}
