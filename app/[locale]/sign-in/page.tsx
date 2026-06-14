import { redirect } from "next/navigation";
import { SUPPORTED_LOCALES } from "@/lib/seo/metadata";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const safeLocale = SUPPORTED_LOCALES.includes(locale as (typeof SUPPORTED_LOCALES)[number]) ? locale : "pl";
  redirect(`/${safeLocale}/login`);
}
