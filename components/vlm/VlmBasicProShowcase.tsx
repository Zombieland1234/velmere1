"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CircleDot, Cpu, Eye, KeyRound, LockKeyhole, Network, Orbit, Radar, ShieldCheck, WalletCards, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useModeStore } from "@/store/useModeStore";

const proExplanation = {
  en: [
    ["Möbius routing", "One calm access loop: product → drop signal → archive context → Square thread. It is navigation, not a financial promise."],
    ["AMU baseline", "AMU 3162.27 is the visual metronome: pulse, spacing and node rhythm. It is symbolic until a reviewed technical use exists."],
    ["Bajak Protocol", "The Bajak layer is treated as numerical-audit lore and research identity, not a theorem, not a certificate and not financial advice."],
    ["Named action → signature", "Every wallet prompt must first name the action: connect, sign, approve or send. No hidden approvals."],
    ["Signal engine", "The dots represent UI checks: wallet route, contract status, audit queue and moderation readiness — not random decoration."],
    ["Velmère Shield", "Pro connects to Market Integrity Radar: velocity, liquidity, order book and contract-risk signals. It is a cyber/RegTech warning layer, not a trading instruction."],
  ],
  pl: [
    ["Routing Möbiusa", "Jedna spokojna pętla dostępu: produkt → sygnał dropu → kontekst archiwum → wątek Square. To nawigacja, nie obietnica finansowa."],
    ["AMU baseline", "AMU 3162.27 to wizualny metronom: puls, odstępy i rytm nodów. Symbolika, dopóki nie ma sprawdzonego użycia technicznego."],
    ["Protokół Bajaka", "Warstwa Bajaka jest tutaj lore/audytem numerycznym i tożsamością research, nie twierdzeniem, nie gwarancją i nie poradą finansową."],
    ["Nazwa akcji → podpis", "Każdy prompt portfela najpierw nazywa akcję: connect, sign, approve albo send. Zero ukrytych approvali."],
    ["Silnik sygnału", "Kropki oznaczają realne checki UI: ścieżkę portfela, status kontraktu, kolejkę audytu i gotowość moderacji — nie losową dekorację."],
    ["Velmère Shield", "Pro łączy się z radarem Market Integrity: velocity, płynność, order book i ryzyko kontraktu. To warstwa cyber/RegTech ostrzegania, nie gwarancja tradingowa."],
  ],
  de: [
    ["Möbius Routing", "Eine ruhige Access-Schleife: Produkt → Drop-Signal → Archivkontext → Square-Thread. Navigation, keine Finanzzusage."],
    ["AMU Baseline", "AMU 3162.27 ist ein visueller Taktgeber für Puls, Abstände und Node-Rhythmus. Symbolisch bis zur geprüften technischen Nutzung."],
    ["Bajak Protocol", "Die Bajak-Ebene bleibt Numerical-Audit-Lore und Research-Identität, kein Theorem, keine Garantie und keine Finanzberatung."],
    ["Aktion benennen → Signatur", "Jeder Wallet-Prompt nennt zuerst die Aktion: connect, sign, approve oder send. Keine versteckten Approvals."],
    ["Signal Engine", "Die Punkte zeigen UI-Checks: Wallet-Route, Contract-Status, Audit-Queue und Moderation — keine zufällige Dekoration."],
    ["Velmère Shield", "Pro verbindet sich mit Market Integrity Radar: Velocity, Liquidität, Order Book und Contract-Risiko. Eine Cyber/RegTech-Warnschicht, keine Trading-Garantie."],
  ],
} as const;

const basicItems = ["one", "two", "three"] as const;
const proItems = ["orbit", "wallet", "security", "lp", "registry", "cyber", "amu", "moderation", "concierge", "signals", "vault", "forensics"] as const;
const amuControls = [
  { label: "AMU", value: "3162.2776", width: 78 },
  { label: "ρ", value: "1.3247", width: 58 },
  { label: "WALLET", value: "READ", width: 66 },
  { label: "SIGNAL", value: "ACCESS", width: 72 },
] as const;

const signalNodes = [
  { label: "EVM", x: "18%", y: "58%", state: "planned" },
  { label: "Wallet", x: "36%", y: "35%", state: "read-only" },
  { label: "AMU", x: "50%", y: "50%", state: "baseline" },
  { label: "Audit", x: "68%", y: "34%", state: "required" },
  { label: "Legal", x: "78%", y: "64%", state: "review" },
] as const;

const signalChecks = [
  ["wallet read", "public address only", 66],
  ["contract", "not deployed", 38],
  ["audit", "required", 28],
  ["moderation", "manual queue", 74],
] as const;

