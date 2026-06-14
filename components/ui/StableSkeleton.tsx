import type { CSSProperties, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import {
  buildPass630StableShell,
  type StableShellPhase,
  type StableShellSurface,
} from "@/lib/ui/pass630-perceived-performance-shell";

type StableSkeletonProps = HTMLAttributes<HTMLDivElement> & {
  height?: string;
  minHeightPx?: number;
  finalMinHeightPx?: number;
  rows?: number;
  phase?: StableShellPhase;
  surface?: StableShellSurface;
};

export function StableSkeleton({
  className,
  height,
  minHeightPx = 288,
  finalMinHeightPx,
  rows = 4,
  phase = "pending",
  surface = "shield",
  style,
  ...props
}: StableSkeletonProps) {
  const contract = buildPass630StableShell({
    surface,
    phase,
    minHeightPx,
    finalMinHeightPx,
  });
  const geometry: CSSProperties = {
    height,
    minHeight: `${contract.minHeightPx}px`,
    ...style,
  };

  return (
    <div
      aria-hidden="true"
      data-pass630-stable-skeleton={contract.layoutShiftRisk}
      data-pass630-phase={contract.phase}
      data-pass630-preserve-geometry={contract.preserveGeometry ? "true" : "false"}
      className={cn(
        "velmere-stable-skeleton overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-[#0b0b0d] p-5",
        className,
      )}
      style={geometry}
      {...props}
    >
      <div className="velmere-stable-skeleton__eyebrow" />
      <div className="velmere-stable-skeleton__title" />
      <div className="mt-6 grid gap-3">
        {Array.from({ length: Math.max(1, rows) }, (_, index) => (
          <div
            key={index}
            className="velmere-stable-skeleton__row"
            style={{ inlineSize: `${Math.max(46, 100 - index * 9)}%` }}
          />
        ))}
      </div>
    </div>
  );
}
