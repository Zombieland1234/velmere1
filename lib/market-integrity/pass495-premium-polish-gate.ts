export const pass495PremiumPolishGate = {
  version: "pass495-premium-polish-gate",
  neural: {
    interactiveAxes: true,
    interactiveReasoning: true,
    progressiveAttention: true,
    evidenceSpotlight: true,
    fakeDataBlocked: true,
  },
  pdf: {
    activePageObserver: true,
    readerBinaryParityRequired: true,
    stickyNavigation: true,
    scrollSnapProximity: true,
  },
  motion: {
    reducedMotionRequired: true,
    deviceBudgetRequired: true,
    simultaneousAttentionCap: 1,
  },
  release: {
    locales: ["pl", "de", "en"] as const,
    mobileWidths: [360, 390, 430] as const,
    desktopWidths: [1280, 1440] as const,
  },
} as const;
