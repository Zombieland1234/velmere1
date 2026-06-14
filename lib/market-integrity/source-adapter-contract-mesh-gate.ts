import type { VelmereSearchResult, VelmereSearchSourceMode } from "@/lib/search/intelligence-search-contract";
import type { SocialExchangeCommandSuggestion, SocialExchangeSurface } from "@/lib/market-integrity/social-exchange-command-router-gate";
import type { AdapterFaultSweepGate } from "@/lib/market-integrity/adapter-fault-sweep-gate";

export const PASS301_SOURCE_ADAPTER_CONTRACT_MESH_GATE = true;

export type SourceAdapterContractMeshSurface = SocialExchangeSurface | "lens_results" | "token_modal";

export type SourceAdapterContractMeshMode =
  | "contract_ready"
  | "source_mesh_review"
  | "adapter_retry_lane"
  | "operator_contract_lock";

export type SourceAdapterContractMeshLaneId =
  | "identity"
  | "market_depth"
  | "reserve_proof"
  | "contract_control"
  | "osint_context"
  | "provenance";

export type SourceAdapterContractMeshLane = {
  id: SourceAdapterContractMeshLaneId;
  label: string;
  state: "ready" | "review" | "retry" | "locked";
  score: number;
  adapterContract: string;
  timeoutMs: number;
  retryPolicy: string;
  customerBoundary: string;
  operatorProof: string;
};

export type SourceAdapterContractMeshAction = {
  id: string;
  label: string;
  posture: "continue" | "slow" | "hold";
  reason: string;
  safeBoundary: string;
};

export type SourceAdapterContractMeshGate = {
  version: "velmere_source_adapter_contract_mesh_gate_v1_pass301";
  surface: SourceAdapterContractMeshSurface;
  query: string;
  meshId: string;
  mode: SourceAdapterContractMeshMode;
  meshScore: number;
  timeoutPressure: number;
  adapterCoverage: number;
  proofTier: "atelier_contract" | "private_mesh" | "retry_quarantine" | "operator_lock";
  headline: string;
  lanes: SourceAdapterContractMeshLane[];
  actions: SourceAdapterContractMeshAction[];
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

function meshSlug(value: string) {
  return (value || "velmere")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 28) || "velmere";
}

function sourceScore(mode?: VelmereSearchSourceMode) {
  if (mode === "live_table") return 86;
  if (mode === "live") return 78;
  if (mode === "table") return 64;
  if (mode === "fallback") return 42;
  return 26;
}

function routerAverage(routerSuggestions: SocialExchangeCommandSuggestion[]) {
  return average(routerSuggestions.map((item) => item.routerScore), 44);
}

function textHas(text: string, terms: RegExp) {
  return terms.test(text);
}

function laneState(input: { score: number; retry?: boolean; lock?: boolean }): SourceAdapterContractMeshLane["state"] {
  if (input.lock) return "locked";
  if (input.retry || input.score < 48) return "retry";
  if (input.score >= 75) return "ready";
  return "review";
}

function modeFor(input: {
  meshScore: number;
  timeoutPressure: number;
  adapterCoverage: number;
  faultPressure: number;
  missingCount: number;
}): SourceAdapterContractMeshMode {
  if (input.faultPressure >= 72 || input.missingCount >= 10 || input.meshScore < 35) return "operator_contract_lock";
  if (input.timeoutPressure >= 62 || input.adapterCoverage < 48) return "adapter_retry_lane";
  if (input.meshScore >= 74 && input.adapterCoverage >= 66) return "contract_ready";
  return "source_mesh_review";
}

function proofTierFor(mode: SourceAdapterContractMeshMode): SourceAdapterContractMeshGate["proofTier"] {
  if (mode === "contract_ready") return "atelier_contract";
  if (mode === "source_mesh_review") return "private_mesh";
  if (mode === "adapter_retry_lane") return "retry_quarantine";
  return "operator_lock";
}

function headlineFor(mode: SourceAdapterContractMeshMode) {
  if (mode === "contract_ready") return "Source Adapter Contract Mesh can show a calm proof contract because adapter coverage and source freshness agree";
  if (mode === "source_mesh_review") return "Source Adapter Contract Mesh keeps the result in private review until source contracts are more complete";
  if (mode === "adapter_retry_lane") return "Source Adapter Contract Mesh found retry pressure and slows the customer-facing route";
  return "Source Adapter Contract Mesh locks public proof until faults, timeouts and missing adapters are reviewed";
}

