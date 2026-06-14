"use client";

import { type PointerEvent, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";

export default function VlmProVisual() {
  const t = useTranslations("Vlm");
  const reducedMotion = useReducedMotion();
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [touchSafe, setTouchSafe] = useState(false);
  const dragRef = useRef<{ active: boolean; x: number; y: number }>({ active: false, x: 0, y: 0 });

  useEffect(() => {
    const query = window.matchMedia?.("(pointer: coarse)");
    const update = () => setTouchSafe(Boolean(query?.matches));
    update();
    query?.addEventListener?.("change", update);
    return () => query?.removeEventListener?.("change", update);
  }, []);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (touchSafe || event.pointerType === "touch") return;
    dragRef.current = { active: true, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (touchSafe || event.pointerType === "touch" || !dragRef.current.active) return;
    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;
    dragRef.current.x = event.clientX;
    dragRef.current.y = event.clientY;
    setRotation((current) => ({
      x: Math.max(-16, Math.min(16, current.x - dy * 0.08)),
      y: Math.max(-22, Math.min(22, current.y + dx * 0.08)),
    }));
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (touchSafe || event.pointerType === "touch") return;
    dragRef.current.active = false;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {}
  };

  const nodes = [
    { key: "evm", x: 250, y: 92, active: true },
    { key: "audit", x: 382, y: 168, active: false },
    { key: "multisig", x: 356, y: 336, active: false },
    { key: "lp", x: 142, y: 338, active: false },
    { key: "bajak", x: 112, y: 164, active: false },
  ] as const;

  return (
    <motion.div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ transformStyle: "preserve-3d", rotateX: rotation.x, rotateY: rotation.y }}
      className="mobile-scroll-safe-canvas relative mx-auto aspect-square max-h-[420px] w-full max-w-full overflow-hidden rounded-[2rem] border border-white/[0.10] bg-[#050505] touch-pan-y pointer-events-none md:aspect-[16/9] md:min-h-[30rem] xl:min-h-[34rem] md:max-h-none md:pointer-events-auto md:touch-none md:cursor-grab md:active:cursor-grabbing"
      title={t("proVisual.dragHint")}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(212,175,55,0.18),rgba(255,255,255,0.035)_30%,rgba(0,0,0,0)_72%),repeating-linear-gradient(90deg,rgba(255,255,255,0.022)_0,rgba(255,255,255,0.022)_1px,transparent_1px,transparent_58px),repeating-linear-gradient(0deg,rgba(255,255,255,0.016)_0,rgba(255,255,255,0.016)_1px,transparent_1px,transparent_58px)]" />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 500 500" role="img" aria-label={t("proVisual.aria")}>
        {[150, 212, 276].map((r, index) => (
          <motion.circle
            key={r}
            cx="250"
            cy="250"
            r={r / 2}
            fill="none"
            stroke={index === 1 ? "rgba(212,175,55,0.22)" : "rgba(255,255,255,0.1)"}
            strokeWidth="1"
            strokeDasharray={index === 0 ? "8 12" : "2 10"}
            animate={reducedMotion ? undefined : { rotate: index % 2 ? -360 : 360 }}
            style={{ transformOrigin: "250px 250px" }}
            transition={{ duration: 28 + index * 9, repeat: 999999, ease: "linear" }}
          />
        ))}

        <path
          d="M112 164 C164 110 332 92 382 168 C420 250 380 330 356 336 C282 400 188 390 142 338 C78 270 78 210 112 164Z"
          fill="none"
          stroke="rgba(212,175,55,0.48)"
          strokeWidth="1.4"
          strokeDasharray="9 14"
          className={reducedMotion ? undefined : "velmere-dash-flow"}
        />

        <motion.path
          d="M142 338 C184 284 214 236 250 92 C286 238 322 286 356 336"
          fill="none"
          stroke="rgba(255,255,240,0.18)"
          strokeWidth="1"
          strokeDasharray="4 10"
          animate={reducedMotion ? undefined : { strokeDashoffset: [0, -120] }}
          transition={{ duration: 9, repeat: 999999, ease: "linear" }}
        />

        {nodes.map((node) => (
          <g key={node.key}>
            <motion.circle
              cx={node.x}
              cy={node.y}
              r={node.active ? 18 : 14}
              fill={node.active ? "rgba(212,175,55,0.16)" : "rgba(255,255,255,0.05)"}
              stroke={node.active ? "rgba(212,175,55,0.62)" : "rgba(255,255,255,0.18)"}
              animate={reducedMotion ? undefined : { scale: node.active ? [1, 1.12, 1] : [1, 1.06, 1] }}
              style={{ transformOrigin: `${node.x}px ${node.y}px` }}
              transition={{ duration: node.active ? 2.8 : 4.2, repeat: 999999, ease: "easeInOut" }}
            />
          </g>
        ))}

        <circle cx="250" cy="250" r="42" fill="rgba(255,255,255,0.035)" stroke="rgba(212,175,55,0.34)" />
        <text x="250" y="256" textAnchor="middle" fill="rgba(255,255,240,0.86)" fontSize="18" fontFamily="serif">
          VLM
        </text>
      </svg>

      <div className="absolute right-5 top-5 z-[2] hidden w-40 space-y-2 md:block">
        {nodes.map((node) => (
          <span
            key={node.key}
            className={`block rounded-full border px-3 py-2 text-right font-mono text-[8px] uppercase tracking-[0.16em] backdrop-blur-xl ${
              node.active
                ? "border-[#d4af37]/[0.45] bg-[#d4af37]/[0.12] text-[#d4af37]"
                : "border-white/[0.10] bg-black/[0.55] text-white/[0.44]"
            }`}
          >
            {t(`proVisual.nodes.${node.key}`)}
          </span>
        ))}
      </div>

      <div className="absolute inset-x-4 bottom-4 z-[2] rounded-2xl border border-white/[0.10] bg-black/[0.92] p-4 backdrop-blur-xl md:inset-x-5 md:bottom-5 md:right-52">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#d4af37]">{t("proVisual.kicker")}</p>
        <p className="mt-2 text-xs leading-6 text-white/[0.62]">{t("proVisual.body")}</p>
      </div>
    </motion.div>
  );
}