const modeOverview = {
  en: [
    ["Why it exists", "To explain the access layer in plain language before anyone sees a wallet prompt."],
    ["Who it is for", "People exploring VLM, private drops and Shield without opening the advanced workspace."],
    ["What it should feel like", "Premium, readable and controlled. More briefing room than crypto dashboard."],
  ],
  pl: [
    ["Po co to jest", "Żeby wyjaśnić warstwę dostępu prostym językiem, zanim ktokolwiek zobaczy prompt portfela."],
    ["Dla kogo to jest", "Dla osób, które chcą zrozumieć VLM, prywatne dropy i Shield bez otwierania zaawansowanej przestrzeni."],
    ["Jak ma się czuć", "Premium, czytelnie i pod kontrolą. Bardziej pokój briefingowy niż krypto dashboard."],
  ],
  de: [
    ["Wozu es da ist", "Um die Access-Ebene in klarer Sprache zu erklären, bevor jemand einen Wallet-Prompt sieht."],
    ["Für wen es ist", "Für Menschen, die VLM, private Drops und Shield verstehen wollen, ohne den erweiterten Workspace zu öffnen."],
    ["Wie es wirken soll", "Premium, lesbar und kontrolliert. Eher Briefing Room als Crypto Dashboard."],
  ],
} as const;

