"use client";

import { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { resolvePass627MotionProfile } from "@/lib/ui/pass627-motion-constitution";

function readMedia(query: string): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(query).matches
    : false;
}

export function useVelmereMotionProfile() {
  const reducedMotion = Boolean(useReducedMotion());
  const [coarsePointer, setCoarsePointer] = useState(false);
  const [compactViewport, setCompactViewport] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const coarse = window.matchMedia("(pointer: coarse)");
    const compact = window.matchMedia("(max-width: 780px)");
    const sync = () => {
      setCoarsePointer(readMedia("(pointer: coarse)"));
      setCompactViewport(readMedia("(max-width: 780px)"));
    };
    sync();
    coarse.addEventListener?.("change", sync);
    compact.addEventListener?.("change", sync);
    return () => {
      coarse.removeEventListener?.("change", sync);
      compact.removeEventListener?.("change", sync);
    };
  }, []);

  return useMemo(
    () => resolvePass627MotionProfile({ reducedMotion, coarsePointer, compactViewport }),
    [coarsePointer, compactViewport, reducedMotion],
  );
}
