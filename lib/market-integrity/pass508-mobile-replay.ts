import type { Pass506TimelineStep } from "@/lib/market-integrity/pass506-source-diff-timeline";

export type Pass508ReplayFrame = {
  id: string;
  step: number;
  label: string;
  state: Pass506TimelineStep["state"];
  summary: string;
};

export type Pass508MobileReplay = {
  version: "pass508-mobile-replay";
  frames: Pass508ReplayFrame[];
  compact: true;
};

export function buildPass508MobileReplay(steps: Pass506TimelineStep[]): Pass508MobileReplay {
  return {
    version: "pass508-mobile-replay",
    compact: true,
    frames: steps.slice(0, 6).map((item, index) => ({
      id: item.id,
      step: index + 1,
      label: item.title,
      state: item.state,
      summary: item.note || item.value,
    })),
  };
}
