export type Pass598ViewportState = "hidden" | "near" | "visible";
export type Pass598Pressure = "normal" | "constrained" | "critical";

export type Pass598VisibleNodeVirtualization = {
  version: "pass598-visible-node-virtualization";
  state: Pass598ViewportState;
  pressure: Pass598Pressure;
  mountedIndices: number[];
  mountCount: number;
  animate: boolean;
  useBackdropFilter: boolean;
  reason: string;
};

export function assessPass598DevicePressure(input: {
  hardwareConcurrency?: number | null;
  deviceMemory?: number | null;
  viewportWidth?: number | null;
  coarsePointer?: boolean;
}): Pass598Pressure {
  const cores = Math.max(0, Number(input.hardwareConcurrency ?? 0));
  const memory = Math.max(0, Number(input.deviceMemory ?? 0));
  const width = Math.max(0, Number(input.viewportWidth ?? 0));
  if ((cores > 0 && cores <= 2) || (memory > 0 && memory <= 2) || (width > 0 && width <= 390 && input.coarsePointer)) {
    return "critical";
  }
  if ((cores > 0 && cores <= 4) || (memory > 0 && memory <= 4) || (width > 0 && width <= 820) || input.coarsePointer) {
    return "constrained";
  }
  return "normal";
}

const ringWindow = (total: number, activeIndex: number, count: number) => {
  if (total <= 0 || count <= 0) return [];
  const safeActive = ((activeIndex % total) + total) % total;
  const values = new Set<number>([safeActive]);
  for (let distance = 1; values.size < Math.min(total, count); distance += 1) {
    values.add((safeActive + distance) % total);
    if (values.size < Math.min(total, count)) values.add((safeActive - distance + total) % total);
  }
  return Array.from(values).sort((left, right) => left - right);
};

export function buildPass598VisibleNodeVirtualization(input: {
  totalNodes: number;
  activeIndex?: number;
  viewportState: Pass598ViewportState;
  pressure: Pass598Pressure;
  reducedMotion?: boolean;
}): Pass598VisibleNodeVirtualization {
  const total = Math.max(0, Math.trunc(input.totalNodes));
  const activeIndex = Math.max(0, Math.trunc(input.activeIndex ?? 0));
  const budget =
    input.viewportState === "hidden"
      ? 0
      : input.viewportState === "near"
        ? input.pressure === "normal"
          ? 6
          : input.pressure === "constrained"
            ? 4
            : 3
        : input.pressure === "normal"
          ? total
          : input.pressure === "constrained"
            ? Math.min(total, 7)
            : Math.min(total, 5);
  const mountedIndices = ringWindow(total, activeIndex, budget);
  const animate = input.viewportState === "visible" && !input.reducedMotion && mountedIndices.length > 0;
  return {
    version: "pass598-visible-node-virtualization",
    state: input.viewportState,
    pressure: input.pressure,
    mountedIndices,
    mountCount: mountedIndices.length,
    animate,
    useBackdropFilter: input.pressure === "normal" && input.viewportState === "visible",
    reason:
      input.viewportState === "hidden"
        ? "offscreen_nodes_unmounted"
        : input.pressure === "critical"
          ? "critical_gpu_budget"
          : input.pressure === "constrained"
            ? "mobile_gpu_budget"
            : "full_visible_budget",
  };
}
