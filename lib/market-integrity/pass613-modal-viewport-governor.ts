export type Pass613ViewportSnapshot = {
  layoutWidth: number;
  layoutHeight: number;
  visualWidth: number;
  visualHeight: number;
  offsetLeft: number;
  offsetTop: number;
  scale: number;
  safeTop?: number;
  safeRight?: number;
  safeBottom?: number;
  safeLeft?: number;
};

export type Pass613ModalViewportGovernor = {
  version: "pass613-modal-viewport-governor";
  mode: "desktop" | "compact" | "keyboard" | "zoomed";
  width: number;
  height: number;
  offsetLeft: number;
  offsetTop: number;
  scale: number;
  keyboardOcclusion: number;
  maxDialogHeight: number;
  inlinePadding: number;
  blockPadding: number;
  stickyHeader: true;
  stickyTierControls: true;
  singleScrollOwner: "dialog_shell";
  minimumTargetPx: 44;
  cssVariables: Record<string, string>;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function finite(value: number | undefined, fallback = 0) {
  return Number.isFinite(value) ? Number(value) : fallback;
}

export function buildPass613ModalViewportGovernor(
  input: Pass613ViewportSnapshot,
): Pass613ModalViewportGovernor {
  const layoutWidth = Math.max(1, finite(input.layoutWidth, input.visualWidth));
  const layoutHeight = Math.max(1, finite(input.layoutHeight, input.visualHeight));
  const visualWidth = Math.max(1, finite(input.visualWidth, layoutWidth));
  const visualHeight = Math.max(1, finite(input.visualHeight, layoutHeight));
  const offsetLeft = Math.max(0, finite(input.offsetLeft));
  const offsetTop = Math.max(0, finite(input.offsetTop));
  const scale = Math.max(1, finite(input.scale, 1));
  const safeTop = Math.max(0, finite(input.safeTop));
  const safeRight = Math.max(0, finite(input.safeRight));
  const safeBottom = Math.max(0, finite(input.safeBottom));
  const safeLeft = Math.max(0, finite(input.safeLeft));
  const keyboardOcclusion = Math.max(
    0,
    Math.round(layoutHeight - visualHeight - offsetTop),
  );
  const keyboardLikely = keyboardOcclusion >= 120;
  const zoomed = scale > 1.15 || visualWidth < layoutWidth * 0.78;
  const compact = visualWidth <= 760;
  const mode: Pass613ModalViewportGovernor["mode"] = keyboardLikely
    ? "keyboard"
    : zoomed
      ? "zoomed"
      : compact
        ? "compact"
        : "desktop";
  const inlinePadding = compact ? 0 : clamp(visualWidth * 0.02, 12, 28);
  const blockPadding = compact ? 0 : clamp(visualHeight * 0.025, 10, 24);
  const maxDialogHeight = Math.max(
    240,
    Math.floor(visualHeight - safeTop - safeBottom - blockPadding * 2),
  );

  return {
    version: "pass613-modal-viewport-governor",
    mode,
    width: Math.round(visualWidth),
    height: Math.round(visualHeight),
    offsetLeft: Math.round(offsetLeft),
    offsetTop: Math.round(offsetTop),
    scale,
    keyboardOcclusion,
    maxDialogHeight,
    inlinePadding: Math.round(inlinePadding + Math.max(safeLeft, safeRight)),
    blockPadding: Math.round(blockPadding + Math.max(safeTop, safeBottom)),
    stickyHeader: true,
    stickyTierControls: true,
    singleScrollOwner: "dialog_shell",
    minimumTargetPx: 44,
    cssVariables: {
      "--shield-vv-width": `${Math.round(visualWidth)}px`,
      "--shield-vv-height": `${Math.round(visualHeight)}px`,
      "--shield-vv-left": `${Math.round(offsetLeft)}px`,
      "--shield-vv-top": `${Math.round(offsetTop)}px`,
      "--shield-dialog-max-height": `${maxDialogHeight}px`,
      "--shield-keyboard-occlusion": `${keyboardOcclusion}px`,
      "--shield-dialog-inline-pad": `${Math.round(inlinePadding)}px`,
      "--shield-dialog-block-pad": `${Math.round(blockPadding)}px`,
    },
  };
}
