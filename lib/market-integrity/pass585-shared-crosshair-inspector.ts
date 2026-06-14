export type Pass585Candle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
};

export type Pass585InspectorItem = {
  id: "open" | "high" | "low" | "close" | "volume";
  shortLabel: string;
  label: string;
  value: string;
};

export type Pass585SharedCrosshairInspector = {
  version: "pass585-shared-crosshair-inspector";
  timestampLabel: string;
  changeLabel: string;
  direction: "up" | "down" | "flat";
  items: Pass585InspectorItem[];
  accessibleLabel: string;
  boundary: string;
};

function number(value: number, locale: string, maximumFractionDigits = 2) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value);
}

function compact(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

const labels = {
  pl: {
    open: "Otwarcie",
    high: "Maksimum",
    low: "Minimum",
    close: "Zamknięcie",
    volume: "Wolumen",
    change: "Zmiana",
  },
  de: {
    open: "Eröffnung",
    high: "Hoch",
    low: "Tief",
    close: "Schluss",
    volume: "Volumen",
    change: "Änderung",
  },
  en: {
    open: "Open",
    high: "High",
    low: "Low",
    close: "Close",
    volume: "Volume",
    change: "Change",
  },
} as const;

export function buildPass585SharedCrosshairInspector(input: {
  candle: Pass585Candle;
  previous?: Pass585Candle;
  locale: "pl" | "de" | "en";
  symbol?: string;
  source?: string;
  range?: string;
}): Pass585SharedCrosshairInspector {
  const c = labels[input.locale];
  const digits =
    Math.abs(input.candle.close) < 1
      ? 6
      : Math.abs(input.candle.close) < 10
        ? 4
        : 2;
  const change = input.previous?.close
    ? ((input.candle.close - input.previous.close) / input.previous.close) * 100
    : 0;
  const direction = change > 0 ? "up" : change < 0 ? "down" : "flat";
  const changeLabel = `${change > 0 ? "+" : ""}${change.toFixed(2)}%`;
  const timestampLabel = new Date(input.candle.timestamp * 1000).toLocaleString(
    input.locale,
  );
  const items: Pass585InspectorItem[] = [
    {
      id: "open",
      shortLabel: "O",
      label: c.open,
      value: number(input.candle.open, input.locale, digits),
    },
    {
      id: "high",
      shortLabel: "H",
      label: c.high,
      value: number(input.candle.high, input.locale, digits),
    },
    {
      id: "low",
      shortLabel: "L",
      label: c.low,
      value: number(input.candle.low, input.locale, digits),
    },
    {
      id: "close",
      shortLabel: "C",
      label: c.close,
      value: number(input.candle.close, input.locale, digits),
    },
    {
      id: "volume",
      shortLabel: "V",
      label: c.volume,
      value: input.candle.volume
        ? compact(input.candle.volume, input.locale)
        : "—",
    },
  ];
  const context = [input.symbol, input.range, input.source]
    .filter(Boolean)
    .join(" · ");
  return {
    version: "pass585-shared-crosshair-inspector",
    timestampLabel,
    changeLabel,
    direction,
    items,
    accessibleLabel: `${context ? `${context}. ` : ""}${timestampLabel}. ${items.map((item) => `${item.label}: ${item.value}`).join(", ")}. ${c.change}: ${changeLabel}.`,
    boundary:
      "Shield, VLM and Real Markets read the same selected candle contract; no surface may invent a different OHLC or timestamp value.",
  };
}
