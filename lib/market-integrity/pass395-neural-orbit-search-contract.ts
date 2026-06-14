export type Pass395AuditMode = "basic" | "pro" | "advanced";

export type Pass395NeuralField = {
  id: string;
  label: string;
  value: string;
  copy: string;
};

export const pass395SearchRuntimeContract = {
  version: "PASS395_SEARCH_ORBIT_LOCK",
  rule:
    "Browser, Shield and Real Markets close stale suggestion portals before submit, modal open, PDF forge and PDF download so no floating search layer survives a workflow transition.",
  browser: "Lens preview/download uses one resolved report object and closes the suggestion portal before PDF forge/download.",
  shield: "Shield search is local-first, closes stale frames on modal open, and never renders suggestions while a terminal is selected.",
  realMarkets: "Real Markets search closes stale frames on tab switch, row open, suggestion open and modal open.",
} as const;

export const pass395OrbitNeuralContract = {
  version: "PASS395_ORBIT360_NEURAL_BRAIN",
  visualRule:
    "Every Basic/Pro/Advanced readout starts from a VLM coin, blue neural links and a collection timer before transforming into a 10/14/20 field audit surface.",
  outputRule:
    "Basic shows 10 fields, Pro shows 14 fields and Advanced shows 20 fields; fields are short, source-aware and shared by Shield and Real Markets.",
  performanceRule:
    "Animation uses lightweight CSS/SVG primitives and pauses heavy DOM churn; it must remain stable on lower-end devices.",
} as const;

export const pass395CollectionPhases = [
  { id: "identity", label: "Identity seal", seconds: 0.7, copy: "symbol, route and logo are locked before readout" },
  { id: "market", label: "Market feed", seconds: 1.3, copy: "candles, volume and source rhythm are collected" },
  { id: "depth", label: "Depth lane", seconds: 2.1, copy: "order book / liquidity context is prepared when available" },
  { id: "source", label: "Second source", seconds: 3.4, copy: "freshness and fallback status stay visible" },
  { id: "security", label: "Security bridge", seconds: 4.8, copy: "contract, holder and anomaly lanes are routed" },
  { id: "readout", label: "Human readout", seconds: 6.2, copy: "VLM Brain collapses into short operator fields" },
] as const;

export function pass395ReadoutLimit(mode: Pass395AuditMode) {
  if (mode === "advanced") return 20;
  if (mode === "pro") return 14;
  return 10;
}

export function pass395CollectionSeconds(mode: Pass395AuditMode) {
  if (mode === "advanced") return 8.8;
  if (mode === "pro") return 7.1;
  return 5.2;
}

export function buildPass395NeuralOrbitReadout(input: {
  symbol: string;
  name: string;
  type: string;
  risk: number;
  source: string;
  mode: Pass395AuditMode;
}): {
  version: string;
  count: number;
  seconds: number;
  headline: string;
  body: string;
  fields: Pass395NeuralField[];
} {
  const count = pass395ReadoutLimit(input.mode);
  const seconds = pass395CollectionSeconds(input.mode);
  const riskBand = input.risk >= 66 ? "high review" : input.risk >= 38 ? "watch" : "calm";
  const fields: Pass395NeuralField[] = [
    { id: "identity", label: "Identity", value: input.symbol, copy: `${input.name} is resolved before any chart or PDF surface is shown.` },
    { id: "asset_class", label: "Class", value: input.type, copy: "The UI keeps crypto, FX, stock, ETF, real-estate and venue lanes separate." },
    { id: "risk", label: "Risk", value: `${Math.round(input.risk)}/100`, copy: `Current readout band: ${riskBand}; strong claims wait for source proof.` },
    { id: "source", label: "Source", value: input.source, copy: "Freshness and provider state stay visible instead of pretending full live coverage." },
    { id: "chart", label: "Candles", value: "OHLCV", copy: "The chart panel uses Shield-style candle grammar, volume rail and timeframe state." },
    { id: "depth", label: "Depth", value: "liquidity", copy: "Depth, spread and second-source lanes are separated from visual price movement." },
    { id: "holder", label: "Holders", value: "control", copy: "Holder concentration and unknown clusters stay as review fields, no hidden text walls." },
    { id: "velocity", label: "Velocity", value: "flow", copy: "Volume rhythm is read as pressure/context, not as a buy or sell command." },
    { id: "fallback", label: "Fallback", value: "visible", copy: "Fallback data remains labeled so the output does not look stronger than the evidence." },
    { id: "pdf", label: "PDF mirror", value: "same object", copy: "Browser preview and download must render from the same resolved report object." },
    { id: "second_source", label: "Second source", value: "compare", copy: "Divergence is shown as a confidence lane before the public readout is trusted." },
    { id: "provider", label: "Provider", value: "adapter", copy: "Provider timestamp, cache state and reconnect requirement are explicit lanes." },
    { id: "research", label: "Research", value: "lab", copy: "Prime/RNG/ECC research is framed as numerical audit and replication, not unsafe claims." },
    { id: "security", label: "Security", value: "redacted", copy: "Sensitive internals stay private while the public page explains the boundary clearly." },
    { id: "social", label: "Social", value: "context", copy: "Attention signals are treated as context and never as fake scarcity pressure." },
    { id: "macro", label: "Macro", value: "regime", copy: "FX, rates, commodities and equity pressure can be linked without mixing tables." },
    { id: "access", label: "Access", value: "VLM", copy: "Premium status is earned by proof depth and member tools, not by profit promises." },
    { id: "operator", label: "Operator", value: "next step", copy: "The next human step is short, visible and tied to the missing evidence lane." },
    { id: "layout", label: "Layout", value: "no overlap", copy: "Suggestion portals and modals close stale frames before every workflow transition." },
    { id: "launch", label: "Launch", value: "clean", copy: "Public surface stays premium: one brain, one chart, one PDF mirror, no debug pass wall." },
  ];

  return {
    version: pass395OrbitNeuralContract.version,
    count,
    seconds,
    headline: `${input.symbol} · VLM neural collection ${seconds.toFixed(1)}s`,
    body: `${count} short fields are prepared for ${input.mode}; the VLM coin collects market, source, liquidity and security lanes before the readout expands.`,
    fields: fields.slice(0, count),
  };
}
