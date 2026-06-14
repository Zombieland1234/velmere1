import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { SUPPORTED_LOCALES } from "@/lib/seo/metadata";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function CollectionAliasPage({ params }: PageProps) {
  const { locale } = await params;
  if (!SUPPORTED_LOCALES.includes(locale as (typeof SUPPORTED_LOCALES)[number])) {
    notFound();
  }
  setRequestLocale(locale);
  redirect(`/${locale}/shop`);
}
