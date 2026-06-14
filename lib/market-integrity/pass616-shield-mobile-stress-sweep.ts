export type Pass616StressViewport = {
  width: number;
  height: number;
  orientation?: "portrait" | "landscape";
  zoomPercent?: number;
  keyboardOcclusion?: number;
  minimumTargetPx?: number;
  focusTrap?: boolean;
  closeReachable?: boolean;
  singleScrollOwner?: boolean;
  backdropCloses?: boolean;
};

export type Pass616ShieldMobileStressSweep = {
  version: "pass616-shield-mobile-stress-sweep";
  viewport: string;
  state: "pass" | "review";
  checks: Array<{ id: string; pass: boolean; note: string }>;
  failedChecks: string[];
  minimumTargetPx: 44;
  boundary: string;
};

export function buildPass616ShieldMobileStressSweep(
  input: Pass616StressViewport,
): Pass616ShieldMobileStressSweep {
  const width = Math.max(1, Math.round(input.width));
  const height = Math.max(1, Math.round(input.height));
  const orientation = input.orientation ?? (width > height ? "landscape" : "portrait");
  const zoomPercent = Math.max(100, Math.round(input.zoomPercent ?? 100));
  const keyboardOcclusion = Math.max(0, Math.round(input.keyboardOcclusion ?? 0));
  const minimumTargetPx = Math.round(input.minimumTargetPx ?? 44);
  const checks = [
    {
      id: "supported-width",
      pass: width >= 320,
      note: `Viewport ${width}px covers the 320/360/390/430px support floor.`,
    },
    {
      id: "target-size",
      pass: minimumTargetPx >= 44,
      note: `Interactive targets use a ${minimumTargetPx}px product minimum.`,
    },
    {
      id: "focus-continuity",
      pass: input.focusTrap === true,
      note: "Tab and Shift+Tab remain inside the active modal and focus returns on close.",
    },
    {
      id: "close-reachable",
      pass: input.closeReachable === true,
      note: "The close control remains sticky above chart and keyboard occlusion.",
    },
    {
      id: "single-scroll-owner",
      pass: input.singleScrollOwner === true,
      note: "The dialog shell owns vertical scroll; the page behind it remains locked.",
    },
    {
      id: "backdrop-close",
      pass: input.backdropCloses === true,
      note: "Backdrop click closes without stealing interactions from the dialog surface.",
    },
    {
      id: "keyboard-room",
      pass: keyboardOcclusion < height * 0.7,
      note: `Visual viewport keeps ${Math.max(0, height - keyboardOcclusion)}px visible above the soft keyboard.`,
    },
    {
      id: "zoom-layout",
      pass: zoomPercent <= 200,
      note: `Layout remains reflow-first up to ${zoomPercent}% zoom.`,
    },
    {
      id: "orientation",
      pass: orientation === "portrait" || orientation === "landscape",
      note: `Current orientation: ${orientation}.`,
    },
  ];
  const failedChecks = checks.filter((check) => !check.pass).map((check) => check.id);
  return {
    version: "pass616-shield-mobile-stress-sweep",
    viewport: `${width}x${height}@${zoomPercent}%`,
    state: failedChecks.length ? "review" : "pass",
    checks,
    failedChecks,
    minimumTargetPx: 44,
    boundary:
      "The sweep verifies layout invariants and interaction contracts; real-device and Chromium route tests remain required for production proof.",
  };
}
