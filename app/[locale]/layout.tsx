import type { Metadata } from "next";
import AngelTeaser from "@/components/angel/AngelTeaser";
import { CartProvider } from "@/components/CartProvider";
import CartDrawer from "@/components/CartDrawer";
import CookieConsent from "@/components/CookieConsent";
import Footer from "@/components/Footer";
import CommandPalette from "@/components/ui/CommandPalette";
import FloatingMailWidget from "@/components/contact/FloatingMailWidget";
import Navbar from "@/components/Navbar";
import PageTransition from "@/components/PageTransition";
import Web3Provider from "@/components/wallet/Web3Provider";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { buildVelmereMetadata, SUPPORTED_LOCALES } from "@/lib/seo/metadata";

const LOCALES = SUPPORTED_LOCALES;

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildVelmereMetadata({
    locale,
    title: "Velmère — Luxury Streetwear",
    description: "Limited drops, a restrained lookbook, and VLM access in a dark luxury aesthetic.",
  });
}

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!LOCALES.includes(locale as (typeof LOCALES)[number])) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Web3Provider>
        <CartProvider>
          <Navbar />
          <div id="main-content" tabIndex={-1}><PageTransition>{children}</PageTransition></div>
          <Footer />
          <CookieConsent />
          <CartDrawer />
          <AngelTeaser />
          <FloatingMailWidget />
          <CommandPalette />
        </CartProvider>
      </Web3Provider>
    </NextIntlClientProvider>
  );
}
