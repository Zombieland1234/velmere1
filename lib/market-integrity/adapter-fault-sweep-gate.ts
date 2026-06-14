import type { VelmereSearchResult } from "@/lib/search/intelligence-search-contract";
import type { SocialExchangeCommandSuggestion, SocialExchangeSurface } from "@/lib/market-integrity/social-exchange-command-router-gate";

export const PASS300_ADAPTER_FAULT_SWEEP_GATE = true;

export type AdapterFaultSweepSurface = SocialExchangeSurface | "lens_results" | "token_modal";

export type AdapterFaultSweepMode =
  | "clean_probe"
  | "adapter_review"
  | "runtime_quarantine"
  | "operator_lock";

export type AdapterFaultSweepLane = {
  id: "runtime" | "typescript" | "search_portal" | "adapter_quorum" | "provenance_trace";
  label: string;
  state: "clear" | "review" | "quarantine" | "locked";
  score: number;
  note: string;
  proof: string;
};

export type AdapterFaultSweepAction = {
  id: string;
  label: string;
  posture: "continue" | "slow" | "hold";
  reason: string;
  safeBoundary: string;
};

export type AdapterFaultSweepGate = {
  version: "velmere_adapter_fault_sweep_gate_v1_pass300";
  surface: AdapterFaultSweepSurface;
  query: string;
  sweepId: string;
  mode: AdapterFaultSweepMode;
  runtimeScore: number;
  adapterScore: number;
  faultPressure: number;
  proofTier: "quiet_atelier" | "private_operator" | "source_quarantine" | "locked_vault";
  headline: string;
  lanes: AdapterFaultSweepLane[];
  actions: AdapterFaultSweepAction[];
  customerMicrocopy: string;
  operatorMicrocopy: string;
  psychologyRules: string[];
  blockedDarkPatterns: string[];
  innovation: string;
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function average(values: number[], fallback = 0) {
  const filtered = values.filter((value) => Number.isFinite(value));
  if (!filtered.length) return fallback;
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

function cleanQuery(value?: string) {
  return (value ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
}

function sweepSlug(value: string) {
  return (value || "velmere")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 28) || "velmere";
}

function sourceModeScore(results: VelmereSearchResult[]) {
  if (!results.length) return 42;
  return average(
    results.map((item) => {
      if (item.sourceMode === "live_table") return 84;
      if (item.sourceMode === "live") return 76;
      if (item.sourceMode === "table") return 63;
      if (item.sourceMode === "fallback") return 44;
      return 28;
    }),
    42,
  );
}

function routerScore(routerSuggestions: SocialExchangeCommandSuggestion[]) {
  return average(routerSuggestions.map((item) => item.routerScore), 44);
}

function containsFaultTerms(text: string) {
  return /error|runtime|undefined|not defined|typecheck|typescript|adapter|source|fallback|timeout|portal|dropdown|modal|scroll|z-index|orderbook|depth|reserve|passport|provenance/i.test(text);
}

function laneState(input: { score: number; fault?: boolean; lock?: boolean }): AdapterFaultSweepLane["state"] {
  if (input.lock) return "locked";
  if (input.fault && input.score < 54) return "quarantine";
  if (input.score >= 76 && !input.fault) return "clear";
  return "review";
}

function modeFor(input: {
  runtimeScore: number;
  adapterScore: number;
  faultPressure: number;
  missingCount: number;
  hasFaultTerms: boolean;
}): AdapterFaultSweepMode {
  if (input.runtimeScore < 38 || input.missingCount >= 9) return "operator_lock";
  if (input.hasFaultTerms || input.faultPressure >= 62) return "runtime_quarantine";
  if (input.adapterScore < 66) return "adapter_review";
  return "clean_probe";
}

function proofTierFor(mode: AdapterFaultSweepMode): AdapterFaultSweepGate["proofTier"] {
  if (mode === "clean_probe") return "quiet_atelier";
  if (mode === "adapter_review") return "private_operator";
  if (mode === "runtime_quarantine") return "source_quarantine";
  return "locked_vault";
}

function headlineFor(mode: AdapterFaultSweepMode) {
  if (mode === "clean_probe") return "Adapter Fault Sweep sees no active UI/runtime pressure and allows a calm source-first path";
  if (mode === "adapter_review") return "Adapter Fault Sweep keeps the surface in private review until source quorum and adapter coverage improve";
  if (mode === "runtime_quarantine") return "Adapter Fault Sweep detected possible runtime/search/source pressure and slows the next action";
  return "Adapter Fault Sweep locks the public proof surface until runtime and adapter evidence are reviewed";
}

export function buildAdapterFaultSweepGate(input: {
  surface: AdapterFaultSweepSurface;
  query?: string;
  results?: VelmereSearchResult[];
  routerSuggestions?: SocialExchangeCommandSuggestion[];
  knownFaults?: string[];
}): AdapterFaultSweepGate {
  const results = input.results ?? [];
  const routerSuggestions = input.routerSuggestions ?? [];
  const knownFaults = input.knownFaults ?? [];
  const query = cleanQuery(input.query || results[0]?.symbol || results[0]?.title || routerSuggestions[0]?.symbol);
  const text = [query, ...knownFaults, ...results.flatMap((item) => [item.title, item.summary, item.nextOperatorStep, ...item.missingData])].join(" ");
  const hasFaultTerms = containsFaultTerms(text);
  const missingCount = results.reduce((sum, item) => sum + item.missingData.length, 0);
  const sourceScore = sourceModeScore(results);
  const routingScore = routerScore(routerSuggestions);
  const confidenceScore = average(results.map((item) => item.sourceConfidence), routingScore);
  const runtimeScore = clampScore(average([confidenceScore, sourceScore, 100 - Math.min(knownFaults.length * 18, 72)], 58));
  const adapterScore = clampScore(average([sourceScore, routingScore, 100 - Math.min(missingCount * 4, 80)], 54));
  const faultPressure = clampScore(100 - average([runtimeScore, adapterScore], 50) + knownFaults.length * 10 + (hasFaultTerms ? 14 : 0));
  const mode = modeFor({ runtimeScore, adapterScore, faultPressure, missingCount, hasFaultTerms });
  const proofTier = proofTierFor(mode);

  const lanes: AdapterFaultSweepLane[] = [
    {
      id: "runtime",
      label: "Runtime surface",
      state: laneState({ score: runtimeScore, fault: knownFaults.length > 0, lock: mode === "operator_lock" }),
      score: runtimeScore,
      note: knownFaults.length ? `${knownFaults.length} known fault(s) stay operator-visible` : "no active runtime fault injected into this surface",
      proof: "Undefined variables, modal callbacks and browser-only boundaries must pass before premium proof copy unlocks.",
    },
    {
      id: "typescript",
      label: "Type/prop sweep",
      state: laneState({ score: clampScore(runtimeScore - knownFaults.length * 6), fault: knownFaults.some((item) => /type|prop|undefined/i.test(item)) }),
      score: clampScore(runtimeScore - knownFaults.length * 6),
      note: "static guard checks PASS300 markers plus the previous PASS299 runtime search quarantine",
      proof: "Every pass starts with error scan: duplicate props, stale identifiers, missing imports and unsafe render gates.",
    },
    {
      id: "search_portal",
      label: "Search portal",
      state: laneState({ score: clampScore(82 - Math.min(knownFaults.length * 8, 28)), fault: knownFaults.some((item) => /search|dropdown|portal|modal/i.test(item)) }),
      score: clampScore(82 - Math.min(knownFaults.length * 8, 28)),
      note: "suggestions must close before modal, scan or Shield handoff opens",
      proof: "The UI follows PASS299 quarantine: no floating search layer above a selected coin modal.",
    },
    {
      id: "adapter_quorum",
      label: "Adapter quorum",
      state: laneState({ score: adapterScore, fault: adapterScore < 64 }),
      score: adapterScore,
      note: "holder, orderbook, contract, reserve and OSINT lanes stay explicit instead of hidden behind one score",
      proof: "MEXC-style depth and reserve transparency require source lane separation before customer-facing summaries.",
    },
    {
      id: "provenance_trace",
      label: "Provenance trace",
      state: laneState({ score: clampScore(average([adapterScore, sourceScore], 55)), fault: missingCount > 5 }),
      score: clampScore(average([adapterScore, sourceScore], 55)),
      note: "luxury status stays earned by traceability, not fake scarcity",
      proof: "LVMH/Aura-style passport logic becomes a friction layer when traceability is weak.",
    },
  ];

  const hold = mode === "runtime_quarantine" || mode === "operator_lock";
  const actions: AdapterFaultSweepAction[] = [
    {
      id: "scan_first",
      label: hold ? "Run error sweep before opening proof copy" : "Keep source-first probe active",
      posture: hold ? "hold" : "continue",
      reason: hold ? "runtime/search/adapter uncertainty is higher than the public proof threshold" : "surface has enough evidence to keep the next step calm",
      safeBoundary: "Never convert a runtime-clean or adapter-partial state into buy/sell advice, a guarantee or a safety certificate.",
    },
    {
      id: "operator_receipt",
      label: "Write operator receipt",
      posture: mode === "clean_probe" ? "continue" : "slow",
      reason: "every premium status badge needs a traceable reason and a rollback path",
      safeBoundary: "Customer copy remains short; raw faults, stack traces and internal adapter details stay operator-only.",
    },
  ];

  return {
    version: "velmere_adapter_fault_sweep_gate_v1_pass300",
    surface: input.surface,
    query,
    sweepId: `pass300-${sweepSlug(query)}-${proofTier}`,
    mode,
    runtimeScore,
    adapterScore,
    faultPressure,
    proofTier,
    headline: headlineFor(mode),
    lanes,
    actions,
    customerMicrocopy: hold
      ? "Velmère slows this surface until runtime, search and adapter evidence are checked. Premium status is withheld when proof is incomplete."
      : "Velmère keeps this surface calm: source evidence stays visible and premium status is earned by checks, not urgency.",
    operatorMicrocopy: `PASS300 sweep: ${mode.replaceAll("_", " ")} · runtime ${runtimeScore}/100 · adapters ${adapterScore}/100 · pressure ${faultPressure}/100.`,
    psychologyRules: [
      "FOMO is inverted into friction: a noisy market or noisy UI requires more checks, not faster action.",
      "Elite status is earned by source quorum, runtime cleanliness and provenance traceability.",
      "The interface may create calm confidence, but never urgency, fake scarcity or certainty over missing data.",
    ],
    blockedDarkPatterns: [
      "countdown timers",
      "only X spots left",
      "guarantee-based token claims",
      "hidden ranking reasons",
      "modal or dropdown layers that obscure risk data",
    ],
    innovation:
      "Adapter Fault Sweep is a market-luxury preflight rail: every search, Shield modal and map investigation gets a visible proof/fault capsule before any elite badge or report copy can appear.",
  };
}
