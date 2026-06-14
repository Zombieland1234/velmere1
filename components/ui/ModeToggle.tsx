"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useModeStore, type InterfaceMode } from "@/store/useModeStore";

type ModeToggleProps = {
  className?: string;
  labels?: Partial<Record<InterfaceMode, string>>;
};

const spring = { type: "spring", stiffness: 420, damping: 34, mass: 0.72 } as const;

export default function ModeToggle({ className = "", labels }: ModeToggleProps) {
  const { mode, setMode, isProMode } = useModeStore();
  const reducedMotion = useReducedMotion();

  return (
    <div
      role="tablist"
      aria-label="Interface mode"
      className={`velmere-segmented-control relative inline-flex items-center rounded-full border border-white/[0.10] bg-black/[0.70] p-1 shadow-[0_22px_70px_rgba(0,0,0,0.42)] backdrop-blur-2xl ${className}`}
    >
      {(["basic", "pro"] as const).map((nextMode) => {
        const active = mode === nextMode;
        return (
          <button
            key={nextMode}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => {
              if (typeof navigator !== "undefined" && "vibrate" in navigator && nextMode === "pro") {
                navigator.vibrate?.(18);
              }
              setMode(nextMode);
            }}
            className={`velmere-segmented-control__item relative z-10 min-h-10 min-w-24 rounded-full px-5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] ${
              active ? (nextMode === "pro" ? "text-[#FFFFF0]" : "text-black") : "text-white/[0.48]"
            }`}
          >
            {active ? (
              <motion.span
                layoutId="global-mode-toggle-pill"
                transition={spring}
                className={`absolute inset-0 -z-10 rounded-full ${
                  nextMode === "pro"
                    ? "bg-[linear-gradient(135deg,#d4af37,#302612_55%,#111)] shadow-[0_0_32px_rgba(212,175,55,0.22)]"
                    : "bg-[#FFFFF0]"
                }`}
              />
            ) : null}
            <span className="relative inline-flex items-center gap-2">
              {nextMode === "pro" ? <Sparkles className="h-3 w-3" aria-hidden="true" /> : null}
              {labels?.[nextMode] ?? nextMode.toUpperCase()}
            </span>
          </button>
        );
      })}

      <AnimatePresence>
        {isProMode && !reducedMotion ? (
          <motion.span
            aria-hidden="true"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: [0.35, 1, 0.35], scale: [0.9, 1.08, 0.9] }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 2.4, repeat: 999999, ease: "easeInOut" }}
            className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-[#d4af37]"
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
