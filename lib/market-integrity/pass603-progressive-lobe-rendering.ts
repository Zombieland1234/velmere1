import type { UnifiedAuditMode } from "./unified-audit";

export type Pass603DevicePressure = "normal" | "constrained" | "critical";
export type Pass603Renderer = "webgl" | "fallback_2d" | "offscreen";

export type Pass603ProgressiveLobePlan = {
  version: "pass603-progressive-lobe-rendering";
  pressure: Pass603DevicePressure;
  renderer: Pass603Renderer;
  visualNodeIds: string[];
  accessibleNodeIds: string[];
  unmountedNodeIds: string[];
  lobeBudget: number;
  particleBudget: number;
  connectionBudget: number;
  dprCap: number;
  contentParity: true;
  reason: string;
};

export function assessPass603DevicePressure(input: {
  hardwareConcurrency?: number | null;
  deviceMemory?: number | null;
  viewportWidth?: number | null;
  coarsePointer?: boolean;
  runtimeTier?: string;
}): Pass603DevicePressure {
  const cores = Math.max(1, Number(input.hardwareConcurrency) || 4);
  const memory = Math.max(1, Number(input.deviceMemory) || 4);
  const width = Math.max(240, Number(input.viewportWidth) || 1024);
  const tier = String(input.runtimeTier || "balanced").toLowerCase();
  if (cores <= 2 || memory <= 2 || width < 360 || tier === "critical" || tier === "still") {
    return "critical";
  }
  if (cores <= 4 || memory <= 4 || width < 768 || input.coarsePointer || tier === "lite" || tier === "constrained") {
    return "constrained";
  }
  return "normal";
}

export function buildPass603ProgressiveLobeRendering(input: {
  mode: UnifiedAuditMode;
  lobeIds: string[];
  visible: boolean;
  webglSupported: boolean;
  reducedMotion?: boolean;
  hardwareConcurrency?: number | null;
  deviceMemory?: number | null;
  viewportWidth?: number | null;
  coarsePointer?: boolean;
  runtimeTier?: string;
}): Pass603ProgressiveLobePlan {
  const accessibleNodeIds = input.lobeIds.filter(Boolean);
  const pressure = assessPass603DevicePressure(input);
  if (!input.visible) {
    return {
      version: "pass603-progressive-lobe-rendering",
      pressure,
      renderer: "offscreen",
      visualNodeIds: [],
      accessibleNodeIds,
      unmountedNodeIds: accessibleNodeIds,
      lobeBudget: 0,
      particleBudget: 0,
      connectionBudget: 0,
      dprCap: 1,
      contentParity: true,
      reason: "offscreen_lobes_unmounted",
    };
  }

  const modeCap = input.mode === "advanced" ? 10 : input.mode === "pro" ? 7 : 5;
  const pressureCap = pressure === "normal" ? modeCap : pressure === "constrained" ? Math.min(7, modeCap) : Math.min(5, modeCap);
  const lobeBudget = Math.min(accessibleNodeIds.length, pressureCap);
  const visualNodeIds = accessibleNodeIds.slice(0, lobeBudget);
  const fallback = !input.webglSupported || pressure === "critical";
  const particleBudget = pressure === "normal" ? (input.mode === "advanced" ? 84 : input.mode === "pro" ? 64 : 48) : pressure === "constrained" ? 38 : 0;
  const connectionBudget = pressure === "normal" ? 28 : pressure === "constrained" ? 16 : 0;

  return {
    version: "pass603-progressive-lobe-rendering",
    pressure,
    renderer: fallback ? "fallback_2d" : "webgl",
    visualNodeIds,
    accessibleNodeIds,
    unmountedNodeIds: accessibleNodeIds.filter((id) => !visualNodeIds.includes(id)),
    lobeBudget,
    particleBudget,
    connectionBudget,
    dprCap: pressure === "normal" ? 1.5 : 1,
    contentParity: true,
    reason: fallback ? "semantic_2d_fallback_without_content_loss" : `visible_${pressure}_gpu_budget`,
  };
}
