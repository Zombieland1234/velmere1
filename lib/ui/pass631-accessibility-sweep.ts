export const PASS631_ACCESSIBILITY_VERSION = "pass631-reduced-motion-focus-contrast-sweep" as const;

type Rgb = readonly [number, number, number];

function channel(value: number): number {
  const normalized = Math.min(255, Math.max(0, value)) / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

export function pass631ContrastRatio(foreground: Rgb, background: Rgb): number {
  const luminance = (rgb: Rgb) => 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

export type AccessibilitySweepInput = {
  reducedMotionFunctional: boolean;
  focusContained: boolean;
  focusReturned: boolean;
  escapeCloses: boolean;
  minimumTargetPx: number;
  textContrastRatio: number;
  nonTextContrastRatio: number;
};

export type AccessibilitySweepResult = AccessibilitySweepInput & {
  state: "pass" | "review";
  blockers: string[];
};

export function auditPass631Accessibility(input: AccessibilitySweepInput): AccessibilitySweepResult {
  const blockers: string[] = [];
  if (!input.reducedMotionFunctional) blockers.push("reduced_motion_breaks_functionality");
  if (!input.focusContained) blockers.push("focus_escapes_modal");
  if (!input.focusReturned) blockers.push("focus_not_returned");
  if (!input.escapeCloses) blockers.push("escape_does_not_close");
  if (input.minimumTargetPx < 44) blockers.push("target_below_44px");
  if (input.textContrastRatio < 4.5) blockers.push("text_contrast_below_4_5");
  if (input.nonTextContrastRatio < 3) blockers.push("non_text_contrast_below_3");

  return { ...input, state: blockers.length === 0 ? "pass" : "review", blockers };
}

export const PASS631_SOURCE_STATE_CONTRAST = Object.freeze({
  live: pass631ContrastRatio([167, 243, 208], [8, 12, 14]),
  review: pass631ContrastRatio([253, 230, 138], [8, 12, 14]),
  blocked: pass631ContrastRatio([254, 202, 202], [8, 12, 14]),
});
