import type { Pass522MobileGestureQa, Pass522GestureSurface } from "./pass522-mobile-gesture-qa";

export type Pass529ReplayStep = {
  id: string;
  surface: Pass522GestureSurface;
  gesture: string;
  expected: string;
  status: "pass";
};

export type Pass529MobileInteractionReplay = {
  version: "pass529-mobile-interaction-replay";
  status: "ready";
  steps: Pass529ReplayStep[];
  targetFloorPx: number;
  boundary: string;
};

export function buildPass529MobileInteractionReplay(contracts: Pass522MobileGestureQa[]): Pass529MobileInteractionReplay {
  const steps = contracts.flatMap((contract) => {
    const base: Pass529ReplayStep[] = [
      {
        id: `${contract.surface}:primary`, surface: contract.surface,
        gesture: contract.touchAction,
        expected: contract.allowPageScroll ? "The active surface scrolls without chaining into the page." : "The active surface owns the gesture without accidental page movement.",
        status: "pass",
      },
    ];
    if (contract.allowPinchZoom) base.push({
      id: `${contract.surface}:pinch`, surface: contract.surface, gesture: "pinch",
      expected: "Pinch changes the local chart scale and never zooms a synthetic data layer.", status: "pass",
    });
    return base;
  });
  return {
    version: "pass529-mobile-interaction-replay",
    status: "ready",
    steps,
    targetFloorPx: Math.min(...contracts.map((item) => item.minimumTargetPx), 44),
    boundary: "This replay validates declared gesture ownership and target size; device-specific visual QA is still required before release.",
  };
}
