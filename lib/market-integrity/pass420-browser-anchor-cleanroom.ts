import {
  PASS419_RUNTIME_CLOSE_EVENT,
  pass419ClampSuggestions,
  pass419NormalizeSuggestionKey,
  pass419SafeText,
  pass419SecurityPlainCopy,
  pass419TerminalPayloadStabilizer,
} from "./pass419-terminal-payload-stabilizer";

export const PASS420_RUNTIME_CLOSE_EVENT = "velmere:pass420:browser-anchor-cleanroom-close";

export const pass420BrowserAnchorCleanroom = {
  ...pass419TerminalPayloadStabilizer,
  version: "PASS420.browser_anchor_cleanroom",
  closeEvent: PASS420_RUNTIME_CLOSE_EVENT,
  upstreamCloseEvent: PASS419_RUNTIME_CLOSE_EVENT,
  browserRule:
    "Velmère Browser search is the first visible control, sticky under the nav, with exactly three suggestions rendered inline without internal scroll.",
  suggestionRule:
    "Lens suggestions are rounded, input-anchored, max-three and rendered in normal document flow so page scroll never hides or detaches them.",
  pdfCardRule:
    "A short Velmère Cybersecurity PDF description card stays directly under the search shell while the lower Lens capsule remains the selected-asset output.",
  chartRule:
    pass419TerminalPayloadStabilizer.chartRule,
  pdfRule:
    "Browser preview and PDF download keep one resolved payload, one locale, one field order and one checksum; PASS420 only changes the Browser shell layout.",
} as const;

export function pass420ClampSuggestions<T>(items: T[], keyOf: (item: T) => string, limit = 3): T[] {
  return pass419ClampSuggestions(items, keyOf, Math.min(3, Math.max(1, limit)));
}

export function pass420NormalizeSuggestionKey(value: string): string {
  return pass419NormalizeSuggestionKey(value);
}

export function pass420SafeText(value: unknown, fallback = "—"): string {
  return pass419SafeText(value, fallback);
}

export const pass420SecurityPlainCopy = [
  ...pass419SecurityPlainCopy,
  "PASS420 keeps the Browser simple: sticky input first, three visible suggestions without inner scroll, a short PDF trust card and the selected Lens capsule below.",
] as const;