function buildLane(input: {
  id: SourceAdapterContractMeshLaneId;
  label: string;
  score: number;
  signal: boolean;
  timeoutMs: number;
  adapterContract: string;
  customerBoundary: string;
  operatorProof: string;
  locked?: boolean;
}): SourceAdapterContractMeshLane {
  const retry = input.signal && input.score < 66;
  return {
    id: input.id,
    label: input.label,
    state: laneState({ score: input.score, retry, lock: input.locked }),
    score: clampScore(input.score),
    adapterContract: input.adapterContract,
    timeoutMs: input.timeoutMs,
    retryPolicy: retry ? "retry once, fall back to source-first review, keep raw payload operator-only" : "single calm probe with cached fallback and no hype escalation",
    customerBoundary: input.customerBoundary,
    operatorProof: input.operatorProof,
  };
}

export function buildSourceAdapterContractMeshGate(input: {
  surface: SourceAdapterContractMeshSurface;
  query?: string;
  results?: VelmereSearchResult[];
  routerSuggestions?: SocialExchangeCommandSuggestion[];
  adapterFaultSweepGate?: AdapterFaultSweepGate;
}): SourceAdapterContractMeshGate {
  const results = input.results ?? [];
  const routerSuggestions = input.routerSuggestions ?? [];
  const query = cleanQuery(input.query || results[0]?.symbol || results[0]?.title || routerSuggestions[0]?.symbol);
  const joinedText = [
    query,
    ...results.flatMap((item) => [item.title, item.summary, item.whyItMatters, item.nextOperatorStep, ...item.missingData, ...item.chips]),
    ...routerSuggestions.flatMap((item) => [item.symbol, item.name, item.reason ?? "", item.exchangeLabel, item.sourceLabel, item.socialLabel]),
  ].join(" ");

  const missingCount = results.reduce((sum, item) => sum + item.missingData.length, 0);
  const resultSourceScore = average(results.map((item) => sourceScore(item.sourceMode)), routerAverage(routerSuggestions));
  const resultConfidence = average(results.map((item) => item.sourceConfidence), routerAverage(routerSuggestions));
  const routerScore = routerAverage(routerSuggestions);
  const faultPressure = input.adapterFaultSweepGate?.faultPressure ?? clampScore(100 - average([resultSourceScore, resultConfidence], 50) + missingCount * 4);

  const hasDepth = textHas(joinedText, /depth|orderbook|order book|liquidity|spread|slippage|market/i);
  const hasReserve = textHas(joinedText, /reserve|proof|por|wallet|custody|backing|merkle/i);
  const hasContract = textHas(joinedText, /contract|owner|proxy|mint|pause|tax|blacklist|permission/i);
  const hasOsint = textHas(joinedText, /osint|social|narrative|kol|trend|hype|twitter|x |instagram|source/i);
  const hasProvenance = textHas(joinedText, /passport|provenance|traceability|authentic|lvmh|aura|dpp|ledger/i);

  const adapterCoverage = clampScore(
    average(
      [hasDepth, hasReserve, hasContract, hasOsint, hasProvenance].map((enabled) => (enabled ? 74 : 42)),
      52,
    ) * 0.42 +
      resultSourceScore * 0.34 +
      routerScore * 0.18 -
      missingCount * 1.2,
  );
  const timeoutPressure = clampScore(
    (100 - resultSourceScore) * 0.34 +
      (100 - adapterCoverage) * 0.28 +
      faultPressure * 0.26 +
      missingCount * 1.7,
  );
  const meshScore = clampScore(resultConfidence * 0.34 + resultSourceScore * 0.28 + adapterCoverage * 0.26 + (100 - timeoutPressure) * 0.12);
  const mode = modeFor({ meshScore, timeoutPressure, adapterCoverage, faultPressure, missingCount });
  const proofTier = proofTierFor(mode);
  const locked = mode === "operator_contract_lock";

  const lanes: SourceAdapterContractMeshLane[] = [
    buildLane({
      id: "identity",
      label: "Identity resolver",
      score: clampScore(resultConfidence * 0.5 + routerScore * 0.3 + resultSourceScore * 0.2),
      signal: !query,
      timeoutMs: 1100,
      adapterContract: "symbol/name/contract identity must resolve before depth, reserve or passport copy is shown",
      customerBoundary: "Show only the resolved label and source state; never imply verified safety from a name match.",
      operatorProof: "Input is normalized, capped and routed through local/live/table/fallback source modes.",
      locked,
    }),
    buildLane({
      id: "market_depth",
      label: "Market depth adapter",
      score: clampScore((hasDepth ? 78 : 48) + resultSourceScore * 0.18 - missingCount * 1.1),
      signal: hasDepth,
      timeoutMs: 1600,
      adapterContract: "venue depth, spread and liquidity context must sit beside the decision surface",
      customerBoundary: "Depth is context, not buy/sell instruction or execution guarantee.",
      operatorProof: "MEXC-style order depth is treated as a liquidity lane with stale/fallback states.",
      locked: locked && hasDepth,
    }),
    buildLane({
      id: "reserve_proof",
      label: "Reserve proof adapter",
      score: clampScore((hasReserve ? 74 : 46) + resultConfidence * 0.16 - faultPressure * 0.08),
      signal: hasReserve,
      timeoutMs: 1800,
      adapterContract: "reserve/backing proof must remain a transparency lane, not a solvency promise",
      customerBoundary: "Reserve copy stays bounded: snapshot, source, date and limitation.",
      operatorProof: "Proof-of-reserves style data is separated from liabilities, derivatives and off-chain obligations.",
      locked: locked && hasReserve,
    }),
    buildLane({
      id: "contract_control",
      label: "Contract control adapter",
      score: clampScore((hasContract ? 72 : 44) + resultSourceScore * 0.2 - missingCount * 1.4),
      signal: hasContract,
      timeoutMs: 1900,
      adapterContract: "owner/proxy/mint/pause/tax flags require second-source review before customer summary",
      customerBoundary: "Contract warnings are anomaly notes, not final fraud verdicts.",
      operatorProof: "Potential trap controls stay operator-visible until scanner adapters and chain context are connected.",
      locked: locked && hasContract,
    }),
    buildLane({
      id: "osint_context",
      label: "OSINT context adapter",
      score: clampScore((hasOsint ? 70 : 45) + routerScore * 0.2 - faultPressure * 0.05),
      signal: hasOsint,
      timeoutMs: 1400,
      adapterContract: "social trend, KOL and narrative signals must increase review pressure, not urgency pressure",
      customerBoundary: "Social attention never unlocks elite status without source/depth/provenance support.",
      operatorProof: "Meta/Instagram/X-style ranking is converted into transparent reasons and anti-FOMO friction.",
      locked: locked && hasOsint,
    }),
    buildLane({
      id: "provenance",
      label: "Provenance passport adapter",
      score: clampScore((hasProvenance ? 76 : 48) + resultConfidence * 0.16 + adapterCoverage * 0.12 - missingCount),
      signal: hasProvenance,
      timeoutMs: 1700,
      adapterContract: "passport/provenance proofs must document origin, source freshness and evidence limits",
      customerBoundary: "Luxury status is earned by traceability and can be withheld without shaming the user.",
      operatorProof: "LVMH/Aura-style DPP thinking becomes a source contract, not decorative proof copy.",
      locked: locked && hasProvenance,
    }),
  ];

  const actions: SourceAdapterContractMeshAction[] = [
    {
      id: "mesh_probe",
      label: mode === "contract_ready" ? "Open calm proof contract" : mode === "adapter_retry_lane" ? "Retry weak adapters first" : locked ? "Lock public proof route" : "Keep private mesh review",
      posture: mode === "contract_ready" ? "continue" : locked ? "hold" : "slow",
      reason: locked ? "fault or missing-adapter pressure is above the public proof threshold" : "adapter contracts must agree before customer-facing status escalates",
      safeBoundary: "No countdown, no fake scarcity, no buy/sell command and no guarantee of liquidity, solvency or safety.",
    },
    {
      id: "operator_contract_receipt",
      label: "Write source contract receipt",
      posture: locked ? "hold" : "continue",
      reason: "every adapter lane needs timeout, retry and public-copy rules before premium proof appears",
      safeBoundary: "Raw adapter payloads, stack traces and incomplete source data remain operator-only.",
    },
  ];

  return {
    version: "velmere_source_adapter_contract_mesh_gate_v1_pass301",
    surface: input.surface,
    query,
    meshId: `pass301-${meshSlug(query || input.surface)}-${proofTier}-${meshScore}`,
    mode,
    meshScore,
    timeoutPressure,
    adapterCoverage,
    proofTier,
    headline: headlineFor(mode),
    lanes,
    actions,
    customerMicrocopy:
      mode === "contract_ready"
        ? "Adapter contracts agree enough for a calm proof path, but the result remains research context."
        : locked
          ? "Public proof is locked until adapter faults and missing source contracts are reviewed."
          : "Velmère is checking adapter contracts before any premium status or report copy appears.",
    operatorMicrocopy: `Coverage ${adapterCoverage}/100 · timeout pressure ${timeoutPressure}/100 · fault pressure ${faultPressure}/100 · ${missingCount} missing lane(s).`,
    psychologyRules: [
      "FOMO is inverted: hype and missing adapters slow the route instead of accelerating it.",
      "Elite status is earned by source contracts, traceability and depth context, not visual polish.",
      "Ranking is explainable: every surface shows why an adapter is ready, retrying or locked.",
      "Customer copy stays calm; operator copy holds raw fault/source contract details.",
    ],
    blockedDarkPatterns: [
      "countdown timers",
      "only today / last chance pressure",
      "claims that liquidity, reserves or safety are certain",
      "hidden ranking score without reason",
      "buy/sell commands",
    ],
    innovation:
      "Source Adapter Contract Mesh: an exchange-grade/luxury-proof UI contract layer that displays timeout, retry, evidence and customer-copy rules before any proof badge can become visible.",
  };
}
