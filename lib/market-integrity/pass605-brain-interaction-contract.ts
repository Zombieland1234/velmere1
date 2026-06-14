export type Pass605BrainAction = "move" | "select" | "close" | "none";

export type Pass605BrainNavigationResult = {
  version: "pass605-brain-interaction-contract";
  index: number;
  action: Pass605BrainAction;
};

export type Pass605BrainInteractionContract = {
  version: "pass605-brain-interaction-contract";
  nodeIds: string[];
  columns: number;
  targetFloorPx: 44;
  rovingTabIndex: true;
  dialogFocusTrap: true;
  touchAction: "pan-y";
  scrollOwnership: "dialog";
  instructions: string;
};

function clampIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return Math.max(0, Math.min(count - 1, index));
}

export function buildPass605BrainInteractionContract(input: {
  nodeIds: string[];
  viewportWidth?: number | null;
  coarsePointer?: boolean;
}): Pass605BrainInteractionContract {
  const width = Math.max(240, Number(input.viewportWidth) || 1024);
  const columns = width < 560 ? 1 : width < 920 || input.coarsePointer ? 2 : 3;
  return {
    version: "pass605-brain-interaction-contract",
    nodeIds: input.nodeIds.filter(Boolean),
    columns,
    targetFloorPx: 44,
    rovingTabIndex: true,
    dialogFocusTrap: true,
    touchAction: "pan-y",
    scrollOwnership: "dialog",
    instructions: "Use arrow keys to move, Enter or Space to select, and Escape to close.",
  };
}

export function resolvePass605BrainNavigation(input: {
  key: string;
  index: number;
  count: number;
  columns: number;
}): Pass605BrainNavigationResult {
  const count = Math.max(0, Math.floor(input.count));
  const columns = Math.max(1, Math.floor(input.columns));
  const index = clampIndex(input.index, count);
  switch (input.key) {
    case "ArrowRight":
      return { version: "pass605-brain-interaction-contract", index: clampIndex(index + 1, count), action: "move" };
    case "ArrowLeft":
      return { version: "pass605-brain-interaction-contract", index: clampIndex(index - 1, count), action: "move" };
    case "ArrowDown":
      return { version: "pass605-brain-interaction-contract", index: clampIndex(index + columns, count), action: "move" };
    case "ArrowUp":
      return { version: "pass605-brain-interaction-contract", index: clampIndex(index - columns, count), action: "move" };
    case "Home":
      return { version: "pass605-brain-interaction-contract", index: 0, action: "move" };
    case "End":
      return { version: "pass605-brain-interaction-contract", index: Math.max(0, count - 1), action: "move" };
    case "Enter":
    case " ":
      return { version: "pass605-brain-interaction-contract", index, action: "select" };
    case "Escape":
      return { version: "pass605-brain-interaction-contract", index, action: "close" };
    default:
      return { version: "pass605-brain-interaction-contract", index, action: "none" };
  }
}

export function resolvePass605FocusTrap(input: {
  activeIndex: number;
  focusableCount: number;
  shiftKey: boolean;
}): number {
  const count = Math.max(0, Math.floor(input.focusableCount));
  if (count <= 0) return 0;
  if (input.shiftKey) return input.activeIndex <= 0 ? count - 1 : input.activeIndex - 1;
  return input.activeIndex >= count - 1 ? 0 : input.activeIndex + 1;
}
