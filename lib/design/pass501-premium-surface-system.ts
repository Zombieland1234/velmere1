export const pass501PremiumSurfaceSystem = {
  version: "pass501-premium-surface-system",
  principle: "One active focus, stable layout, direct manipulation, and adaptive visual cost.",
  elevation: {
    base: "0 12px 34px rgba(0,0,0,.18)",
    focus: "0 22px 70px rgba(31,208,255,.14)",
    modal: "0 34px 120px rgba(0,0,0,.58)",
  },
  durationMs: { immediate: 120, fast: 200, standard: 340, deliberate: 520 },
  rules: [
    "No continuously moving decoration outside the active task.",
    "Blur is removed when reduced transparency, data saver, or constrained hardware is detected.",
    "Heavy surfaces use content visibility and paint containment where layout allows it.",
    "Focus, hover, pressed, loading, stale, and blocked states remain visually distinct.",
  ],
} as const;
