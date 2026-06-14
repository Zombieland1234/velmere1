export type Pass586GestureAxis = "pending" | "horizontal" | "vertical";

export const pass586MobileChartGesturePolicy = {
  version: "pass586-mobile-chart-gestures",
  touchAction: "pan-y" as const,
  overscrollBehavior: "contain" as const,
  axisLockThresholdPx: 8,
  horizontalBias: 1.12,
  minimumTargetPx: 44,
  pageScrollOutsideHorizontalIntent: true,
  anchoredPinchZoom: true,
  pointerCancellationSafe: true,
};

export function resolvePass586GestureAxis(
  deltaX: number,
  deltaY: number,
  current: Pass586GestureAxis = "pending",
): Pass586GestureAxis {
  if (current !== "pending") return current;
  const absoluteX = Math.abs(deltaX);
  const absoluteY = Math.abs(deltaY);
  if (
    Math.max(absoluteX, absoluteY) <
    pass586MobileChartGesturePolicy.axisLockThresholdPx
  )
    return "pending";
  return absoluteX >= absoluteY * pass586MobileChartGesturePolicy.horizontalBias
    ? "horizontal"
    : "vertical";
}
