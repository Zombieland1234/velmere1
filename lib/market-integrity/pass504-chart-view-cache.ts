export type Pass504ChartView = {
  version: "pass504-chart-view-cache";
  windowSize: number;
  panOffset: number;
  savedAt: number;
};

const PREFIX = "velmere:chart-view:v1:";
const MAX_AGE_MS = 1000 * 60 * 60 * 12;

function key(symbol?: string, range?: string) {
  return `${PREFIX}${(symbol || "unknown").toUpperCase()}:${(range || "default").toLowerCase()}`;
}

export function readPass504ChartView(symbol?: string, range?: string): Pass504ChartView | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key(symbol, range));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Pass504ChartView>;
    if (
      parsed.version !== "pass504-chart-view-cache" ||
      typeof parsed.windowSize !== "number" ||
      typeof parsed.panOffset !== "number" ||
      typeof parsed.savedAt !== "number" ||
      Date.now() - parsed.savedAt > MAX_AGE_MS
    ) {
      window.sessionStorage.removeItem(key(symbol, range));
      return null;
    }
    return parsed as Pass504ChartView;
  } catch {
    return null;
  }
}

export function writePass504ChartView(
  symbol: string | undefined,
  range: string | undefined,
  windowSize: number,
  panOffset: number,
) {
  if (typeof window === "undefined") return;
  try {
    const value: Pass504ChartView = {
      version: "pass504-chart-view-cache",
      windowSize,
      panOffset,
      savedAt: Date.now(),
    };
    window.sessionStorage.setItem(key(symbol, range), JSON.stringify(value));
  } catch {
    // Storage is optional. Chart interaction must continue without it.
  }
}
