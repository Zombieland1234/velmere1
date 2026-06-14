"use client";

import { Suspense, lazy } from "react";

type SplineViewerPlaceholderProps = {
  scene?: string;
  label?: string;
  className?: string;
};

const EmptySplineScene = lazy(async () => ({
  default: function EmptySplineScene({ scene, label }: SplineViewerPlaceholderProps) {
    return (
      <div
        role="img"
        aria-label={label ?? "Velmère 3D scene placeholder"}
        className="relative h-full min-h-[280px] w-full overflow-hidden rounded-[2rem] border border-white/[0.10] bg-[#050505]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(212,175,55,0.22),rgba(255,255,255,0.04)_32%,rgba(0,0,0,0)_68%)]" />
        <div className="absolute inset-8 rounded-full border border-[#d4af37]/[0.20]" />
        <div className="absolute inset-16 rounded-full border border-white/[0.10]" />
        <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#d4af37]/[0.30] bg-[#d4af37]/[0.10] shadow-[0_0_60px_rgba(212,175,55,0.24)]" />
        <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#d4af37]">Spline ready slot</p>
            <p className="mt-2 max-w-sm text-xs leading-6 text-white/[0.52]">
              {scene ? "Scene URL configured for future embed." : "Paste a Spline scene URL here when the final 3D asset is approved."}
            </p>
          </div>
          <span className="rounded-full border border-white/[0.10] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/[0.44]">
            Lazy
          </span>
        </div>
      </div>
    );
  },
}));

export default function SplineViewerPlaceholder(props: SplineViewerPlaceholderProps) {
  return (
    <Suspense
      fallback={
        <div className={`min-h-[280px] rounded-[2rem] border border-white/[0.10] bg-white/[0.035] ${props.className ?? ""}`} />
      }
    >
      <div className={props.className}>
        <EmptySplineScene {...props} />
      </div>
    </Suspense>
  );
}
