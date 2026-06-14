import type { Metadata } from "next";
import VelmereSquareClient from "@/components/square/VelmereSquareClient";
import { buildVelmereMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const description = locale === "pl"
    ? "Publicznie czytelna przestrzeń Velmère; publikowanie i prywatne funkcje wymagają dostępu."
    : locale === "de"
      ? "Öffentlich lesbarer Velmère Space; Veröffentlichen und private Funktionen erfordern Zugang."
      : "A public-readable Velmère space; publishing and private features require access.";
  return buildVelmereMetadata({
    locale,
    path: "/square",
    title: "Velmère Square",
    description,
  });
}

export default async function SquarePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <>
      <VelmereSquareClient publicTrim="pass315" />
    </>
  );
}
