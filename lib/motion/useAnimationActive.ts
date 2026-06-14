"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

type UseAnimationActiveOptions = {
  active?: boolean;
  rootMargin?: string;
};

export function useAnimationActive({ active = true, rootMargin = "-8% 0px -8% 0px" }: UseAnimationActiveOptions = {}) {
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);

  useEffect(() => {
    const onVisibilityChange = () => setTabVisible(!document.hidden);
    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node || !active) {
      setInView(false);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin, threshold: 0.12 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [active, rootMargin]);

  const shouldAnimate = active && inView && tabVisible && !reducedMotion;

  return { ref, shouldAnimate, reducedMotion: Boolean(reducedMotion) };
}
