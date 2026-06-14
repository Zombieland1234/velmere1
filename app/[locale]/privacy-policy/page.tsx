import { notFound, redirect } from "next/navigation";
import { SUPPORTED_LOCALES } from "@/lib/seo/metadata";

export default async function PrivacyPolicyAliasPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!SUPPORTED_LOCALES.includes(locale as (typeof SUPPORTED_LOCALES)[number])) {
    notFound();
  }
  redirect(`/${locale}/privacy`);
}
