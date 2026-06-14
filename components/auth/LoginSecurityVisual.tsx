"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BadgeCheck, Binary, Fingerprint, KeyRound, LockKeyhole, ShieldCheck, WalletCards } from "lucide-react";
import { useLocale } from "next-intl";

const nodes = [
  [18, 28],
  [34, 62],
  [52, 38],
  [70, 24],
  [78, 66],
  [46, 78],
  [22, 72],
  [62, 52],
] as const;

const copy = {
  pl: {
    kicker: "Prywatny dostęp",
    subtitle: "Konto najpierw · portfel opcjonalnie · bez przechowywania środków",
    inspect: "Pokaż kolejną zasadę bezpieczeństwa",
    steps: [
      { key: "konto", title: "Oddzielone konto", body: "Logowanie do konta nie uruchamia portfela ani żadnego podpisu. Każdy krok pozostaje osobną, widoczną decyzją." },
      { key: "portfel", title: "Portfel tylko na żądanie", body: "Połączenie portfela jest opcjonalne i pojawia się dopiero przy funkcji, która naprawdę go potrzebuje." },
      { key: "zgoda", title: "Jasna nazwa działania", body: "Przed podpisem widzisz, czy chodzi o połączenie, potwierdzenie lub transakcję. Velmère nie prosi o seed phrase." },
    ],
  },
  de: {
    kicker: "Privater Zugang",
    subtitle: "Konto zuerst · Wallet optional · keine Verwahrung",
    inspect: "Nächste Sicherheitsregel anzeigen",
    steps: [
      { key: "konto", title: "Getrenntes Konto", body: "Die Anmeldung startet weder ein Wallet noch eine Signatur. Jeder Schritt bleibt eine eigene, sichtbare Entscheidung." },
      { key: "wallet", title: "Wallet nur auf Wunsch", body: "Die Wallet-Verbindung ist optional und erscheint erst bei einer Funktion, die sie wirklich benötigt." },
      { key: "freigabe", title: "Klare Aktionsbezeichnung", body: "Vor einer Signatur siehst du, ob es um Verbindung, Bestätigung oder Transaktion geht. Velmère fragt nie nach einer Seed Phrase." },
    ],
  },
  en: {
    kicker: "Private access",
    subtitle: "Account first · wallet optional · no custody",
    inspect: "Show the next security principle",
    steps: [
      { key: "account", title: "Separated account", body: "Signing in does not open a wallet or request a signature. Every step remains a separate, visible decision." },
      { key: "wallet", title: "Wallet only when requested", body: "Wallet connection is optional and appears only when a feature genuinely needs it." },
      { key: "consent", title: "Every action is named", body: "Before a signature, you see whether it is a connection, confirmation or transaction. Velmère never asks for a seed phrase." },
    ],
  },
} as const;

const securityPackets = [
  { icon: LockKeyhole, label: "session", from: [18, 28], to: [52, 38], delay: 0 },
  { icon: KeyRound, label: "key", from: [22, 72], to: [62, 52], delay: 0.45 },
  { icon: WalletCards, label: "wallet", from: [78, 66], to: [46, 78], delay: 0.9 },
] as const;

