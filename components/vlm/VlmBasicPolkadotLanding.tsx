"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Instagram, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import { useLocale } from "next-intl";
import { Link } from "@/navigation";

const pillarIcons = [ShieldCheck, WalletCards, Sparkles] as const;

function TwitterBirdIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M21.54 6.08c.02.22.02.43.02.65 0 6.62-5.04 14.25-14.25 14.25-2.84 0-5.47-.82-7.68-2.24.4.05.79.07 1.21.07 2.35 0 4.51-.79 6.22-2.13a5.02 5.02 0 0 1-4.68-3.48c.31.05.62.09.96.09.45 0 .91-.07 1.33-.17A5.01 5.01 0 0 1 .65 8.2v-.07c.67.38 1.45.6 2.27.62A5 5 0 0 1 .69 4.58c0-.93.24-1.78.67-2.53a14.22 14.22 0 0 0 10.33 5.24 5.65 5.65 0 0 1-.12-1.15 5.01 5.01 0 0 1 8.66-3.43 9.84 9.84 0 0 0 3.18-1.21 4.99 4.99 0 0 1-2.2 2.76 10.04 10.04 0 0 0 2.88-.77 10.76 10.76 0 0 1-2.55 2.59Z" />
    </svg>
  );
}

const copy = {
  en: {
    eyebrow: "VLM Basic / quiet access layer",
    title: "Velmère Basic",
    subtitle: "Luxury streetwear with a private digital layer.",
    body: "Basic keeps the interface calm: product, access and ownership without terminal overload. Read the store, follow drops and keep wallet actions optional.",
    ctaCollection: "Explore collection",
    ctaVlm: "Read VLM",
    powered: "Powered by Web3 — read-only by default — no seed phrases",
    pillars: [
      ["Honest by design", "Access rules stay visible. Nothing important is hidden in fine print."],
      ["You own it", "The store remains product-first. Wallets are optional and never custody-based."],
      ["Built for humans", "Quiet typography, clear actions and no fake investment language."],
    ],
    social: "Stay updated",
    instagram: "Instagram",
    x: "X / Twitter",
  },
  pl: {
    eyebrow: "VLM Basic / spokojna warstwa dostępu",
    title: "Velmère Basic",
    subtitle: "Luksusowy streetwear z prywatną warstwą cyfrową.",
    body: "Basic uspokaja interfejs: produkt, dostęp i własność bez przeciążenia terminalem. Czytasz sklep, śledzisz dropy, a portfel zostaje opcjonalny.",
    ctaCollection: "Otwórz kolekcję",
    ctaVlm: "Czytaj VLM",
    powered: "Powered by Web3 — domyślnie read-only — bez seed phrase",
    pillars: [
      ["Uczciwe z założenia", "Zasady dostępu są widoczne. Nic ważnego nie znika w drobnym druku."],
      ["To zostaje Twoje", "Sklep pozostaje product-first. Portfele są opcjonalne i bez custody."],
      ["Zbudowane dla ludzi", "Cicha typografia, jasne akcje i zero języka obietnicy zysku."],
    ],
    social: "Bądź na bieżąco",
    instagram: "Instagram",
    x: "X / Twitter",
  },
  de: {
    eyebrow: "VLM Basic / ruhige Access-Ebene",
    title: "Velmère Basic",
    subtitle: "Luxury Streetwear mit privater digitaler Ebene.",
    body: "Basic hält das Interface ruhig: Produkt, Zugang und Ownership ohne Terminal-Überladung. Store lesen, Drops verfolgen, Wallet optional halten.",
    ctaCollection: "Kollektion öffnen",
    ctaVlm: "VLM lesen",
    powered: "Powered by Web3 — standardmäßig read-only — keine Seed Phrase",
    pillars: [
      ["Ehrlich by design", "Access-Regeln bleiben sichtbar. Nichts Wichtiges verschwindet im Kleingedruckten."],
      ["Du besitzt es", "Der Store bleibt produktzentriert. Wallets sind optional und ohne Custody."],
      ["Für Menschen gebaut", "Ruhige Typografie, klare Aktionen und keine Investment-Sprache."],
    ],
    social: "Auf dem Laufenden bleiben",
    instagram: "Instagram",
    x: "X / Twitter",
  },
} as const;

