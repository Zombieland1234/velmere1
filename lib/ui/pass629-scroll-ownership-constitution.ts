export const PASS629_SCROLL_VERSION = "pass629-scroll-ownership-constitution" as const;

export type ScrollOwnershipInput = {
  activeOwners: number;
  regionScrollTop: number;
  regionScrollHeight: number;
  regionClientHeight: number;
  deltaY: number;
};

export type ScrollOwnershipDecision = {
  pageLocked: boolean;
  regionCanConsume: boolean;
  preventBackgroundScroll: boolean;
  restorePagePositionOnFinalClose: boolean;
};

export function resolvePass629ScrollOwnership(input: ScrollOwnershipInput): ScrollOwnershipDecision {
  const activeOwners = Math.max(0, Math.floor(input.activeOwners));
  const pageLocked = activeOwners > 0;
  const maxScrollTop = Math.max(0, input.regionScrollHeight - input.regionClientHeight);
  const hasScrollableRegion = maxScrollTop > 1;
  const regionCanConsume = hasScrollableRegion && (
    input.deltaY < 0
      ? input.regionScrollTop > 0
      : input.deltaY > 0
        ? input.regionScrollTop < maxScrollTop - 1
        : true
  );

  return {
    pageLocked,
    regionCanConsume,
    preventBackgroundScroll: pageLocked && !regionCanConsume,
    restorePagePositionOnFinalClose: activeOwners === 1,
  };
}
