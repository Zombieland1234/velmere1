import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import LuxurySection from "@/components/layout/LuxurySection";
import { Link } from "@/navigation";
import { buildVelmereMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildVelmereMetadata({
    locale,
    path: "/community",
    title: "Community — Velmère",
    description: "Velmère community hub for Square, waitlist, lookbook and optional VLM access features.",
  });
}

export default async function CommunityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isPl = locale === "pl";
  const isDe = locale === "de";
  const title = isPl ? "Społeczność bez chaosu." : isDe ? "Community ohne Chaos." : "Community without noise.";
  const body = isPl
    ? "Square, lista oczekujących i przyszłe benefity VLM są rozdzielone od podstawowego sklepu, żeby klient nie musiał rozumieć Web3 przed obejrzeniem produktu."
    : isDe
      ? "Square, Warteliste und künftige VLM-Vorteile bleiben vom normalen Shop getrennt, damit Kundinnen und Kunden kein Web3 verstehen müssen, bevor sie Produkte sehen."
      : "Square, waitlist and future VLM perks stay separated from basic commerce so customers do not need to understand Web3 before viewing products.";
  const kicker = isPl ? "COMMUNITY / VELMÈRE" : isDe ? "COMMUNITY / VELMÈRE" : "COMMUNITY / VELMÈRE";
  const cards = [
    {
      href: "/square",
      title: "Velmère Square",
      body: isPl
        ? "Posty, komentarze i sygnały społeczności."
        : isDe
          ? "Posts, Kommentare und Community-Signale."
          : "Posts, comments and community signals.",
    },
    {
      href: "/contact",
      title: isPl ? "Lista oczekujących" : isDe ? "Warteliste" : "Waitlist",
      body: isPl
        ? "Prośba o dostęp do dropu i kontaktu."
        : isDe
          ? "Anfrage für Drop-Zugang und Kontakt."
          : "Drop access request and contact.",
    },
    {
      href: "/vlm-token",
      title: "VLM",
      body: isPl
        ? "Prywatny dostęp do narzędzi, dropów i Research Lab."
        : isDe
          ? "Privater Zugang zu Tools, Drops und Research Lab."
          : "Private access to tools, drops and Research Lab.",
    },
  ];

  return (
    <main className="min-h-[100dvh] bg-velmere-black text-white" data-pass315-public-surface-trim="community" data-pass317-public-launch-surface="community" data-pass318-public-storefront-focus="community" data-pass2010-community="cardless-directory-cyan-focus-low-motion">
      <LuxurySection className="py-28 md:py-36">
        <p className="luxury-kicker text-velmere-gold/[0.80]">{kicker}</p>
        <h1 className="mt-6 max-w-4xl font-serif text-5xl leading-tight md:text-7xl">{title}</h1>
        <p className="mt-6 max-w-3xl text-sm leading-7 text-white/[0.60] md:text-base">{body}</p>
        <div className="pass2010-community-links mt-12 border-y border-white/[0.10]">
          {cards.map((item) => (
            <Link key={item.href} href={item.href} className="pass2010-community-link group grid gap-3 border-b border-white/[0.08] py-7 transition-colors last:border-b-0 md:grid-cols-[minmax(0,0.75fr)_minmax(0,1fr)_auto] md:items-center md:gap-8">
              <h2 className="font-serif text-2xl text-white md:text-3xl">{item.title}</h2>
              <p className="max-w-xl text-sm leading-7 text-white/[0.58]">{item.body}</p>
              <ArrowUpRight className="h-5 w-5 text-cyan-200/[0.55] transition-transform duration-200 group-hover:translate-x-1 group-hover:-translate-y-1" />
            </Link>
          ))}
        </div>
      </LuxurySection>
    </main>
  );
}
