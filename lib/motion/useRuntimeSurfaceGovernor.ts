"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildPass496RuntimeSurfaceGovernor,
  type Pass496RuntimeSurfaceGovernor,
} from "./pass496-runtime-surface-governor";

type NavigatorSignals = Navigator & {
  deviceMemory?: number;
  connection?: EventTarget & { saveData?: boolean };
};

type RuntimeSignals = {
  reducedMotion: boolean;
  reducedTransparency: boolean;
  saveData: boolean;
  visible: boolean;
  interactionRecent: boolean;
  hardwareConcurrency: number;
  deviceMemory: number;
  viewportWidth: number;
};

const fallbackSignals: RuntimeSignals = {
  reducedMotion: false,
  reducedTransparency: false,
  saveData: false,
  visible: true,
  interactionRecent: true,
  hardwareConcurrency: 8,
  deviceMemory: 8,
  viewportWidth: 1280,
};

export function useRuntimeSurfaceGovernor(): Pass496RuntimeSurfaceGovernor {
  const [signals, setSignals] = useState<RuntimeSignals>(fallbackSignals);

  useEffect(() => {
    const nav = navigator as NavigatorSignals;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const transparencyQuery = window.matchMedia("(prefers-reduced-transparency: reduce)");
    const read = (interactionRecent = signals.interactionRecent) => {
      setSignals({
        reducedMotion: motionQuery.matches,
        reducedTransparency: transparencyQuery.matches,
        saveData: nav.connection?.saveData === true,
        visible: document.visibilityState === "visible",
        interactionRecent,
        hardwareConcurrency: nav.hardwareConcurrency || 4,
        deviceMemory: nav.deviceMemory || 4,
        viewportWidth: window.innerWidth,
      });
    };

    const refresh = () => read(false);

    // PASS788: never re-render the full visual surface on every click, key or scroll.
    // Device/visibility changes are sufficient to govern motion quality.
    read(false);
    window.addEventListener("resize", refresh, { passive: true });
    document.addEventListener("visibilitychange", refresh);
    motionQuery.addEventListener?.("change", refresh);
    transparencyQuery.addEventListener?.("change", refresh);
    nav.connection?.addEventListener?.("change", refresh);

    return () => {
      window.removeEventListener("resize", refresh);
      document.removeEventListener("visibilitychange", refresh);
      motionQuery.removeEventListener?.("change", refresh);
      transparencyQuery.removeEventListener?.("change", refresh);
      nav.connection?.removeEventListener?.("change", refresh);
    };
    // Signals are intentionally sampled by DOM events rather than effect dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useMemo(() => buildPass496RuntimeSurfaceGovernor(signals), [signals]);
}
