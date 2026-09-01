import {  errors, read } from "./context.mjs";

import { setGuardScope } from "./context.mjs";



setGuardScope("pf.evidence-providers.010");

// guard script marker: verify-pass203-ai-brain-evidence-chain-safety.mjs
// PASS203

// PASS204 AI Brain FPS/WebGL gate guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const contractSource = read(
    "lib/market-integrity/vlm-brain-renderer-contract.ts",
  );
  const deltaSource = read("lib/launch/master-build-progress-delta-pass204.ts");
  const reportSource = read("docs/progress/PASS204_AI_BRAIN_FPS_WEBGL_GATE.md");
  for (const needle of [
    "type MotionTelemetryState",
    "motionTelemetry",
    "PASS204 FPS telemetry",
    'document.visibilityState === "visible" && !selectedNode',
    "shield-vlm-motion-health-chip",
  ]) {
    if (!modalSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.010.components-market-integrity-tokenriskmodalx-missing-lega.a001.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS204 telemetry marker ${needle}.`,
      );
  }
  for (const needle of [
    "PASS204 — AI Brain FPS telemetry chip + reading-pause governor",
    ".shield-vlm-motion-health-chip",
    ".shield-vlm-motion-health-throttled",
  ]) {
    if (!cssSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.010.components-market-integrity-tokenriskmodalx-missing-lega.a002.app-globals-css-missing-legacy-telemetry-css-marker-valu")(
        `app/globals.css: missing PASS204 telemetry CSS marker ${needle}.`,
      );
  }
  for (const needle of [
    "VLM_BRAIN_WEBGL_FEATURE_GATE",
    "resolveVlmBrainRendererGate",
    "DOM Orbit 360 remains the safe fallback",
  ]) {
    if (!contractSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.010.components-market-integrity-tokenriskmodalx-missing-lega.a003.lib-market-integrity-vlm-brain-renderer-contract-missing")(
        `lib/market-integrity/vlm-brain-renderer-contract.ts: missing PASS204 renderer contract marker ${needle}.`,
      );
  }
  for (const needle of [
    "velmerePass204ProgressDeltas",
    "D09",
    "D10",
    "D11",
    "D21",
    "D22",
    "J06",
    "Previous → Current → Change",
  ]) {
    if (!deltaSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.010.components-market-integrity-tokenriskmodalx-missing-lega.a004.lib-launch-master-build-progress-delta-legacy-missing-le")(
        `lib/launch/master-build-progress-delta-pass204.ts: missing PASS204 delta marker ${needle}.`,
      );
  }
  if (!reportSource.includes("PASS204 — AI Brain FPS Telemetry + WebGL Gate"))
    errors.pushWithId.bind(errors, "evidence.010.components-market-integrity-tokenriskmodalx-missing-lega.a005.docs-progress-legacy-ai-brain-fps-webgl-gate-md-missing")(
      "docs/progress/PASS204_AI_BRAIN_FPS_WEBGL_GATE.md: missing PASS204 report marker.",
    );
} catch (error) {
  errors.pushWithId.bind(errors, "evidence.010.components-market-integrity-tokenriskmodalx-missing-lega.a006.legacy-ai-brain-fps-webgl-gate-guard-failed-value")(
    `PASS204 AI Brain FPS/WebGL gate guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}



setGuardScope("pf.evidence-providers.011");

// guard script marker: verify-pass204-ai-brain-fps-webgl-gate-safety.mjs
// PASS204

// PASS205 AI Brain WebGL prototype isolation guard
try {
  const prototypeSource = read(
    "components/market-integrity/VlmBrainWebGLPrototype.tsx",
  );
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const contractSource = read(
    "lib/market-integrity/vlm-brain-renderer-contract.ts",
  );
  const deltaSource = read("lib/launch/master-build-progress-delta-pass205.ts");
  const reportSource = read(
    "docs/progress/PASS205_AI_BRAIN_WEBGL_PROTOTYPE_ISOLATION.md",
  );
  for (const needle of [
    "PASS205 marker: isolated WebGL prototype renderer",
    "NEXT_PUBLIC_VLM_BRAIN_RENDERER",
    'getContext("webgl"',
    "DOM fallback active",
  ]) {
    if (!prototypeSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.011.components-market-integrity-vlmbrainwebglprototypex-miss.a001.components-market-integrity-vlmbrainwebglprototypex-miss")(
        `components/market-integrity/VlmBrainWebGLPrototype.tsx: missing PASS205 prototype marker ${needle}.`,
      );
  }
  for (const needle of [
    "VlmBrainWebGLPrototype",
    "PASS205 marker: VLM Brain mounts an isolated feature-gated WebGL prototype layer",
    "paused={Boolean(selectedNode)}",
  ]) {
    if (!modalSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.011.components-market-integrity-vlmbrainwebglprototypex-miss.a002.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS205 modal marker ${needle}.`,
      );
  }
  for (const needle of [
    "PASS205 — AI Brain isolated WebGL prototype layer",
    ".shield-vlm-webgl-prototype-layer",
    ".shield-vlm-webgl-prototype-watermark",
    "prefers-reduced-motion: reduce",
  ]) {
    if (!cssSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.011.components-market-integrity-vlmbrainwebglprototypex-miss.a003.app-globals-css-missing-legacy-webgl-css-marker-value")(
        `app/globals.css: missing PASS205 WebGL CSS marker ${needle}.`,
      );
  }
  for (const needle of [
    "prototypeRules",
    "PASS205 WebGL prototype must be isolated",
    "PASS205 marker: WebGL prototype layer can mount",
  ]) {
    if (!contractSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.011.components-market-integrity-vlmbrainwebglprototypex-miss.a004.lib-market-integrity-vlm-brain-renderer-contract-missing")(
        `lib/market-integrity/vlm-brain-renderer-contract.ts: missing PASS205 renderer contract marker ${needle}.`,
      );
  }
  for (const needle of [
    "velmerePass205ProgressDeltas",
    "D11",
    "D21",
    "D22",
    "Previous → Current → Change",
  ]) {
    if (!deltaSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.011.components-market-integrity-vlmbrainwebglprototypex-miss.a005.lib-launch-master-build-progress-delta-legacy-missing-le")(
        `lib/launch/master-build-progress-delta-pass205.ts: missing PASS205 delta marker ${needle}.`,
      );
  }
  if (!reportSource.includes("PASS205 — AI Brain WebGL Prototype Isolation"))
    errors.pushWithId.bind(errors, "evidence.011.components-market-integrity-vlmbrainwebglprototypex-miss.a006.docs-progress-legacy-ai-brain-webgl-prototype-isolation")(
      "docs/progress/PASS205_AI_BRAIN_WEBGL_PROTOTYPE_ISOLATION.md: missing PASS205 report marker.",
    );
} catch (error) {
  errors.pushWithId.bind(errors, "evidence.011.components-market-integrity-vlmbrainwebglprototypex-miss.a007.legacy-ai-brain-webgl-prototype-isolation-guard-failed-v")(
    `PASS205 AI Brain WebGL prototype isolation guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
