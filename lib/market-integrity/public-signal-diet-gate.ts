export const PASS314_PUBLIC_SIGNAL_DIET_GATE = true;

export type PublicSignalDietSurface =
  | "vlm_browser"
  | "shield_map"
  | "orbit_detail"
  | "research_lab"
  | "square"
  | "community"
  | "security";

export type PublicSignalDietDecision = {
  surface: PublicSignalDietSurface;
  publicMode: "search_first" | "brief_first" | "drawer_first" | "compact_trust";
  hiddenOperatorTelemetry: boolean;
  visibleCopyLimit: number;
  nextAction: string;
  antiClutterReason: string;
};

export function buildPublicSignalDietGate(surface: PublicSignalDietSurface): PublicSignalDietDecision {
  const defaults: Record<PublicSignalDietSurface, PublicSignalDietDecision> = {
    vlm_browser: {
      surface,
      publicMode: "search_first",
      hiddenOperatorTelemetry: true,
      visibleCopyLimit: 3,
      nextAction: "search capsule then Shield handoff or branded PDF preview",
      antiClutterReason: "Browser should feel like a clean discovery input, not an operator changelog wall.",
    },
    shield_map: {
      surface,
      publicMode: "brief_first",
      hiddenOperatorTelemetry: true,
      visibleCopyLimit: 5,
      nextAction: "run one investigator query and show one evidence queue",
      antiClutterReason: "Shield Map explains the workflow without rendering every historical PASS sync panel.",
    },
    orbit_detail: {
      surface,
      publicMode: "drawer_first",
      hiddenOperatorTelemetry: false,
      visibleCopyLimit: 8,
      nextAction: "open animated right-edge drawer with contained native scroll",
      antiClutterReason: "Tile detail needs motion and scroll containment so Orbit 360 does not feel frozen.",
    },
    research_lab: {
      surface,
      publicMode: "compact_trust",
      hiddenOperatorTelemetry: true,
      visibleCopyLimit: 4,
      nextAction: "show research thesis, limits and validation cards only",
      antiClutterReason: "Launch-control panels belong in operator review, not public research storytelling.",
    },
    square: {
      surface,
      publicMode: "compact_trust",
      hiddenOperatorTelemetry: true,
      visibleCopyLimit: 4,
      nextAction: "show board and community mode without launch-readiness wall",
      antiClutterReason: "Square should read like a calm community board, not a build dashboard.",
    },
    community: {
      surface,
      publicMode: "compact_trust",
      hiddenOperatorTelemetry: true,
      visibleCopyLimit: 3,
      nextAction: "route users to Square, waitlist or VLM access",
      antiClutterReason: "Community needs simple routing before member/session systems are real.",
    },
    security: {
      surface,
      publicMode: "compact_trust",
      hiddenOperatorTelemetry: true,
      visibleCopyLimit: 4,
      nextAction: "show implemented security posture without operator env checklist",
      antiClutterReason: "Public security copy must build trust without dumping internal Vercel/WAF operations.",
    },
  };

  return defaults[surface];
}
