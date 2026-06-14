"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useVelmereMotionProfile } from "@/components/ui/useVelmereMotionProfile";
import { pass628LayerStyle } from "@/lib/ui/pass628-overlay-constitution";

export default function VlmModeTransitionOverlay({ mode }: { mode: "basic" | "pro" }) {
  const t = useTranslations("VlmModeSwitch");
  const motionProfile = useVelmereMotionProfile();
  const [visible, setVisible] = useState(false);
  const [displayMode, setDisplayMode] = useState(mode);
  const prevMode = useRef(mode);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (mode === prevMode.current) return;
    prevMode.current = mode;
    if (timerRef.current) clearTimeout(timerRef.current);
    setDisplayMode(mode);
    if (motionProfile.duration.standard === 0) {
      setVisible(false);
      return;
    }
    setVisible(true);
    timerRef.current = setTimeout(
      () => setVisible(false),
      Math.round((motionProfile.duration.emphasis + motionProfile.duration.standard) * 1000),
    );
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [mode, motionProfile.duration.emphasis, motionProfile.duration.standard]);

  const isPro = displayMode === "pro";

  return (
    <AnimatePresence mode="wait">
      {visible ? (
        <motion.div
          key={displayMode}
          className="pointer-events-none fixed inset-0 overflow-hidden bg-[#070708]/[0.82] backdrop-blur-2xl"
          style={pass628LayerStyle("floatingAction")}
          data-pass627-motion-profile="state-bound"
          data-pass628-overlay-layer="transition"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: motionProfile.duration.quick, ease: motionProfile.easing }}
          aria-hidden="true"
        >
          <motion.div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(212,175,55,0.16),transparent_22%),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:auto,52px_52px,52px_52px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            className="absolute left-1/2 top-1/2 h-[min(34rem,82vw)] w-[min(34rem,82vw)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#c8a96a]/[0.18]"
            initial={{ scale: 0.72, opacity: 0, rotate: -16 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 1.18, opacity: 0, rotate: 12 }}
            transition={{ duration: motionProfile.duration.emphasis, ease: motionProfile.easing }}
          />
          <motion.div
            className="absolute left-1/2 top-1/2 h-[min(18rem,50vw)] w-[min(18rem,50vw)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.10] bg-[#101012]/[0.72] shadow-[0_0_120px_rgba(212,175,55,0.12)]"
            initial={{ scale: 0.82, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.94, opacity: 0 }}
            transition={{ duration: motionProfile.duration.standard, ease: motionProfile.easing }}
          />
          {[0, 1, 2, 3].map((item) => (
            <motion.div
              key={item}
              className="absolute left-1/2 top-1/2 h-px w-[min(38rem,82vw)] origin-left bg-gradient-to-r from-transparent via-[#c8a96a]/[0.55] to-transparent"
              style={{ rotate: `${item * 45}deg` }}
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              exit={{ scaleX: 0, opacity: 0 }}
              transition={{ delay: item * motionProfile.staggerStep, duration: motionProfile.duration.standard, ease: motionProfile.easing }}
            />
          ))}
          <motion.div
            className="velmere-command-shell absolute left-1/2 top-1/2 w-[min(34rem,calc(100vw-1rem))] -translate-x-1/2 -translate-y-1/2 rounded-[1.35rem] p-4 text-center sm:rounded-[2rem] sm:p-8"
            initial={{ opacity: 0, y: 30, scale: 0.92, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -18, scale: 0.98, filter: "blur(8px)" }}
            transition={{ type: "spring", ...motionProfile.spring }}
          >
            <motion.div initial={{ width: 0 }} animate={{ width: "8rem" }} transition={{ duration: motionProfile.duration.emphasis, ease: motionProfile.easing }} className="mx-auto h-px bg-gradient-to-r from-transparent via-[#c8a96a]/[0.80] to-transparent" />
            <p className={`mt-4 font-mono text-[9px] font-black uppercase tracking-[0.22em] sm:mt-6 sm:text-[10px] sm:tracking-[0.36em] ${isPro ? "text-[#c8a96a]" : "text-white/[0.74]"}`}>
              {isPro ? t("transitionPro") : t("transitionBasic")}
            </p>
            <p className="mx-auto mt-3 max-w-sm text-[11px] leading-5 text-white/[0.60] sm:mt-5 sm:text-xs sm:leading-6">
              {isPro ? t("proHint") : t("basicHint")}
            </p>
            <div className="mx-auto mt-4 grid max-w-sm grid-cols-3 gap-2 font-mono text-[8px] uppercase tracking-[0.10em] text-white/[0.45] sm:mt-6 sm:text-[9px] sm:tracking-[0.16em]">
              {(isPro ? ["registry", "wallet", "signal"] : ["atelier", "archive", "drop"]).map((x) => <span key={x} className="velmere-command-pill justify-center px-2 py-2.5 sm:px-3 sm:py-3">{x}</span>)}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
