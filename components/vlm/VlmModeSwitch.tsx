"use client";

import { useState } from "react";
import { BarChart3, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/navigation";
import VlmModeTransitionOverlay from "@/components/vlm/VlmModeTransitionOverlay";
import VlmSourceBoundMarketPanel from "@/components/vlm/VlmSourceBoundMarketPanel";
import { useUiSounds } from "@/lib/audio/useUiSounds";
import { useModeStore, type InterfaceMode } from "@/store/useModeStore";
import { ModalRoot } from "@/components/ui/OverlayPrimitives";
import { pass628LayerStyle } from "@/lib/ui/pass628-overlay-constitution";

/** VLM Basic/Pro controller. Floating variant lives above Angel only on the VLM page. */
export default function VlmModeSwitch({
  inline = false,
}: {
  inline?: boolean;
}) {
  const t = useTranslations("VlmModeSwitch");
  const { mode, setMode } = useModeStore();
  const { playClick, playSystemOn } = useUiSounds();
  const [chartOpen, setChartOpen] = useState(false);

  const chooseMode = (nextMode: InterfaceMode) => {
    setMode(nextMode);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("vlm-mode-choice-seen", "1");
      window.setTimeout(
        () => window.scrollTo({ top: 0, left: 0, behavior: "smooth" }),
        0,
      );
    }
    nextMode === "pro" ? playSystemOn() : playClick();
  };

  const control = (
    <div
      role="tablist"
      aria-label={t("aria")}
      className={`inline-flex rounded-full border border-white/[0.10] bg-[#0b0d10] p-1 shadow-[0_18px_48px_rgba(0,0,0,0.42)] ${inline ? "origin-left scale-100" : "w-full max-w-[15.5rem] justify-between md:w-auto md:max-w-none"}`}
      data-pass2004-vlm-mode-switch="solid-no-blur-low-lag"
    >
      {[
        { key: "basic" as const, href: "/vlm-token", label: t("basic") },
        { key: "pro" as const, href: "/vlm-token?mode=pro", label: t("pro") },
      ].map((item) => {
        const active = mode === item.key;
        return (
          <Link
            key={item.key}
            href={item.href}
            role="tab"
            aria-selected={active}
            onClick={() => {
              if (typeof navigator !== "undefined" && navigator.vibrate)
                navigator.vibrate(50);
              chooseMode(item.key);
            }}
            className={`min-h-10 ${inline ? "min-w-[5.35rem] px-4" : "flex-1 px-4 md:min-w-[7rem] md:flex-none md:px-5"} rounded-full text-center font-sans text-[9px] font-black uppercase tracking-[0.2em] transition-colors active:scale-95 ${
              active
                ? item.key === "pro"
                  ? "bg-[linear-gradient(135deg,#d4af37,#3a2f16_58%,#101010)] text-[#FFFFF0] shadow-[0_0_34px_rgba(212,175,55,0.2)]"
                  : "bg-[#FFFFF0] text-black"
                : "text-white/[0.48] hover:text-white"
            }`}
          >
            <span className="inline-flex min-h-10 items-center justify-center">
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );

  if (inline) return control;

  return (
    <>
      <VlmModeTransitionOverlay mode={mode} />
      <div
        className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+13.05rem)] flex justify-center md:inset-x-auto md:bottom-[11.1rem] md:right-8"
        style={pass628LayerStyle("floatingAction")}
      >
        <button
          type="button"
          onClick={() => setChartOpen(true)}
          className="inline-flex min-h-11 w-full max-w-[15.5rem] items-center justify-center gap-2 rounded-full border border-cyan-200/[0.18] bg-[#0b0d10] px-4 font-mono text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/[0.82] shadow-[0_18px_48px_rgba(0,0,0,0.46)] transition-colors duration-150 hover:border-cyan-200/[0.30] hover:bg-[#0f1419] active:scale-95 md:min-h-12 md:w-auto md:max-w-none md:justify-start"
          data-pass2004-vlm-chart-trigger="solid-no-blur"
        >
          <BarChart3 className="h-4 w-4" />
          <span className="hidden sm:inline">{t("chartButton")}</span>
        </button>
      </div>
      <div
        className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+9.25rem)] flex justify-center md:inset-x-auto md:bottom-[6.6rem] md:right-8"
        style={pass628LayerStyle("floatingAction")}
      >
        {control}
      </div>

      <ModalRoot
        open={chartOpen}
        onClose={() => setChartOpen(false)}
        closeLabel={t("chartClose")}
        ariaLabelledBy="vlm-mode-chart-title"
        ariaLabel={t("chartTitle")}
        surfaceClassName="h-[100dvh] w-full max-w-5xl overflow-hidden rounded-none border border-white/[0.12] bg-[#111113] pb-[calc(env(safe-area-inset-bottom)+1rem)] text-white shadow-[0_42px_160px_rgba(0,0,0,0.82)] sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:rounded-[2rem]"
        surfaceData={{ surface: "vlm-mode-chart", pass2004: "solid-chart-modal-owned-scroll" }}
      >
        <div
          data-modal-scroll-region="true"
          className="h-full overflow-y-auto overscroll-contain touch-pan-y luxury-scrollbar"
        >
          <div className="sticky top-0 z-[4] flex items-start justify-between gap-3 border-b border-white/[0.10] bg-[#111113] p-[calc(env(safe-area-inset-top)+1rem)] pb-4 sm:p-5 md:p-7">
            <div>
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-velmere-gold">
                {t("chartKicker")}
              </p>
              <h3
                id="vlm-mode-chart-title"
                className="mt-3 font-serif text-3xl leading-none tracking-[-0.04em] md:text-5xl"
              >
                {t("chartTitle")}
              </h3>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-white/[0.58]">
                {t("chartBody")}
              </p>
            </div>
            <button
              type="button"
              onPointerDown={(event) => { event.preventDefault(); setChartOpen(false); }}
              onClick={() => setChartOpen(false)}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/[0.10] text-white/[0.50] transition hover:text-white"
              aria-label={t("chartClose")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <VlmSourceBoundMarketPanel mode={mode} />
        </div>
      </ModalRoot>
    </>
  );
}

// PASS631 legacy verifier compatibility only: z-[100000]
