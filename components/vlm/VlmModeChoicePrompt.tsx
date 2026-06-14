"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/navigation";
import { useModeStore, type InterfaceMode } from "@/store/useModeStore";
import { Cpu, Layers3, ShieldCheck, X } from "lucide-react";
import { ModalRoot } from "@/components/ui/OverlayPrimitives";

export default function VlmModeChoicePrompt({
  mode,
}: {
  mode: "basic" | "pro";
}) {
  const t = useTranslations("VlmModeSwitch");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { setMode } = useModeStore();

  useEffect(() => {
    setMounted(true);
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    const seen = window.localStorage.getItem("vlm-mode-choice-seen") === "1";
    if (seen) return undefined;
    const frame = window.requestAnimationFrame(() => setOpen(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const choose = (nextMode?: InterfaceMode) => {
    navigator.vibrate?.(35);
    if (nextMode) setMode(nextMode);
    window.localStorage.setItem("vlm-mode-choice-seen", "1");
    window.setTimeout(
      () => window.scrollTo({ top: 0, left: 0, behavior: "smooth" }),
      0,
    );
    setOpen(false);
  };

  if (!mounted) return null;

  return (
    <ModalRoot
      open={open}
      onClose={() => choose()}
      closeLabel={t("close")}
      ariaLabelledBy="vlm-mode-choice-title"
      ariaLabel={t("choiceTitle")}
      surfaceClassName="relative my-auto w-full max-w-[40rem] rounded-[1.5rem] border border-white/[0.12] bg-[#1A1A1C] p-4 text-white shadow-[0_40px_140px_rgba(0,0,0,0.74)] sm:rounded-[2rem] sm:p-5 md:p-8"
      surfaceData={{ surface: "vlm-mode-choice" }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_15%,rgba(212,175,55,0.16),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent_36%)]" />
      <button
        type="button"
        onClick={() => choose()}
        className="absolute right-4 top-4 z-[2] flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.10] bg-black/[0.28] text-white/[0.45] transition hover:text-white active:scale-95"
        aria-label={t("close")}
      >
        <X className="h-4 w-4" />
      </button>
      <div
        data-modal-scroll-region="true"
        className="relative z-[1] max-h-[calc(100dvh-3rem)] overflow-y-auto overscroll-contain pr-1 luxury-scrollbar"
      >
        <p className="font-mono text-[10px] font-black uppercase tracking-[0.28em] text-[#c8a96a]">
          {t("choiceKicker")}
        </p>
        <h2
          id="vlm-mode-choice-title"
          className="mt-4 font-serif text-3xl leading-[0.95] md:text-5xl"
        >
          {t("choiceTitle")}
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-7 text-white/[0.58]">
          {t("choiceBody")}
        </p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Link
            href="/vlm-token"
            onClick={() => choose("basic")}
            className={`group rounded-[1.5rem] border p-5 transition active:scale-[0.985] ${mode === "basic" ? "border-white/[0.20] bg-white/[0.07]" : "border-white/[0.10] bg-black/[0.24] hover:border-white/[0.18]"}`}
          >
            <Layers3 className="h-5 w-5 text-white/[0.65]" />
            <p className="mt-5 font-mono text-[10px] font-black uppercase tracking-[0.22em] text-white">
              {t("choiceBasicTitle")}
            </p>
            <p className="mt-3 text-xs leading-6 text-white/[0.50]">
              {t("choiceBasicBody")}
            </p>
          </Link>
          <Link
            href="/vlm-token?mode=pro"
            onClick={() => choose("pro")}
            className={`group rounded-[1.5rem] border p-5 transition active:scale-[0.985] ${mode === "pro" ? "border-[#c8a96a]/[0.45] bg-[#c8a96a]/[0.12]" : "border-[#c8a96a]/[0.22] bg-[#c8a96a]/[0.08] hover:border-[#c8a96a]/[0.42]"}`}
          >
            <Cpu className="h-5 w-5 text-[#c8a96a]" />
            <p className="mt-5 font-mono text-[10px] font-black uppercase tracking-[0.22em] text-[#c8a96a]">
              {t("choiceProTitle")}
            </p>
            <p className="mt-3 text-xs leading-6 text-white/[0.52]">
              {t("choiceProBody")}
            </p>
          </Link>
        </div>
        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/[0.10] bg-black/[0.22] p-4 font-mono text-[9px] uppercase tracking-[0.16em] text-white/[0.40]">
          <ShieldCheck className="h-4 w-4 shrink-0 text-[#c8a96a]/[0.70]" />
          <span>{t("choiceFootnote")}</span>
        </div>
      </div>
    </ModalRoot>
  );
}
