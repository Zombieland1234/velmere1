import { errors, read } from "./context.mjs";
import { setGuardScope } from "./context.mjs";

setGuardScope("pf.post-late-mobile.001");
// PASS476 mobile modal/chart/icon/i18n guard.
// PASS4729 updates the ownership checks to the current shared architecture:
// TokenRiskModal delegates chart gestures to AdvancedMarketChart, Real Markets
// delegates modal locking to AssetDetailModal, and VLM uses ModalRoot.
try {
  const modalLock = read("components/ui/useModalScrollLock.ts");
  const overlayPrimitives = read("components/ui/OverlayPrimitives.tsx");
  const tokenModal = read("components/market-integrity/TokenRiskModal.tsx");
  const advancedChart = read("components/market-integrity/AdvancedMarketChart.tsx");
  const realMarkets = read("components/market-integrity/CrossAssetCollapseRadarPanel.tsx");
  const assetDetailModal = read("components/market-integrity/AssetDetailModal.tsx");
  const assetModalRuntime = read("components/market-integrity/asset-detail/modal-runtime.ts");
  const browser = read("components/search/VelmereIntelligenceSearchClient.tsx");
  const vlmSwitch = read("components/vlm/VlmModeSwitch.tsx");
  const css = read("app/globals.css");

  for (const needle of [
    "__velmereModalScrollLock",
    'body.style.position = "fixed"',
    "window.scrollTo(current.scrollX, current.scrollY)",
  ]) {
    if (!modalLock.includes(needle)) errors.pushWithId.bind(errors, "mobile.001.legacy-modal-lock-missing-value.a001.legacy-modal-lock-missing-value")(`PASS476 modal lock missing ${needle}.`);
  }

  for (const needle of ["useModalScrollLock(mounted)", "<AdvancedMarketChart"]) {
    if (!tokenModal.includes(needle)) errors.pushWithId.bind(errors, "mobile.001.legacy-modal-lock-missing-value.a002.legacy-tokenriskmodal-missing-value")(`PASS476 TokenRiskModal missing ${needle}.`);
  }
  for (const needle of [
    'data-chart-gesture-surface="pan-pinch-wheel"',
    'data-pass2506-chart-wheel-touch-owner="svg-pan-pinch-wheel"',
    "pass586MobileChartGesturePolicy.touchAction",
  ]) {
    if (!advancedChart.includes(needle)) errors.pushWithId.bind(errors, "mobile.001.legacy-modal-lock-missing-value.a003.legacy-advancedmarketchart-missing-value")(`PASS476 AdvancedMarketChart missing ${needle}.`);
  }

  if (!realMarkets.includes("<AssetDetailModal")) {
    errors.pushWithId.bind(errors, "mobile.001.legacy-modal-lock-missing-value.a004.legacy-real-markets-must-delegate-the-selected-asset-pop")("PASS476 Real Markets must delegate the selected asset popup to AssetDetailModal.");
  }
  for (const needle of [
    "acquireAssetDetailScrollLock",
    "preventAssetDetailBackgroundScroll",
  ]) {
    if (!assetDetailModal.includes(needle)) errors.pushWithId.bind(errors, "mobile.001.legacy-modal-lock-missing-value.a005.legacy-assetdetailmodal-missing-value")(`PASS476 AssetDetailModal missing ${needle}.`);
    if (!assetModalRuntime.includes(needle)) errors.pushWithId.bind(errors, "mobile.001.legacy-modal-lock-missing-value.a006.legacy-asset-modal-runtime-missing-value")(`PASS476 asset modal runtime missing ${needle}.`);
  }

  if (!browser.includes("useModalScrollLock(pdfModalActive)")) {
    errors.pushWithId.bind(errors, "mobile.001.legacy-modal-lock-missing-value.a007.legacy-browser-pdf-must-use-shared-scroll-lock")("PASS476 Browser PDF must use shared scroll lock.");
  }

  for (const needle of ["<ModalRoot", "open={chartOpen}"]) {
    if (!vlmSwitch.includes(needle)) errors.pushWithId.bind(errors, "mobile.001.legacy-modal-lock-missing-value.a008.legacy-vlm-chart-modal-missing-value")(`PASS476 VLM chart modal missing ${needle}.`);
  }
  if (!overlayPrimitives.includes("useModalScrollLock(open && lockScroll)")) {
    errors.pushWithId.bind(errors, "mobile.001.legacy-modal-lock-missing-value.a009.legacy-modalroot-must-own-shared-scroll-locking")("PASS476 ModalRoot must own shared scroll locking.");
  }

  for (const needle of [
    "shield-product-nav-grid",
    "shield-chart-gesture-controls",
    "velmere-asset-logo-exchange",
  ]) {
    if (!css.includes(needle)) errors.pushWithId.bind(errors, "mobile.001.legacy-modal-lock-missing-value.a010.legacy-css-missing-value")(`PASS476 CSS missing ${needle}.`);
  }
} catch (error) {
  errors.pushWithId.bind(errors, "mobile.001.legacy-modal-lock-missing-value.a011.legacy-mobile-modal-chart-icon-i18n-guard-failed-value")(
    `PASS476 mobile modal/chart/icon/i18n guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
