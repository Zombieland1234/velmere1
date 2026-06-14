"use client";

import { CheckCircle2, ShieldCheck, Truck, Wallet } from "lucide-react";
import { useLocale } from "next-intl";
import { Link } from "@/navigation";

function footerCopy(locale: string) {
  if (locale === "pl") {
    return {
      tagline: "Luxury streetwear z prywatną warstwą cyfrową.",
      micro: "Sklep z ubraniami, dostęp VLM i Square pozostają jasno oddzielone.",
      explore: "Eksploruj",
      legal: "Legal",
      trust: "Notatki zaufania",
      rights: "Wszelkie prawa zastrzeżone.",
      launch: "Dostawa, zwroty, prywatność i warunki pozostają dostępne bez szukania.",
      statusTitle: "Warstwa zaufania",
      statusItems: [
        "Commerce i wallet są oddzielone.",
        "Dostawa i zwroty mają być widoczne przed płatnością.",
        "Security jest wzmacniane warstwowo, nie marketingowo.",
      ],
      exploreLinks: [
        { href: "/shop", label: "Ubrania" },
        { href: "/vlm-token", label: "Dostęp VLM" },
        { href: "/research-lab", label: "Research Lab" },
        { href: "/security", label: "Security" },
        { href: "/square", label: "Velmère Square" },
        { href: "/lookbook", label: "Lookbook" },
        { href: "/community", label: "Community" },
        { href: "/faq", label: "FAQ" },
      ],
      legalLinks: [
        { href: "/impressum", label: "Impressum / dane sprzedawcy" },
        { href: "/privacy", label: "Polityka prywatności" },
        { href: "/terms", label: "Regulamin" },
        { href: "/returns", label: "Zwroty / prawo odstąpienia" },
        { href: "/shipping", label: "Dostawa" },
        { href: "/contact", label: "Kontakt" },
      ],
      microcopy: [
        "VLM otwiera prywatny dostęp do narzędzi, dropów i Research Lab.",
        "Nigdy nie wpisuj seed phrase.",
        "Ceny, podatki, koszty dostawy i prawa zwrotu są pokazywane przed checkoutem.",
        "Prawa konsumenta pozostają bez zmian.",
        "Security Velmère to warstwy ochrony i ciągłe wzmacnianie, nie obietnica braku ryzyka.",
      ],
    };
  }

  if (locale === "de") {
    return {
      tagline: "Luxury Streetwear mit privater digitaler Ebene.",
      micro: "Clothing Commerce, VLM Access und Square Community bleiben klar getrennt.",
      explore: "Entdecken",
      legal: "Rechtliches",
      trust: "Trust Notes",
      rights: "Alle Rechte vorbehalten.",
      launch: "Versand, Rückgabe, Datenschutz und Bedingungen bleiben leicht erreichbar.",
      statusTitle: "Trust Layer",
      statusItems: [
        "Commerce und Wallet bleiben getrennt.",
        "Versand und Rückgabe sollen vor Zahlung sichtbar sein.",
        "Security wird schichtweise gehärtet, nicht vermarktet.",
      ],
      exploreLinks: [
        { href: "/shop", label: "Kleidung" },
        { href: "/vlm-token", label: "VLM Access" },
        { href: "/research-lab", label: "Research Lab" },
        { href: "/security", label: "Security" },
        { href: "/square", label: "Velmère Square" },
        { href: "/lookbook", label: "Lookbook" },
        { href: "/community", label: "Community" },
        { href: "/faq", label: "FAQ" },
      ],
      legalLinks: [
        { href: "/impressum", label: "Impressum / Anbieterkennzeichnung" },
        { href: "/privacy", label: "Datenschutzerklärung" },
        { href: "/terms", label: "AGB" },
        { href: "/returns", label: "Rückgabe / Widerrufsrecht" },
        { href: "/shipping", label: "Versand" },
        { href: "/contact", label: "Kontakt" },
      ],
      microcopy: [
        "VLM öffnet privaten Zugang zu Tools, Drops und Research Lab.",
        "Gib niemals deine Seed Phrase ein.",
        "Preise, Steuern, Versandkosten und Rückgaberechte werden vor dem Checkout angezeigt.",
        "Verbraucherrechte bleiben unberührt.",
        "Velmère Security bedeutet Schutzschichten und kontinuierliche Härtung, kein risikofreies Versprechen.",
      ],
    };
  }

  return {
    tagline: "Luxury streetwear with a private digital layer.",
    micro: "Clothing commerce, VLM access and Square community features stay clearly separated.",
    explore: "Explore",
    legal: "Legal",
    trust: "Trust notes",
    rights: "All rights reserved.",
    launch: "Shipping, returns, privacy and terms stay easy to reach.",
    statusTitle: "Trust Layer",
    statusItems: [
      "Commerce and wallet flows stay separated.",
      "Shipping and returns should be visible before payment.",
      "Security is hardened in layers, not marketed as magic.",
    ],
    exploreLinks: [
      { href: "/shop", label: "Clothing" },
      { href: "/vlm-token", label: "VLM Access" },
      { href: "/research-lab", label: "Research Lab" },
      { href: "/square", label: "Velmère Square" },
      { href: "/lookbook", label: "Lookbook" },
      { href: "/community", label: "Community" },
      { href: "/faq", label: "FAQ" },
    ],
    legalLinks: [
      { href: "/impressum", label: "Impressum / Legal Notice" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms" },
      { href: "/returns", label: "Returns / Right of Withdrawal" },
      { href: "/shipping", label: "Shipping" },
      { href: "/contact", label: "Contact" },
    ],
    microcopy: [
      "VLM unlocks private access to tools, drops and Research Lab.",
      "Never enter your seed phrase.",
      "Prices, taxes, delivery costs and return rights are shown before checkout.",
      "Consumer rights remain unaffected.",
      "Velmère Security means layered protection and continuous hardening, not a risk-free promise.",
    ],
  };
}

export default function Footer() {
  const copy = footerCopy(useLocale());

  return (
    <footer className="velmere-footer relative border-t border-white/[0.10] bg-[#0B0B0D] text-velmere-ivory" data-pass2006-footer="solid-cards-no-row-link-chaos">
      <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 md:py-16 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.65fr_0.8fr_1fr]">
          <div>
            <Link href="/" className="inline-flex font-sans text-2xl font-semibold uppercase tracking-[0.22em] text-velmere-ivory md:text-3xl">
              VELMÈRE
            </Link>
            <p className="mt-5 max-w-md text-sm leading-7 text-velmere-grey-soft">
              {copy.tagline}
            </p>
            <p className="mt-4 max-w-md text-sm leading-7 text-velmere-muted">
              {copy.micro}
            </p>
            <div className="pass2006-footer-status velmere-surface-sheen velmere-readout-card mt-6 rounded-[1.5rem]" data-tone="cyan">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-velmere-gold">
                {copy.statusTitle}
              </p>
              <div className="mt-4 grid gap-3">
                {copy.statusItems.map((item, index) => {
                  const Icon =
                    index === 0 ? Wallet : index === 1 ? Truck : ShieldCheck;
                  return (
                    <div key={item} className="flex items-start gap-3">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-velmere-gold" />
                      <p className="text-sm leading-6 text-velmere-grey-soft">{item}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <p className="velmere-label text-velmere-gold">{copy.explore}</p>
            <ul className="mt-5 space-y-3">
              {copy.exploreLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="velmere-command-pill velmere-interaction-pulse w-full justify-start px-4 py-3 text-sm normal-case tracking-[0.08em] text-velmere-muted hover:text-velmere-ivory">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="velmere-label text-velmere-gold">{copy.legal}</p>
            <ul className="mt-5 space-y-3">
              {copy.legalLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="velmere-command-pill velmere-interaction-pulse w-full justify-start px-4 py-3 text-sm normal-case tracking-[0.08em] text-velmere-muted hover:text-velmere-ivory">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="velmere-label text-velmere-gold">{copy.trust}</p>
            <div className="mt-5 grid gap-3">
              {copy.microcopy.map((item) => (
                <div key={item} className="pass2006-footer-trust-card velmere-readout-card flex gap-3 text-xs leading-6 text-velmere-grey-soft">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-velmere-gold" />
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pass2006-footer-bottom mt-12 flex flex-col gap-4 border-t border-white/[0.10] pt-6 text-xs leading-6 text-velmere-muted md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Velmère. {copy.rights}</p>
          <p>{copy.launch}</p>
        </div>
      </div>
    </footer>
  );
}
