"use client";

/** Educational flow only — does not create wallets or show seed phrases. */
import { useEffect, useRef, useState } from "react";
import { EyeOff, KeyRound, LockKeyhole, WalletCards } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAnimationActive } from "@/lib/motion/useAnimationActive";

const flow = [
  { key: "entropy", icon: WalletCards },
  { key: "amu", icon: LockKeyhole },
  { key: "privateKey", icon: EyeOff },
  { key: "publicAddress", icon: KeyRound },
  { key: "accessPreview", icon: LockKeyhole },
] as const;

export default function WalletGenesisSimulation({ compact = false, active = true }: { compact?: boolean; active?: boolean } = {}) {
  const t = useTranslations("WalletGenesis");
  const { ref, shouldAnimate } = useAnimationActive({ active });
  const [activeStep, setActiveStep] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!active || !shouldAnimate || isMobile) return undefined;
    const timer = window.setInterval(() => {
      setActiveStep((step) => (step + 1) % flow.length);
    }, 2800);
    return () => window.clearInterval(timer);
  }, [active, isMobile, shouldAnimate]);

  const current = flow[activeStep];

  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className="overflow-hidden rounded-[2rem] border border-white/[0.05] bg-white/[0.03] p-5 md:p-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#d4af37]">{t("kicker")}</p>
      <h2 className={`mt-3 font-serif text-[#FFFFF0] ${compact ? "text-2xl" : "text-3xl"}`}>{t("title")}</h2>
      <p className="mt-4 text-sm leading-7 text-white/[0.58]">{t("body")}</p>
      <p className="mt-4 rounded-xl border border-white/[0.05] bg-black/[0.20] p-3 text-xs leading-6 text-white/[0.48]">{t("securityNote")}</p>

      {isMobile ? (
        <div className="mt-5 flex flex-col gap-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {flow.map(({ key }, index) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveStep(index)}
                aria-pressed={activeStep === index}
                className={`min-h-10 min-w-10 shrink-0 rounded-full border font-mono text-xs ${
                  activeStep === index
                    ? "border-[#d4af37] bg-[#d4af37] text-black"
                    : "border-white/[0.10] text-white/[0.46]"
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
          <article className="rounded-2xl border border-[#d4af37]/[0.25] bg-[#d4af37]/[0.06] p-5">
            <current.icon className="h-5 w-5 text-[#d4af37]" aria-hidden="true" />
            <p className="mt-4 text-[10px] uppercase tracking-[0.18em] text-white/[0.40]">{t(`steps.${current.key}.label`)}</p>
            <p className="mt-2 text-sm leading-6 text-white/[0.68]">{t(`steps.${current.key}.value`)}</p>
          </article>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={activeStep === 0}
              onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
              className="min-h-11 flex-1 rounded-full border border-white/[0.10] text-[10px] uppercase tracking-[0.14em] text-white/[0.55] disabled:opacity-30"
            >
              {t("prev")}
            </button>
            <button
              type="button"
              disabled={activeStep === flow.length - 1}
              onClick={() => setActiveStep((s) => Math.min(flow.length - 1, s + 1))}
              className="min-h-11 flex-1 rounded-full border border-white/[0.10] text-[10px] uppercase tracking-[0.14em] text-white/[0.55] disabled:opacity-30"
            >
              {t("next")}
            </button>
          </div>
        </div>
      ) : (
        <>
      <div className="mt-5 grid grid-cols-5 gap-2">
        {flow.map(({ key }, index) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveStep(index)}
            aria-pressed={activeStep === index}
            className={`min-h-10 rounded-full border font-mono text-xs transition-colors ${
              activeStep === index
                ? "border-[#d4af37] bg-[#d4af37] text-black"
                : "border-white/[0.10] text-white/[0.46]"
            }`}
          >
            {index + 1}
          </button>
        ))}
      </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {flow.map(({ key, icon: Icon }, index) => {
            const isActive = activeStep === index;
            return (
              <article
                key={key}
                className={`min-h-[120px] rounded-2xl border p-4 transition-colors ${
                  isActive ? "border-[#d4af37]/[0.35] bg-[#d4af37]/[0.06]" : "border-white/[0.05] bg-black/[0.20]"
                }`}
              >
                <Icon className="h-4 w-4 text-[#d4af37]" aria-hidden="true" />
                <p className="mt-3 text-[10px] uppercase tracking-[0.16em] text-white/[0.40]">{t(`steps.${key}.label`)}</p>
                <p className="mt-2 text-xs leading-6 text-white/[0.62]">{t(`steps.${key}.value`)}</p>
              </article>
            );
          })}
        </div>
        </>
      )}

      <p className="mt-5 text-xs leading-6 text-white/[0.44]">{t("amuNote")}</p>
    </div>
  );
}
