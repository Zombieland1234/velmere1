"use client";

import { useEffect, useRef } from "react";
import { useMounted } from "@/lib/hooks/useMounted";

const PLACEHOLDER = "UTC: [--:--:--.---] // EPOCH: --------";

function formatClock(date: Date) {
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  const ms = String(date.getUTCMilliseconds()).padStart(3, "0");
  return `UTC: [${hh}:${mm}:${ss}.${ms}] // EPOCH: ${date.getTime()}`;
}

export default function LiveClock({ className = "" }: { className?: string }) {
  const mounted = useMounted();
  const nodeRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!mounted) return;

    let frame = 0;
    let lastWrite = 0;
    const tick = (time: number) => {
      if (time - lastWrite >= 125) {
        lastWrite = time;
        if (nodeRef.current) nodeRef.current.textContent = formatClock(new Date());
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [mounted]);

  return (
    <span ref={nodeRef} suppressHydrationWarning className={className} aria-label="Live UTC clock">
      {PLACEHOLDER}
    </span>
  );
}
