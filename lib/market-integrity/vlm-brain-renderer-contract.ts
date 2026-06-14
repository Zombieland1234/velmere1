export type VlmBrainRendererId = "dom-orbit" | "webgl-prototype";
export type VlmBrainRendererStatus = "active" | "gated" | "blocked";

export type VlmBrainRendererGate = {
  renderer: VlmBrainRendererId;
  status: VlmBrainRendererStatus;
  reason: string;
  requiresBrowserQa: boolean;
  keepsDomFallback: boolean;
};

export const VLM_BRAIN_WEBGL_FEATURE_GATE = "NEXT_PUBLIC_VLM_BRAIN_RENDERER";
export const VLM_BRAIN_QA_HUD_FEATURE_GATE = "NEXT_PUBLIC_VLM_BRAIN_QA_HUD";

export const VLM_BRAIN_RENDERER_CONTRACT = {
  defaultRenderer: "dom-orbit" as VlmBrainRendererId,
  experimentalRenderer: "webgl-prototype" as VlmBrainRendererId,
  hardRules: [
    "DOM Orbit 360 remains the safe fallback until browser FPS evidence is captured.",
    "WebGL must mount behind a feature gate and never replace the current modal shell in the same pass.",
    "No renderer can ask for seed phrases, private keys or financial actions.",
    "Renderer telemetry is a QA aid; it cannot become a public performance guarantee.",
    "FPS, zoom and WebGL trace HUD must stay hidden from public users unless the QA HUD feature gate is explicitly enabled.",
  ],
  qaMeasurements: [
    "average FPS over 30 seconds",
    "worst frame delta while the detail drawer is closed",
    "worst frame delta while reading a tile drawer",
    "pointer-drag latency on desktop",
    "reduced-motion and mobile downgrade behavior",
    "PASS205 WebGL prototype mount/unmount stability behind NEXT_PUBLIC_VLM_BRAIN_RENDERER",
    "PASS206 QA HUD gating: public VLM Brain hides FPS/zoom/watermark unless NEXT_PUBLIC_VLM_BRAIN_QA_HUD=1 or WebGL prototype gate is active",
  ],
  prototypeRules: [
    "PASS205 WebGL prototype must be isolated from clickable DOM Orbit cards.",
    "PASS205 WebGL prototype is rendered as a visual comparison layer only when the public feature gate is set.",
    "PASS205 WebGL prototype must preserve DOM Orbit, tile detail portals, keyboard flow and safe copy.",
  ],
} as const;

export function resolveVlmBrainRendererGate(input?: string): VlmBrainRendererGate {
  if (input === "webgl-prototype") {
    return {
      renderer: "webgl-prototype",
      status: "gated",
      reason:
        "PASS204 keeps WebGL isolated until DOM Orbit FPS and input-latency evidence can be compared in a real browser.",
      requiresBrowserQa: true,
      keepsDomFallback: true,
    };
  }

  return {
    renderer: "dom-orbit",
    status: "active",
    reason:
      "DOM Orbit 360 is still the production fallback; PASS204 adds telemetry and reading-pause protection without enabling a heavy renderer.",
    requiresBrowserQa: true,
    keepsDomFallback: true,
  };
}

// PASS204 marker: WebGL migration gate is typed, feature-gated and keeps DOM Orbit as fallback.
// PASS205 marker: WebGL prototype layer can mount behind NEXT_PUBLIC_VLM_BRAIN_RENDERER without replacing DOM Orbit.
// PASS206 marker: QA HUD / WebGL trace can be enabled with NEXT_PUBLIC_VLM_BRAIN_QA_HUD while public users see a clean Orbit UI.
