export type Pass587ChartViewportIdentity = {
  version: "pass587-chart-viewport-identity";
  canonicalInstrument: string;
  canonicalRange: string;
  providerRoute: string;
  routeFingerprint: string;
  storageKey: string;
};

export type Pass587ChartViewportState = {
  version: "pass587-chart-viewport-state";
  identity: Pass587ChartViewportIdentity;
  windowSize: number;
  panOffset: number;
  savedAt: number;
};

const PREFIX = "velmere:chart-viewport:v2:";
const MAX_AGE_MS = 1000 * 60 * 60 * 12;

function normalizeToken(value: string | undefined, fallback: string) {
  const normalized = (value || "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._:/-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || fallback;
}

function fingerprint(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).padStart(7, "0");
}

export function buildPass587ChartViewportIdentity(input: {
  symbol?: string;
  range?: string;
  source?: string;
  secondarySource?: string;
  providerRouteId?: string;
}): Pass587ChartViewportIdentity {
  const canonicalInstrument = normalizeToken(input.symbol, "unknown").toUpperCase();
  const canonicalRange = normalizeToken(input.range, "default");
  const providerRoute = [
    normalizeToken(input.providerRouteId, "route"),
    normalizeToken(input.source, "primary-unavailable"),
    normalizeToken(input.secondarySource, "secondary-unavailable"),
  ].join("|");
  const routeFingerprint = fingerprint(providerRoute);
  return {
    version: "pass587-chart-viewport-identity",
    canonicalInstrument,
    canonicalRange,
    providerRoute,
    routeFingerprint,
    storageKey: `${PREFIX}${canonicalInstrument}:${canonicalRange}:${routeFingerprint}`,
  };
}

function sameIdentity(
  left: Pass587ChartViewportIdentity,
  right: Pass587ChartViewportIdentity,
) {
  return (
    left.version === right.version &&
    left.canonicalInstrument === right.canonicalInstrument &&
    left.canonicalRange === right.canonicalRange &&
    left.providerRoute === right.providerRoute &&
    left.routeFingerprint === right.routeFingerprint &&
    left.storageKey === right.storageKey
  );
}

export function readPass587ChartViewport(
  identity: Pass587ChartViewportIdentity,
  now = Date.now(),
): Pass587ChartViewportState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(identity.storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Pass587ChartViewportState>;
    const valid =
      parsed.version === "pass587-chart-viewport-state" &&
      parsed.identity?.version === "pass587-chart-viewport-identity" &&
      sameIdentity(parsed.identity, identity) &&
      typeof parsed.windowSize === "number" &&
      Number.isFinite(parsed.windowSize) &&
      parsed.windowSize > 0 &&
      typeof parsed.panOffset === "number" &&
      Number.isFinite(parsed.panOffset) &&
      parsed.panOffset >= 0 &&
      typeof parsed.savedAt === "number" &&
      now - parsed.savedAt <= MAX_AGE_MS;
    if (!valid) {
      window.sessionStorage.removeItem(identity.storageKey);
      return null;
    }
    return parsed as Pass587ChartViewportState;
  } catch {
    return null;
  }
}

export function writePass587ChartViewport(
  identity: Pass587ChartViewportIdentity,
  windowSize: number,
  panOffset: number,
  now = Date.now(),
) {
  if (typeof window === "undefined") return;
  if (
    !Number.isFinite(windowSize) ||
    windowSize <= 0 ||
    !Number.isFinite(panOffset) ||
    panOffset < 0
  ) {
    return;
  }
  try {
    const state: Pass587ChartViewportState = {
      version: "pass587-chart-viewport-state",
      identity,
      windowSize,
      panOffset,
      savedAt: now,
    };
    window.sessionStorage.setItem(identity.storageKey, JSON.stringify(state));
  } catch {
    // View persistence is optional. Interaction must continue without storage.
  }
}
