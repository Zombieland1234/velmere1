import {  errors, read } from "./context.mjs";
import { setGuardScope } from "./context.mjs";

setGuardScope("pf.security-operations.030");
// VLM brain explainer advanced guard
try {
  const tokenRiskModal = read("components/market-integrity/TokenRiskModal.tsx");
  const marketClient = read(
    "components/market-integrity/MarketIntegrityClient.tsx",
  );
  const globalsCss = read("app/globals.css");
  for (const needle of [
    "allowedMotionPresets",
    "const renderHeavyCanvas = false",
    "shield-vlm-detail-panel-solid",
    "operatorQuestion",
  ]) {
    if (!tokenRiskModal.includes(needle))
      errors.pushWithId.bind(errors, "security.030.components-market-integrity-tokenriskmodalx-missing-lega.a001.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS149 marker ${needle}.`,
      );
  }
  if (
    tokenRiskModal.includes('"lite"') ||
    tokenRiskModal.includes("'lite'") ||
    tokenRiskModal.includes('| "lite"')
  ) {
    errors.pushWithId.bind(errors, "security.030.components-market-integrity-tokenriskmodalx-missing-lega.a002.components-market-integrity-tokenriskmodalx-lite-motion")(
      "components/market-integrity/TokenRiskModal.tsx: Lite motion preset must remain removed.",
    );
  }
  for (const needle of [
    'sourceMode?: "local" | "live" | "merged"',
    "token suggestions · logo aware",
    "click to open Shield readout",
  ]) {
    if (!marketClient.includes(needle))
      errors.pushWithId.bind(errors, "security.030.components-market-integrity-tokenriskmodalx-missing-lega.a003.components-market-integrity-marketintegrityclientx-missi")(
        `components/market-integrity/MarketIntegrityClient.tsx: missing PASS149 marker ${needle}.`,
      );
  }
  for (const needle of [
    "PASS149 — Advanced-only orbit guard",
    ".shield-vlm-detail-panel-solid",
  ]) {
    if (!globalsCss.includes(needle))
      errors.pushWithId.bind(errors, "security.030.components-market-integrity-tokenriskmodalx-missing-lega.a004.app-globals-css-missing-legacy-marker-value")(`app/globals.css: missing PASS149 marker ${needle}.`);
  }
} catch (error) {
  errors.pushWithId.bind(errors, "security.030.components-market-integrity-tokenriskmodalx-missing-lega.a005.vlm-brain-explainer-advanced-guard-failed-value")(
    `VLM brain explainer advanced guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