export default function LoginSecurityVisual() {
  const locale = useLocale() as keyof typeof copy;
  const t = copy[locale] ?? copy.en;
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const activeStep = t.steps[active] ?? t.steps[0];

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.10] bg-[#0B0B0D] p-6 shadow-velmere-card md:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_36%,rgba(212,175,55,0.15),transparent_30%),linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.028)_1px,transparent_1px)] bg-[length:auto,42px_42px,42px_42px]" />
      <div className="relative z-[1] flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-full border border-velmere-gold/[0.25] bg-velmere-gold/[0.10] text-velmere-gold">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <p className="velmere-label text-velmere-gold">{t.kicker}</p>
          <p className="mt-1 text-xs leading-5 text-white/[0.46]">{t.subtitle}</p>
        </div>
      </div>

      <div className="relative z-[1] mt-8 h-72 overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-black/[0.18]">
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
          <path
            d="M18 28 L52 38 L70 24 L78 66 L46 78 L22 72 L34 62 L18 28 M52 38 L62 52 L78 66 M34 62 L52 38"
            fill="none"
            stroke="rgba(245,240,232,0.18)"
            strokeWidth="0.35"
            strokeDasharray="2 3"
            className={reduced ? undefined : "velmere-dash-flow-slow"}
          />
          <path
            d="M22 72 C40 32, 60 86, 78 66 C60 26, 34 62, 70 24"
            fill="none"
            stroke="rgba(212,175,55,0.42)"
            strokeWidth="0.45"
            strokeDasharray="2 4"
            className={reduced ? undefined : "velmere-dash-flow"}
          />
        </svg>
        {nodes.map(([left, top], index) => (
          <motion.span
            key={`${left}-${top}`}
            className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-velmere-gold/[0.30] bg-velmere-gold shadow-[0_0_28px_rgba(212,175,55,0.55)]"
            style={{ left: `${left}%`, top: `${top}%` }}
            animate={reduced ? undefined : { scale: [0.72, 1.22, 0.72], opacity: [0.35, 1, 0.35] }}
            transition={{ repeat: 999999, duration: 2.4, delay: index * 0.12, ease: "easeInOut" }}
          />
        ))}
        {securityPackets.map((packet) => {
          const Icon = packet.icon;
          return (
            <motion.span
              key={packet.label}
              aria-hidden="true"
              className="absolute grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-velmere-gold/[0.25] bg-black/[0.70] text-velmere-gold shadow-[0_0_30px_rgba(212,175,55,0.28)] backdrop-blur"
              style={{ left: `${packet.from[0]}%`, top: `${packet.from[1]}%` }}
              animate={reduced ? undefined : { left: [`${packet.from[0]}%`, `${packet.to[0]}%`, `${packet.from[0]}%`], top: [`${packet.from[1]}%`, `${packet.to[1]}%`, `${packet.from[1]}%`], opacity: [0.34, 1, 0.34] }}
              transition={{ repeat: 999999, duration: 4.8, delay: packet.delay, ease: "easeInOut" }}
            >
              <Icon className="h-3.5 w-3.5" />
            </motion.span>
          );
        })}
        <motion.button
          type="button"
          onClick={() => setActive((current) => (current + 1) % t.steps.length)}
          className="absolute left-1/2 top-1/2 grid h-24 w-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-velmere-gold/[0.35] bg-black/[0.70] text-velmere-gold shadow-[0_0_70px_rgba(212,175,55,0.24)] outline-none transition hover:border-velmere-gold/[0.55] active:scale-95"
          animate={reduced ? undefined : { rotate: [0, 6, -4, 0], scale: [1, 1.035, 1] }}
          transition={{ repeat: 999999, duration: 5.2, ease: "easeInOut" }}
          aria-label={t.inspect}
        >
          <Fingerprint className="h-8 w-8" />
        </motion.button>
      </div>

      <div className="relative z-[1] mt-4 grid gap-3 sm:grid-cols-3">
        {t.steps.map((step, index) => (
          <button
            type="button"
            key={step.key}
            onClick={() => setActive(index)}
            className={`rounded-2xl border px-4 py-3 text-left transition active:scale-[0.98] ${active === index ? "border-velmere-gold/[0.30] bg-velmere-gold/[0.08]" : "border-white/[0.10] bg-white/[0.025] hover:border-white/[0.18]"}`}
          >
            <div className="flex items-center gap-2">
              {index === 0 ? <Binary className="h-3.5 w-3.5 text-velmere-gold" /> : <BadgeCheck className="h-3.5 w-3.5 text-velmere-gold" />}
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/[0.38]">{step.key}</p>
            </div>
            <p className="mt-2 text-xs text-white/[0.62]">{step.title}</p>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep.key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-[1] mt-4 rounded-2xl border border-velmere-gold/[0.18] bg-velmere-gold/[0.07] p-4"
        >
          <div className="flex items-start gap-3">
            <LockKeyhole className="mt-1 h-4 w-4 shrink-0 text-velmere-gold" />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-velmere-gold">{activeStep.title}</p>
              <p className="mt-2 text-xs leading-6 text-white/[0.58]">{activeStep.body}</p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
