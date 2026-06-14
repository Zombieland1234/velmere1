"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useAnimationActive } from "@/lib/motion/useAnimationActive";

const nodeKeys = ["contract", "evm", "sol", "sui", "audit", "access"] as const;

const nodes = {
  contract: { x: 208, y: 252, r: 13 },
  evm: { x: 392, y: 218, r: 18 },
  sol: { x: 628, y: 264, r: 13 },
  sui: { x: 562, y: 478, r: 13 },
  audit: { x: 246, y: 440, r: 13 },
  access: { x: 700, y: 444, r: 18 },
} as const;

const primeNodes = [
  { p: 2, x: 158, y: 156 },
  { p: 3, x: 246, y: 110 },
  { p: 5, x: 338, y: 134 },
  { p: 7, x: 486, y: 114 },
  { p: 11, x: 706, y: 154 },
  { p: 13, x: 774, y: 312 },
  { p: 17, x: 664, y: 542 },
  { p: 19, x: 438, y: 560 },
] as const;

export default function VlmAccessHeroVisual({
  compact = false,
  animationActive = true,
  captionBelow = false,
}: {
  compact?: boolean;
  animationActive?: boolean;
  captionBelow?: boolean;
} = {}) {
  const t = useTranslations("VlmAccessHeroVisual");
  const { ref, shouldAnimate } = useAnimationActive({ active: animationActive });
  const [activeNode, setActiveNode] = useState<(typeof nodeKeys)[number]>("evm");

  const activeCoords = nodes[activeNode];
  const signalPath = useMemo(() => {
    return `M392 218 C470 112 600 164 ${activeCoords.x} ${activeCoords.y}`;
  }, [activeCoords.x, activeCoords.y]);

  return (
    <div className={captionBelow ? "space-y-4" : ""}>
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`relative w-full overflow-hidden text-white ${
        compact
          ? `min-h-[240px] rounded-[2rem] border border-white/[0.05] bg-white/[0.02] ${captionBelow ? "aspect-[4/3] max-h-[380px]" : ""}`
          : "min-h-[320px] rounded-[2rem] border border-white/[0.05] bg-white/[0.02]"
      }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_54%_44%,rgba(200,169,106,0.22),transparent_42%)]" />

      <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1.5 md:left-4 md:top-4">
        {["registryPending", "securityReadiness", "launchInterface"].map((key) => (
          <span
            key={key}
            className="rounded-full border border-white/[0.10] bg-black/[0.50] px-2.5 py-1.5 font-sans text-[9px] font-semibold uppercase tracking-[0.16em] text-white/[0.54] backdrop-blur-sm"
          >
            {t(`chips.${key}`)}
          </span>
        ))}
      </div>
      <div className="absolute right-3 top-14 z-10 hidden w-40 rounded-2xl border border-white/[0.10] bg-black/[0.55] p-3 backdrop-blur-md md:block">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#d4af37]">Node legend</p>
        <div className="mt-2 grid gap-1.5">
          {nodeKeys.map((key) => (
            <button
              key={key}
              type="button"
              onMouseEnter={() => setActiveNode(key)}
              onFocus={() => setActiveNode(key)}
              onClick={() => setActiveNode(key)}
              className={`flex items-center justify-between rounded-full border px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] transition ${activeNode === key ? "border-[#d4af37]/[0.45] bg-[#d4af37]/[0.10] text-[#d4af37]" : "border-white/[0.10] text-white/[0.44] hover:text-white"}`}
            >
              {t(`nodes.${key}.label`)}
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
            </button>
          ))}
        </div>
      </div>

      <svg
        viewBox="0 0 920 680"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label={t("aria")}
      >
        <path d="M98 438 C206 210 378 512 512 294 C626 108 760 250 820 154" fill="none" stroke="rgba(245,240,232,0.06)" strokeWidth="28" />
        <path d="M98 438 C206 210 378 512 512 294 C626 108 760 250 820 154" fill="none" stroke="rgba(245,240,232,0.14)" strokeWidth="1" strokeDasharray="5 18" />

        {[82, 146].map((radius, index) => (
          <motion.circle
            key={radius}
            cx="460"
            cy="340"
            r={radius}
            fill="none"
            stroke={index === 1 ? "rgba(200,169,106,0.2)" : "rgba(245,240,232,0.1)"}
            strokeWidth="1"
            animate={shouldAnimate ? { rotate: index % 2 ? -360 : 360 } : undefined}
            transition={{ duration: 40 + index * 12, repeat: 999999, ease: "linear" }}
            style={{ transformOrigin: "460px 340px" }}
          />
        ))}

        <g opacity="0.4">
          {primeNodes.map((node) => (
            <circle key={node.p} cx={node.x} cy={node.y} r="3" fill="rgba(245,240,232,0.4)" />
          ))}
        </g>

        <path d={signalPath} fill="none" stroke="rgba(200,169,106,0.55)" strokeWidth="1.5" strokeDasharray="6 12" />
        <circle
          cx={activeCoords.x}
          cy={activeCoords.y}
          r="5"
          fill="rgba(200,169,106,0.9)"
          className={shouldAnimate ? "velmere-pulse-dot" : undefined}
        />

        {nodeKeys.map((key) => {
          const node = nodes[key];
          const selected = activeNode === key;
          return (
            <g
              key={key}
              tabIndex={0}
              role="button"
              aria-label={t(`nodes.${key}.label`)}
              onMouseEnter={() => setActiveNode(key)}
              onFocus={() => setActiveNode(key)}
              onClick={() => setActiveNode(key)}
              style={{ cursor: "pointer" }}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={node.r + 14}
                fill={selected ? "rgba(200,169,106,0.1)" : "transparent"}
                stroke={selected ? "rgba(200,169,106,0.35)" : "rgba(245,240,232,0.08)"}
              />
              <circle
                cx={node.x}
                cy={node.y}
                r={node.r}
                fill={key === "evm" || key === "access" ? "rgba(200,169,106,0.75)" : "rgba(245,240,232,0.45)"}
              />

            </g>
          );
        })}

      </svg>
      <div className="absolute bottom-4 right-4 z-10 rounded-full border border-[#d4af37]/[0.25] bg-[#d4af37]/[0.10] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#d4af37]">
        {t("accessGate")}
      </div>
    </div>
    {captionBelow ? (
      <div className="px-1">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#d4af37]">{t("title")}</p>
        <p className="mt-1.5 font-sans text-[11px] leading-5 text-white/[0.52]">{t("body")}</p>
        <p className="mt-1.5 font-sans text-[10px] text-white/[0.40]">
          {t(`nodes.${activeNode}.label`)} — {t(`nodes.${activeNode}.body`)}
        </p>
      </div>
    ) : null}
    </div>
  );
}
