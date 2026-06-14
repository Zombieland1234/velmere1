"use client";

/** AMU is the center pulse; ρ controls ring spacing — aesthetic only, not wallet crypto. */
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useAnimationActive } from "@/lib/motion/useAnimationActive";
import { VLM_SCIENTIFIC_CONSTANTS } from "@/lib/vlm/scientific-constants";

const superscripts = ["¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸"];
const rings = Array.from({ length: 8 }, (_, index) => ({
  n: index + 1,
  label: `ρ${superscripts[index]}`,
  r: 48 + index * 29,
}));

const primes = [
  { value: 2, x: 278, y: 164 },
  { value: 3, x: 358, y: 134 },
  { value: 5, x: 452, y: 172 },
  { value: 7, x: 512, y: 254 },
  { value: 11, x: 486, y: 364 },
  { value: 13, x: 388, y: 424 },
  { value: 17, x: 274, y: 394 },
  { value: 19, x: 218, y: 286 },
] as const;

export default function AmuCoreVisualizer({
  selectedN = 4,
  active = true,
}: {
  selectedN?: number;
  active?: boolean;
}) {
  const t = useTranslations("AmuCore.visual");
  const { ref, shouldAnimate } = useAnimationActive({ active });
  const { amu, amuLabel } = VLM_SCIENTIFIC_CONSTANTS;
  const selectedRing = rings[Math.max(0, Math.min(selectedN - 1, rings.length - 1))];

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className="relative aspect-square max-h-[360px] overflow-hidden rounded-[2rem] border border-white/[0.05] bg-white/[0.035] text-white md:max-h-[560px]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(200,169,106,0.18),rgba(255,255,255,0.025)_42%,rgba(0,0,0,0)_70%),repeating-linear-gradient(90deg,rgba(245,240,232,0.025)_0,rgba(245,240,232,0.025)_1px,transparent_1px,transparent_42px),repeating-linear-gradient(0deg,rgba(245,240,232,0.018)_0,rgba(245,240,232,0.018)_1px,transparent_1px,transparent_42px)]" />
      <svg viewBox="0 0 720 720" className="absolute inset-0 h-full w-full" role="img" aria-label={t("aria")}>
        <defs>
          <filter id="amuGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          d="M90 398 C180 312 236 478 344 356 C456 232 520 422 638 296"
          fill="none"
          stroke="rgba(245,240,232,0.055)"
          strokeWidth="26"
        />
        <path
          d="M92 398 C180 312 236 478 344 356 C456 232 520 422 638 296"
          fill="none"
          stroke="rgba(245,240,232,0.14)"
          strokeWidth="1"
          strokeDasharray="5 18"
        />

        {rings.map((ring, index) => {
          const selected = ring.n === selectedN;
          return (
            <motion.g
              key={ring.label}
              animate={shouldAnimate ? { rotate: index % 2 ? -360 : 360 } : undefined}
              transition={{ duration: 42 + index * 8, repeat: 999999, ease: "linear" }}
              style={{ transformOrigin: "360px 300px" }}
            >
              <circle
                cx="360"
                cy="300"
                r={ring.r}
                fill="none"
                stroke={selected ? "rgba(200,169,106,0.62)" : "rgba(245,240,232,0.12)"}
                strokeWidth={selected ? "2" : "1"}
                strokeDasharray={index % 2 ? "3 12" : "1 10"}
              />
              <text
                x={360 + ring.r - 12}
                y="296"
                fill={selected ? "rgba(200,169,106,0.9)" : "rgba(245,240,232,0.42)"}
                fontSize="14"
                fontFamily="monospace"
              >
                {ring.label}
              </text>
            </motion.g>
          );
        })}

        {primes.map((prime, index) => (
          <motion.g
            key={prime.value}
            animate={shouldAnimate ? { opacity: [0.48, 0.95, 0.48], scale: [1, 1.08, 1] } : undefined}
            transition={{ duration: 4.8, delay: index * 0.18, repeat: 999999, ease: "easeInOut" }}
            style={{ transformOrigin: `${prime.x}px ${prime.y}px` }}
          >
            <circle cx={prime.x} cy={prime.y} r="7" fill="rgba(200,169,106,0.82)" filter="url(#amuGlow)" />
            <text x={prime.x + 13} y={prime.y + 4} fill="rgba(245,240,232,0.54)" fontSize="13" fontFamily="monospace">
              {prime.value}
            </text>
          </motion.g>
        ))}

        <circle cx="360" cy="300" r="46" fill="rgba(200,169,106,0.16)" stroke="rgba(200,169,106,0.55)" />
        <circle cx="360" cy="300" r="9" fill="rgba(245,240,232,0.88)" filter="url(#amuGlow)" />
        <text x="360" y="286" textAnchor="middle" fill="rgba(245,240,232,0.78)" fontSize="17" fontFamily="monospace">
          {amuLabel}
        </text>
        <text x="360" y="322" textAnchor="middle" fill="rgba(245,240,232,0.46)" fontSize="13" fontFamily="monospace">
          {amu}
        </text>

        <motion.circle
          r="8"
          fill="rgba(200,169,106,0.95)"
          filter="url(#amuGlow)"
          animate={
            shouldAnimate
              ? {
                  cx: [360, 360 + selectedRing.r * 0.32, 360 + selectedRing.r * 0.75],
                  cy: [300, 300 - selectedRing.r * 0.28, 300 - selectedRing.r * 0.05],
                }
              : { cx: 360 + selectedRing.r * 0.75, cy: 300 - selectedRing.r * 0.05 }
          }
          transition={{ duration: 4.2, repeat: 999999, ease: "easeInOut" }}
        />

        <g transform="translate(540 392)">
          <rect width="128" height="58" rx="20" fill="rgba(0,0,0,0.42)" stroke="rgba(245,240,232,0.14)" />
          <text x="64" y="25" textAnchor="middle" fill="rgba(200,169,106,0.9)" fontSize="12" fontFamily="monospace">
            {t("accessCheck")}
          </text>
          <text x="64" y="43" textAnchor="middle" fill="rgba(245,240,232,0.48)" fontSize="11" fontFamily="monospace">
            {t("preLaunch")}
          </text>
        </g>
      </svg>

      <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full border border-white/[0.10] bg-black/[0.38] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/[0.52]">
          {t("disclaimer")}
        </span>
        <span className="rounded-full border border-velmere-gold/[0.25] bg-velmere-gold/[0.08] px-3 py-2 font-mono text-[10px] text-velmere-gold">
          H{selectedN} / {selectedRing.label}
        </span>
      </div>
    </div>
  );
}
