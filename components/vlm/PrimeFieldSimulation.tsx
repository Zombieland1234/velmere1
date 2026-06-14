"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useAnimationActive } from "@/lib/motion/useAnimationActive";

const primeNodes = [
  { p: 2, x: 86, y: 148 },
  { p: 3, x: 152, y: 96 },
  { p: 5, x: 236, y: 130 },
  { p: 7, x: 312, y: 82 },
  { p: 11, x: 392, y: 138 },
  { p: 13, x: 492, y: 104 },
  { p: 17, x: 598, y: 158 },
  { p: 19, x: 696, y: 120 },
  { p: 23, x: 124, y: 260 },
  { p: 29, x: 236, y: 248 },
  { p: 31, x: 342, y: 292 },
  { p: 37, x: 460, y: 248 },
  { p: 41, x: 578, y: 296 },
  { p: 43, x: 688, y: 254 },
  { p: 47, x: 170, y: 386 },
  { p: 53, x: 298, y: 410 },
  { p: 59, x: 430, y: 384 },
  { p: 61, x: 558, y: 424 },
] as const;

const hashFragments = [
  { value: "0x7A", x: 214, y: 188 },
  { value: "0xC1", x: 486, y: 190 },
  { value: "0x13", x: 612, y: 360 },
] as const;

export default function PrimeFieldSimulation({ active = true }: { active?: boolean } = {}) {
  const t = useTranslations("PrimeFieldSimulation");
  const { ref, shouldAnimate } = useAnimationActive({ active });
  const [selectedPrime, setSelectedPrime] = useState(17);
  const selectedNode = useMemo(() => primeNodes.find((node) => node.p === selectedPrime) ?? primeNodes[6], [selectedPrime]);

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className="relative aspect-square overflow-hidden rounded-[2rem] border border-white/[0.05] bg-black/[0.28] text-white md:aspect-[16/10] md:min-h-[360px]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_64%_34%,rgba(200,169,106,0.14),transparent_32%),repeating-linear-gradient(90deg,rgba(245,240,232,0.025)_0,rgba(245,240,232,0.025)_1px,transparent_1px,transparent_44px),repeating-linear-gradient(0deg,rgba(245,240,232,0.018)_0,rgba(245,240,232,0.018)_1px,transparent_1px,transparent_44px)]" />
      <svg viewBox="0 0 820 520" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full" role="img" aria-label={t("aria")}>
        <defs>
          <filter id="primeGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          d="M90 354 C210 180 318 408 438 238 C544 86 642 280 746 164"
          fill="none"
          stroke="rgba(245,240,232,0.08)"
          strokeWidth="34"
          className={shouldAnimate ? "velmere-pulse-dot" : undefined}
        />
        <path d="M90 354 C210 180 318 408 438 238 C544 86 642 280 746 164" fill="none" stroke="rgba(245,240,232,0.2)" strokeWidth="1" strokeDasharray="5 18" />
        <line x1="410" x2="410" y1="50" y2="470" stroke="rgba(200,169,106,0.2)" strokeDasharray="2 12" />

        <g opacity="0.36">
          {primeNodes.slice(0, -1).map((node, index) => {
            const next = primeNodes[index + 1];
            return <line key={`${node.p}-${next.p}`} x1={node.x} y1={node.y} x2={next.x} y2={next.y} stroke="rgba(245,240,232,0.12)" />;
          })}
        </g>

        <line
          x1="86"
          y1="148"
          x2={selectedNode.x}
          y2={selectedNode.y}
          stroke="rgba(200,169,106,0.52)"
          strokeWidth="2"
          strokeDasharray="6 12"
          className={shouldAnimate ? "velmere-dash-flow" : undefined}
        />

        {primeNodes.map((node, index) => {
          const selected = node.p === selectedPrime;
          return (
            <motion.g
              key={node.p}
              role="button"
              tabIndex={0}
              aria-label={`${t("selectedPrime")} ${node.p}`}
              onMouseEnter={() => setSelectedPrime(node.p)}
              onFocus={() => setSelectedPrime(node.p)}
              onClick={() => setSelectedPrime(node.p)}
              animate={shouldAnimate ? { opacity: selected ? [0.78, 1, 0.78] : [0.45, 0.9, 0.45] } : undefined}
              transition={{ duration: selected ? 2.2 : 4.5, delay: index * 0.08, repeat: 999999, ease: "easeInOut" }}
              style={{ cursor: "pointer" }}
            >
              <circle cx={node.x} cy={node.y} r={selected ? "16" : "11"} fill={selected ? "rgba(200,169,106,0.14)" : "rgba(245,240,232,0.035)"} stroke="rgba(245,240,232,0.12)" />
              <circle cx={node.x} cy={node.y} r={selected ? "7" : "5"} fill="rgba(200,169,106,0.78)" filter="url(#primeGlow)" />
              {index < 12 && (
                <text x={node.x + 12} y={node.y + 4} fill={selected ? "rgba(200,169,106,0.92)" : "rgba(245,240,232,0.48)"} fontSize="12" fontFamily="monospace">
                  {node.p}
                </text>
              )}
            </motion.g>
          );
        })}

        {hashFragments.map((fragment, index) => (
          <motion.text
            key={fragment.value}
            x={fragment.x}
            y={fragment.y}
            fill="rgba(245,240,232,0.38)"
            fontSize="13"
            fontFamily="monospace"
            animate={shouldAnimate ? { opacity: [0, 0.75, 0] } : undefined}
            transition={{ duration: 5.5, delay: 1 + index * 1.1, repeat: 999999, ease: "easeInOut" }}
          >
            {fragment.value}
          </motion.text>
        ))}

        <circle
          cx={selectedNode.x}
          cy={selectedNode.y}
          r="7"
          fill="rgba(200,169,106,0.96)"
          filter="url(#primeGlow)"
          className={shouldAnimate ? "velmere-pulse-dot" : undefined}
        />

        <g transform="translate(616 346)">
          <rect width="150" height="62" rx="22" fill="rgba(0,0,0,0.44)" stroke="rgba(245,240,232,0.14)" />
          <text x="75" y="28" textAnchor="middle" fill="rgba(200,169,106,0.92)" fontSize="12" fontFamily="monospace">
            {t("accessCheck")}
          </text>
          <text x="75" y="47" textAnchor="middle" fill="rgba(245,240,232,0.44)" fontSize="11" fontFamily="monospace">
            {t("notAudit")}
          </text>
        </g>
      </svg>

      <div className="absolute left-4 top-4 flex flex-wrap gap-2">
        {["primeField", "entropyFlow", "accessCheck", "notAudit"].map((key) => (
          <span key={key} className="rounded-full border border-white/[0.10] bg-black/[0.42] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/[0.50]">
            {t(key)}
          </span>
        ))}
      </div>

      <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/[0.10] bg-black/[0.58] p-4 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-xs text-[#F5F0E8]">
            {t("selectedPrime")}: <span className="text-velmere-gold">{selectedPrime}</span>
          </p>
          <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-white/[0.48]">
            {t("nodeStable")} / {t("auditRequired")}
          </p>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 md:hidden">
          {primeNodes.slice(0, 10).map((node) => (
            <button
              key={node.p}
              type="button"
              onClick={() => setSelectedPrime(node.p)}
              className={`min-h-8 min-w-8 rounded-full border font-mono text-[11px] ${
                selectedPrime === node.p ? "border-velmere-gold bg-velmere-gold text-black" : "border-white/[0.10] text-white/[0.52]"
              }`}
            >
              {node.p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
