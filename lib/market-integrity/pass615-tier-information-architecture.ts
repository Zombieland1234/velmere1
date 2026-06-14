import type { Pass612OneSourceStateContract } from "./pass612-one-source-state-contract";

export type Pass615AnalysisTier = "basic" | "pro" | "advanced";
export type Pass615FieldState = "confirmed" | "limited" | "missing";

export type Pass615TierField = {
  id: string;
  label: string;
  value: string;
  state: Pass615FieldState;
  sourceLayerId: string;
  note: string;
};

export type Pass615TierManifest = {
  version: "pass615-tier-information-architecture";
  tier: Pass615AnalysisTier;
  fieldBudget: 10 | 14 | 20;
  fields: Pass615TierField[];
  distinctFieldCount: number;
  confirmedCount: number;
  limitedCount: number;
  missingCount: number;
  storageKey: "velmere:shield-analysis-tier:v1";
  boundary: string;
};

const BUDGET: Record<Pass615AnalysisTier, 10 | 14 | 20> = {
  basic: 10,
  pro: 14,
  advanced: 20,
};

const STORAGE_KEY = "velmere:shield-analysis-tier:v1" as const;

function valueOrMissing(value: unknown) {
  if (value === null || value === undefined || value === "" || value === "—") return null;
  if (typeof value === "number" && !Number.isFinite(value)) return null;
  return String(value);
}

function field(
  id: string,
  label: string,
  value: unknown,
  sourceLayerId: string,
  note: string,
  sourceContract: Pass612OneSourceStateContract,
): Pass615TierField {
  const normalized = valueOrMissing(value);
  const layer = sourceContract.layers.find((item) => item.id === sourceLayerId);
  let state: Pass615FieldState = normalized ? "confirmed" : "missing";
  if (
    normalized &&
    (!layer || layer.state === "partial" || layer.state === "stale" || layer.state === "fallback")
  ) {
    state = "limited";
  }
  if (!layer || layer.state === "offline") state = normalized ? "limited" : "missing";
  return {
    id,
    label,
    value: normalized ?? "—",
    state,
    sourceLayerId,
    note,
  };
}

export function normalizePass615Tier(value: unknown): Pass615AnalysisTier {
  return value === "pro" || value === "advanced" ? value : "basic";
}

export function readPass615Tier(): Pass615AnalysisTier {
  if (typeof window === "undefined") return "basic";
  try {
    return normalizePass615Tier(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return "basic";
  }
}

export function writePass615Tier(tier: Pass615AnalysisTier) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, tier);
  } catch {
    // Tier memory is an enhancement; analysis remains available without storage.
  }
}

export function buildPass615TierInformationArchitecture(input: {
  tier: Pass615AnalysisTier;
  sourceContract: Pass612OneSourceStateContract;
  labels: Record<string, string>;
  values: Record<string, unknown>;
}): Pass615TierManifest {
  const c = input.labels;
  const v = input.values;
  const all: Pass615TierField[] = [
    field("price", c.price ?? "Price", v.price, "market", "Current source-bound price.", input.sourceContract),
    field("change24h", c.change24h ?? "24h change", v.change24h, "market", "Observed 24h market move.", input.sourceContract),
    field("change7d", c.change7d ?? "7d change", v.change7d, "market", "Observed seven-day market move.", input.sourceContract),
    field("marketCap", c.marketCap ?? "Market cap", v.marketCap, "market", "Market scale from the current provider route.", input.sourceContract),
    field("volume", c.volume ?? "24h volume", v.volume, "market", "Recent turnover from the current provider route.", input.sourceContract),
    field("risk", c.risk ?? "Risk pressure", v.risk, "market", "Signal score bounded by available evidence.", input.sourceContract),
    field("confidence", c.confidence ?? "Confidence cap", v.confidence, "market", "Maximum confidence allowed by the weakest source layer.", input.sourceContract),
    field("sourceState", c.sourceState ?? "Source state", v.sourceState, "market", "Shared source state used across Shield surfaces.", input.sourceContract),
    field("candles", c.candles ?? "Candles", v.candles, "candles", "Number of source-bound bars loaded for the chart.", input.sourceContract),
    field("gaps", c.gaps ?? "Evidence gaps", v.gaps, "candles", "Known missing or limited evidence.", input.sourceContract),
    field("change1h", c.change1h ?? "1h change", v.change1h, "market", "Short-horizon market move.", input.sourceContract),
    field("fdv", c.fdv ?? "FDV / market cap", v.fdv, "market", "Dilution context for the current asset.", input.sourceContract),
    field("liquidity", c.liquidity ?? "Liquidity", v.liquidity, "orderbook", "Available liquidity evidence.", input.sourceContract),
    field("secondSource", c.secondSource ?? "Backup provider", v.secondSource, "candles", "Declared failover provider, not a fabricated confirmation.", input.sourceContract),
    field("slippage", c.slippage ?? "Simulated slippage", v.slippage, "orderbook", "Stress estimate based on loaded depth.", input.sourceContract),
    field("depth", c.depth ?? "Bid / ask depth", v.depth, "orderbook", "Visible buy and sell depth.", input.sourceContract),
    field("holders", c.holders ?? "Holders", v.holders, "holders", "Holder count when a source is attached.", input.sourceContract),
    field("concentration", c.concentration ?? "Top-10 concentration", v.concentration, "holders", "Concentration evidence when available.", input.sourceContract),
    field("supply", c.supply ?? "Supply / unlock pressure", v.supply, "contract", "Circulating supply and potential overhang.", input.sourceContract),
    field("contract", c.contract ?? "Contract / tax controls", v.contract, "contract", "Address, tax and contract-control evidence.", input.sourceContract),
  ];
  const fieldBudget = BUDGET[input.tier];
  const fields = all.slice(0, fieldBudget);
  const ids = new Set(fields.map((item) => item.id));
  return {
    version: "pass615-tier-information-architecture",
    tier: input.tier,
    fieldBudget,
    fields,
    distinctFieldCount: ids.size,
    confirmedCount: fields.filter((item) => item.state === "confirmed").length,
    limitedCount: fields.filter((item) => item.state === "limited").length,
    missingCount: fields.filter((item) => item.state === "missing").length,
    storageKey: STORAGE_KEY,
    boundary:
      "Basic exposes 10 unique fields, Pro 14 and Advanced 20. Higher tiers add new evidence dimensions rather than repeating lower-tier copy.",
  };
}
