export const PASS1934_RUNTIME_CLICK_PROOF = {
  id: "pass1934-runtime-click-proof-final-audit",
  range: "PASS1934-PASS1973",
  target: "cart-language-wallet-account-audit-registry-rectangular-modal",
  status: "ready_for_browser_click_proof",
  tasks: 64,
  lanes: [
    "cart pointer click keyboard hard-open",
    "cart empty-state bottom sheet visibility",
    "dropdown anchored exclusive surfaces",
    "audit registry searchable public index",
    "shield rectangular modal",
    "real markets rectangular modal",
    "runtime debug console payload",
    "legacy circular bubble regression block",
  ] as const,
  requiredSelectors: [
    '[data-testid="velmere-header-cart-trigger"]',
    '[data-testid="velmere-cart-bottom-sheet"]',
    '[data-testid="velmere-cart-empty-state"]',
    '[data-testid="velmere-header-language-trigger"]',
    '[data-testid="velmere-header-wallet-trigger"]',
    '[data-testid="velmere-header-account-trigger"]',
    '[data-unified-asset-rect-chart="true"]',
    '[data-unified-asset-depth-rail="rectangular-attached"]',
    '[data-pass1894-registry-listing]',
  ] as const,
  hardRules: {
    noHydrationBlockedCart: true,
    noLeftCornerDropdowns: true,
    noCircularPublicAssetModal: true,
    noBubbleRailPublicAssetModal: true,
    noPageScrollOnChartWheel: true,
    noCertifiedSafeClaim: true,
    noNoRiskClaim: true,
  },
};

export function getPass1934RuntimeClickProofSummary() {
  return {
    passId: PASS1934_RUNTIME_CLICK_PROOF.id,
    taskCount: PASS1934_RUNTIME_CLICK_PROOF.tasks,
    status: PASS1934_RUNTIME_CLICK_PROOF.status,
    requiredSelectors: PASS1934_RUNTIME_CLICK_PROOF.requiredSelectors.length,
    hardRules: PASS1934_RUNTIME_CLICK_PROOF.hardRules,
  };
}
