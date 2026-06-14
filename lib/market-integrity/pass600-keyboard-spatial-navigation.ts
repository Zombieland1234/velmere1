export type Pass600SpatialAction = "focus" | "open" | "close" | "none";
export type Pass600SpatialNavigationResult = {
  version: "pass600-keyboard-spatial-navigation";
  action: Pass600SpatialAction;
  index: number;
  handled: boolean;
};

export function resolvePass600SpatialNavigation(input: {
  key: string;
  index: number;
  count: number;
  columns: number;
}): Pass600SpatialNavigationResult {
  const count = Math.max(0, Math.trunc(input.count));
  const columns = Math.max(1, Math.trunc(input.columns));
  const index = Math.min(Math.max(0, Math.trunc(input.index)), Math.max(0, count - 1));
  if (count === 0) {
    return { version: "pass600-keyboard-spatial-navigation", action: "none", index: 0, handled: false };
  }
  const rowStart = Math.floor(index / columns) * columns;
  const rowEnd = Math.min(count - 1, rowStart + columns - 1);
  const result = (action: Pass600SpatialAction, nextIndex: number, handled = true): Pass600SpatialNavigationResult => ({
    version: "pass600-keyboard-spatial-navigation",
    action,
    index: Math.min(Math.max(0, nextIndex), count - 1),
    handled,
  });
  switch (input.key) {
    case "ArrowRight":
      return result("focus", index === rowEnd ? rowStart : index + 1);
    case "ArrowLeft":
      return result("focus", index === rowStart ? rowEnd : index - 1);
    case "ArrowDown":
      return result("focus", Math.min(count - 1, index + columns));
    case "ArrowUp":
      return result("focus", Math.max(0, index - columns));
    case "Home":
      return result("focus", 0);
    case "End":
      return result("focus", count - 1);
    case "Enter":
    case " ":
      return result("open", index);
    case "Escape":
      return result("close", index);
    default:
      return result("none", index, false);
  }
}