function Web3Roller({ text }: { text: string }) {
  const reduced = useReducedMotion();
  return (
    <div className="mx-auto mt-10 w-full max-w-3xl overflow-hidden rounded-full border border-white/[0.10] bg-white/[0.035] px-4 py-3">
      <motion.div
        className="flex whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.22em] text-white/[0.40]"
        animate={reduced ? undefined : { x: ["0%", "-50%"] }}
        transition={{ repeat: 999999, duration: 18, ease: "linear" }}
      >
        {[0, 1].map((item) => (
          <span key={item} className="pr-12">
            {text}{" /// VLM ACCESS /// WALLET SAFETY /// PRIVATE DROPS ///"}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

export default function VlmBasicPolkadotLanding() {
  const locale = useLocale() as keyof typeof copy;
  const t = copy[locale] ?? copy.en;
  const reduced = useReducedMotion();

  return (
    <section className="relative min-h-[calc(100dvh-5rem)] overflow-hidden pt-28 text-center md:pt-32">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.045),transparent_30%),radial-gradient(circle_at_50%_44%,rgba(212,175,55,0.08),transparent_34%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:radial-gradient(circle_at_center,white_0.7px,transparent_0.8px)] [background-size:6px_6px]" />
      <div className="relative z-[1] mx-auto flex min-h-[calc(100dvh-10rem)] max-w-[1180px] flex-col px-4 sm:px-6 lg:px-8">
        <div className="flex flex-1 flex-col items-center justify-center py-16">
          <motion.p
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={reduced ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="font-mono text-[10px] font-black uppercase tracking-[0.28em] text-velmere-gold"
          >
            {t.eyebrow}
          </motion.p>
          <motion.h1
            initial={reduced ? false : { opacity: 0, y: 18, filter: "blur(10px)" }}
            animate={reduced ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
            className="mt-7 font-serif text-[clamp(4rem,11vw,10rem)] leading-[0.88] tracking-[-0.07em] text-[#F5F0E8]"
          >
            {t.title}
          </motion.h1>
          <p className="mt-7 max-w-2xl text-xl leading-8 text-white/[0.74] md:text-2xl">
            {t.subtitle}
          </p>
          <p className="mt-5 max-w-3xl text-sm leading-8 text-white/[0.50] md:text-base">
            {t.body}
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/shop" className="velmere-button-primary min-w-[13rem]">
              {t.ctaCollection}
            </Link>
            <a href="#what-is-vlm" className="velmere-button-secondary min-w-[12rem]">
              {t.ctaVlm}
            </a>
          </div>
          <Web3Roller text={t.powered} />
        </div>

        <div className="grid gap-5 border-t border-white/[0.10] pb-14 pt-10 text-left md:grid-cols-3">
          {t.pillars.map(([title, body], index) => {
            const Icon = pillarIcons[index] ?? ShieldCheck;
            return (
              <motion.article
                key={title}
                initial={reduced ? false : { opacity: 0, y: 18 }}
                whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-[1.35rem] border border-white/[0.08] bg-white/[0.028] p-5"
              >
                <Icon className="h-4 w-4 text-velmere-gold" />
                <h2 className="mt-5 font-serif text-2xl leading-tight text-white">{title}</h2>
                <p className="mt-3 text-sm leading-7 text-white/[0.50]">{body}</p>
              </motion.article>
            );
          })}
        </div>

        <div className="flex flex-col items-center justify-center gap-3 border-t border-white/[0.10] py-8 sm:flex-row">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/[0.30] sm:mr-3">{t.social}</p>
          <a
            href="https://www.instagram.com/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-12 min-w-[12rem] items-center justify-center gap-3 rounded-full border border-white/[0.10] bg-white/[0.035] px-5 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-white/[0.70] transition hover:border-velmere-gold/[0.30] hover:text-velmere-gold active:scale-95"
          >
            <Instagram className="h-4 w-4" /> {t.instagram}
          </a>
          <a
            href="https://x.com/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-12 min-w-[12rem] items-center justify-center gap-3 rounded-full border border-white/[0.10] bg-white/[0.035] px-5 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-white/[0.70] transition hover:border-velmere-gold/[0.30] hover:text-velmere-gold active:scale-95"
          >
            <TwitterBirdIcon className="h-4 w-4" /> {t.x}
          </a>
        </div>
      </div>
    </section>
  );
}