function BasicCard({ reducedMotion }: { reducedMotion: boolean }) {
  const t = useTranslations("VlmBasicPro");
  return (
    <motion.article
      key="basic"
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.99 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="relative mx-auto w-full max-w-none overflow-hidden rounded-[1.45rem] border border-black/[0.10] bg-[#F5F0E8] p-4 text-left text-black sm:rounded-[2rem] sm:p-5 shadow-[0_24px_90px_rgba(0,0,0,0.22)] md:p-8 lg:text-left xl:p-10"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_84%_16%,rgba(0,0,0,0.06),transparent_30%)]" />
      <div className="relative z-[1] grid gap-6 lg:grid-cols-[0.42fr_1.58fr] lg:items-stretch">
        <div>
          <p className="font-sans text-[10px] font-black uppercase tracking-[0.28em] text-black/[0.45]">{t("basic.kicker")}</p>
          <h3 className="mx-auto mt-5 max-w-[9ch] font-serif text-[clamp(2.7rem,7vw,5.6rem)] leading-[0.94] tracking-[-0.045em] lg:mx-0">{t("basic.title")}</h3>
          <p className="mx-auto mt-6 max-w-sm text-sm leading-7 text-black/[0.60] lg:mx-0">{t("basicHint")}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {basicItems.map((item, index) => (
            <motion.div
              key={item}
              initial={reducedMotion ? false : { opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.08, duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
              className="flex min-h-36 flex-col justify-between rounded-[1.5rem] border border-black/[0.10] bg-black/[0.035] p-5"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-black/[0.10] bg-[#F5F0E8]">
                <CircleDot className="h-4 w-4 text-black/[0.30]" aria-hidden="true" />
              </div>
              <p className="mt-5 font-sans text-sm leading-7 text-black/[0.70]">{t(`basic.items.${item}`)}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.article>
  );
}

function SignalEngineVisual() {
  return (
    <div className="relative min-h-[28rem] overflow-hidden rounded-[2rem] border border-cyan-200/[0.14] bg-[#07090c] xl:min-h-[34rem]"
      data-pass2004-vlm-signal-visual="solid-cyan-no-heavy-blur">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.14),transparent_36%),linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.032)_1px,transparent_1px)] bg-[length:auto,44px_44px,44px_44px]" />
      <div className="absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/[0.18] bg-black/[0.70] shadow-[0_0_110px_rgba(34,211,238,0.14)]" />
      {[0, 1, 2, 3].map((ring) => (
        <span
          key={ring}
          className="velmere-signal-ring absolute left-1/2 top-1/2 rounded-full border border-cyan-200/[0.14]"
          style={{ width: 170 + ring * 88, height: 170 + ring * 88, marginLeft: -(85 + ring * 44), marginTop: -(85 + ring * 44), animationDuration: `${18 + ring * 7}s` }}
        />
      ))}
      <svg viewBox="0 0 820 520" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <path d="M150 302 C240 132 360 286 410 260 C520 206 570 112 662 176" fill="none" stroke="rgba(34,211,238,0.34)" strokeWidth="1.5" strokeDasharray="7 14" className="velmere-dash-flow" />
        <path d="M410 260 C470 344 562 380 648 334" fill="none" stroke="rgba(245,240,232,0.18)" strokeWidth="1.2" strokeDasharray="4 12" className="velmere-dash-flow-slow" />
        <path d="M292 182 C352 252 420 280 560 180" fill="none" stroke="rgba(245,240,232,0.10)" strokeWidth="1" />
      </svg>
      <div className="absolute inset-0">
        {signalNodes.map((node, index) => (
          <div
            key={node.label}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: node.x, top: node.y }}
          >
            <span className="velmere-signal-node grid h-12 w-12 place-items-center rounded-full border border-cyan-200/[0.18] bg-black/[0.80] font-mono text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100/[0.82] shadow-[0_0_36px_rgba(212,175,55,0.22)]" style={{ animationDelay: `${index * 0.28}s` }}>
              {node.label.slice(0, 3)}
            </span>
            <span className="mt-2 block whitespace-nowrap rounded-full border border-white/[0.10] bg-black/[0.60] px-2.5 py-1 text-center font-mono text-[8px] uppercase tracking-[0.14em] text-white/[0.40]">
              {node.state}
            </span>
          </div>
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="grid h-28 w-28 place-items-center rounded-full border border-cyan-200/[0.18] bg-black/[0.80] font-serif text-2xl text-white shadow-[0_0_90px_rgba(212,175,55,0.28)]">
          VLM
        </div>
      </div>
      <div className="absolute left-5 top-5 grid gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-white/[0.50]">
        <span className="rounded-full border border-white/[0.10] bg-black/[0.55] px-3 py-2">EVM route</span>
        <span className="rounded-full border border-white/[0.10] bg-black/[0.55] px-3 py-2">Wallet state</span>
        <span className="rounded-full border border-white/[0.10] bg-black/[0.55] px-3 py-2">AMU signal</span>
      </div>
      <div className="absolute bottom-4 left-4 right-4 grid gap-2 rounded-3xl border border-white/[0.10] bg-black/[0.70] p-3  sm:grid-cols-2 xl:grid-cols-4">
        {signalChecks.map(([label, value, width]) => (
          <div key={label} className="rounded-2xl border border-white/[0.10] bg-white/[0.035] p-3">
            <div className="flex items-center justify-between gap-3 font-mono text-[8px] uppercase tracking-[0.14em] text-white/[0.40]">
              <span>{label}</span>
              <span className="text-cyan-100/[0.82]">{value}</span>
            </div>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.10]">
              <span className="block h-full rounded-full bg-cyan-200/[0.78]" style={{ width: `${width}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProCard({ reducedMotion }: { reducedMotion: boolean }) {
  const t = useTranslations("VlmBasicPro");
  const locale = useLocale() as keyof typeof proExplanation;
  const explanation = proExplanation[locale] ?? proExplanation.en;
  const overview = modeOverview[locale] ?? modeOverview.en;
  const [chartOpen, setChartOpen] = useState(false);
  return (
    <motion.article
      key="pro"
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.99 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="relative mx-auto w-full max-w-none overflow-hidden rounded-[1.45rem] border border-cyan-200/[0.16] bg-[#030303] p-4 text-left text-white sm:rounded-[2.4rem] sm:p-5 shadow-[0_40px_140px_rgba(0,0,0,0.62)] md:p-7 lg:text-left xl:p-10"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_36%,rgba(212,175,55,0.16),transparent_34%)]" />
      <div className="relative z-[1] grid gap-8 xl:grid-cols-[0.32fr_0.68fr] xl:items-start">
        <div>
          <p className="font-sans text-[10px] font-black uppercase tracking-[0.28em] text-cyan-100/[0.82]">{t("pro.kicker")}</p>
          <h3 className="mx-auto mt-5 max-w-[10ch] font-serif text-[clamp(2.6rem,5.2vw,4.75rem)] leading-[0.96] tracking-[-0.04em] text-white lg:mx-0">{t("pro.title")}</h3>
          <p className="mx-auto mt-6 max-w-lg font-sans text-sm leading-7 text-white/[0.60] lg:mx-0">{t("pro.body")}</p>
          <button type="button" onClick={() => setChartOpen((value) => !value)} className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full sm:w-auto border border-cyan-200/[0.18] bg-cyan-300/[0.075] px-5 font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-100/[0.82] transition hover:bg-cyan-300/[0.10] active:scale-95">
            <Eye className="h-4 w-4" /> {chartOpen ? t("pro.chartHide") : t("pro.chartShow")}
          </button>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {amuControls.map((control) => (
              <div key={control.label} className="rounded-2xl border border-white/[0.10] bg-black/[0.50] p-3 ">
                <div className="flex items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-[0.16em] text-white/[0.40]">
                  <span>{control.label}</span><span className="text-cyan-100/[0.82]">{control.value}</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.08]"><span className="block h-full rounded-full bg-cyan-200/[0.82]" style={{ width: `${control.width}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            {overview.map(([label, body], index) => (
              <motion.div
                key={label}
                initial={reducedMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 + index * 0.05, duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-[1.2rem] border border-white/[0.10] bg-white/[0.03] p-4"
              >
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-cyan-100/[0.82]">{label}</p>
                <p className="mt-3 text-xs leading-6 text-white/[0.56]">{body}</p>
              </motion.div>
            ))}
          </div>
          <SignalEngineVisual />
          <AnimatePresence>
            {chartOpen ? (
              <motion.div initial={{ y: 12, opacity: 0, scale: 0.99 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 8, opacity: 0, scale: 0.99 }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }} className="relative z-[80] rounded-[1.25rem] border border-cyan-200/[0.16] bg-black/[0.92] p-3 pr-12 shadow-[0_26px_90px_rgba(0,0,0,0.55)]  sm:rounded-[1.5rem] sm:p-4 sm:pr-14">
                <button type="button" onClick={() => setChartOpen(false)} className="absolute right-3 top-3 z-[2] grid h-9 w-9 place-items-center rounded-full border border-white/[0.12] bg-black/[0.78] text-white/[0.72] transition hover:border-cyan-200/[0.28] hover:text-cyan-100/[0.82]" aria-label={t("pro.chartHide")}>
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/[0.40]">{t("pro.chartLabel")}</p>
                <div className="mt-3 grid gap-2 md:grid-cols-4">
                  {signalChecks.map(([label, value, width]) => (
                    <div key={label} className="rounded-2xl border border-white/[0.10] bg-white/[0.03] p-3">
                      <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-cyan-100/[0.82]">{label}</p>
                      <p className="mt-2 text-xs text-white/[0.60]">{value}</p>
                      <div className="mt-3 h-1 rounded-full bg-white/[0.10]"><span className="block h-full rounded-full bg-cyan-200/[0.82]" style={{ width: `${width}%` }} /></div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
      <div className="relative z-[1] mt-8 grid auto-rows-fr gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
        {proItems.map((item, index) => {
          const Icon = item === "orbit" ? Orbit : item === "wallet" ? WalletCards : item === "security" ? ShieldCheck : item === "registry" ? KeyRound : item === "cyber" ? LockKeyhole : item === "amu" ? Radar : item === "vault" ? Network : item === "forensics" ? Eye : Cpu;
          return <motion.div key={item} initial={reducedMotion ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 + index * 0.025, duration: 0.26, ease: [0.16, 1, 0.3, 1] }} className="flex min-h-32 flex-col justify-between rounded-[1.35rem] border border-white/[0.10] bg-black/[0.70] p-5  transition hover:border-cyan-200/[0.16] hover:bg-[#10100d] active:scale-[0.985]"><Icon className="h-5 w-5 text-cyan-100/[0.82]" /><p className="mt-4 font-sans text-xs leading-6 text-white/[0.60]">{t(`pro.items.${item}`)}</p></motion.div>;
        })}
      </div>
      <div className="relative z-[1] mt-6 overflow-hidden rounded-[1.75rem] border border-cyan-200/[0.14] bg-[linear-gradient(135deg,rgba(212,175,55,0.08),rgba(255,255,255,0.025))] p-4 md:p-5">
        <p className="font-mono text-[9px] font-black uppercase tracking-[0.22em] text-cyan-100/[0.82]">{t("meaningTitle")}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {explanation.map(([label, body]) => (
            <div key={label} className="rounded-2xl border border-white/[0.10] bg-black/[0.45] p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/[0.60]">{label}</p>
              <p className="mt-3 text-xs leading-6 text-white/[0.52]">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.article>
  );
}

export default function VlmBasicProShowcase() {
  const t = useTranslations("VlmBasicPro");
  const reducedMotion = Boolean(useReducedMotion());
  const { mode } = useModeStore();

  return (
    <section id="vlm-mode" data-pass2004-vlm-basic-pro="solid-no-heavy-blur-low-lag" className="vlm-pass2004-solid-panels mx-auto w-full max-w-none overflow-hidden px-4 py-14 sm:px-6 lg:px-12 2xl:px-20 md:py-20">
      <div className="mx-auto mb-8 w-full max-w-none text-left">
        <p className="luxury-kicker text-velmere-gold/[0.80]">{t("kicker")}</p>
        <h2 className="mt-4 max-w-4xl font-serif text-[clamp(2.4rem,5vw,4.7rem)] leading-[0.98] tracking-[-0.035em] text-white lg:mx-0">{t("title")}</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-white/[0.50] lg:mx-0">{t("body")}</p>
      </div>
      <AnimatePresence mode="wait" initial={false}>{mode === "pro" ? <ProCard key="pro-card" reducedMotion={reducedMotion} /> : <BasicCard key="basic-card" reducedMotion={reducedMotion} />}</AnimatePresence>
    </section>
  );
}
