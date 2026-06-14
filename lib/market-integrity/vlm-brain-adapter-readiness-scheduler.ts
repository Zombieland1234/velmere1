import type { VlmBrainAdapterOrchestrationPlan } from "./vlm-brain-adapter-orchestration-plan";
import type { VlmBrainLiveAdapterFreshnessMesh } from "./vlm-brain-live-adapter-freshness";
import type { VlmBrainLiveFeedAdapterMatrix } from "./vlm-brain-live-feed-adapter-matrix";

export type VlmBrainAdapterReadinessTask = {
  id: string;
  label: string;
  priority: "P0" | "P1" | "P2";
  state: "blocked" | "refresh_required" | "server_required" | "review";
  retryPolicy: "no_retry_until_adapter" | "manual_refresh" | "backoff_15m" | "backoff_60m";
  ttlMinutes: number;
  nextAction: string;
};

export type VlmBrainAdapterReadinessScheduler = {
  schemaVersion: "vlm-brain-adapter-readiness-scheduler-v1-pass248";
  schedulerMode: "server_adapter_queue_preview";
  schedulerId: string;
  createdAt: string;
  token: { symbol: string; name: string };
  schedulerDecision: "blocked" | "refresh_required" | "review_queue";
  serverAdapterRequired: true;
  browserOnlyAllowed: false;
  customerExportAllowed: false;
  p0Count: number;
  p1Count: number;
  tasks: VlmBrainAdapterReadinessTask[];
  operatorSummary: string;
  customerBoundary: string;
};

const SCHEMA = "vlm-brain-adapter-readiness-scheduler-v1-pass248" as const;
function compact(value: unknown, fallback = "adapter readiness schedule required", limit = 300) { return String(value ?? fallback).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit) || fallback; }
function stableId(value: string) { return compact(value, "VLM-ADAPTER-SCHEDULER", 260).toUpperCase().replace(/[^A-Z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""); }
function priorityFor(state: string): "P0" | "P1" | "P2" { return state === "missing" || state === "blocked" || state === "expired" ? "P0" : state === "stale" || state === "partial" ? "P1" : "P2"; }
function retryFor(priority: "P0" | "P1" | "P2"): VlmBrainAdapterReadinessTask["retryPolicy"] { return priority === "P0" ? "no_retry_until_adapter" : priority === "P1" ? "manual_refresh" : "backoff_60m"; }

export function buildVlmBrainAdapterReadinessScheduler(
  feedMatrix: VlmBrainLiveFeedAdapterMatrix,
  freshness: VlmBrainLiveAdapterFreshnessMesh,
  orchestration: VlmBrainAdapterOrchestrationPlan,
): VlmBrainAdapterReadinessScheduler {
  const createdAt = feedMatrix.createdAt ?? freshness.createdAt ?? orchestration.createdAt ?? new Date().toISOString();
  const feedTasks = feedMatrix.feeds.map((feed) => {
    const priority = priorityFor(feed.state);
    return {
      id: `feed_${feed.id}`,
      label: feed.label,
      priority,
      state: feed.state === "missing" ? "blocked" as const : feed.state === "stale" ? "refresh_required" as const : feed.state === "partial" ? "review" as const : "server_required" as const,
      retryPolicy: retryFor(priority),
      ttlMinutes: priority === "P0" ? 0 : priority === "P1" ? 15 : 60,
      nextAction: feed.nextAction,
    } satisfies VlmBrainAdapterReadinessTask;
  });
  const freshnessTasks = freshness.lanes.slice(0, 6).map((lane) => {
    const priority = lane.refreshPriority;
    return {
      id: `freshness_${lane.id}`,
      label: lane.label,
      priority,
      state: lane.hardStop ? "blocked" as const : lane.state === "stale" ? "refresh_required" as const : "review" as const,
      retryPolicy: lane.hardStop ? "no_retry_until_adapter" as const : priority === "P1" ? "manual_refresh" as const : "backoff_60m" as const,
      ttlMinutes: lane.ttlMinutes,
      nextAction: lane.operatorAction,
    } satisfies VlmBrainAdapterReadinessTask;
  });
  const orchestrationTasks = orchestration.lanes.slice(0, 6).map((lane) => ({
    id: `orchestration_${lane.id}`,
    label: lane.label,
    priority: lane.state === "blocked" ? "P0" as const : lane.state === "review" ? "P1" as const : "P2" as const,
    state: lane.state === "blocked" ? "blocked" as const : lane.state === "review" ? "server_required" as const : "review" as const,
    retryPolicy: lane.state === "blocked" ? "no_retry_until_adapter" as const : "backoff_15m" as const,
    ttlMinutes: 15,
    nextAction: lane.nextAction,
  } satisfies VlmBrainAdapterReadinessTask));
  const tasks = [...feedTasks, ...freshnessTasks, ...orchestrationTasks];
  const p0Count = tasks.filter((item) => item.priority === "P0").length;
  const p1Count = tasks.filter((item) => item.priority === "P1").length;
  return {
    schemaVersion: SCHEMA,
    schedulerMode: "server_adapter_queue_preview",
    schedulerId: stableId(`VLM-ADAPTER-SCHEDULER-${feedMatrix.token.symbol}-${feedMatrix.matrixId}-${createdAt}`),
    createdAt,
    token: feedMatrix.token,
    schedulerDecision: p0Count > 0 ? "blocked" : p1Count > 0 ? "refresh_required" : "review_queue",
    serverAdapterRequired: true,
    browserOnlyAllowed: false,
    customerExportAllowed: false,
    p0Count,
    p1Count,
    tasks,
    operatorSummary: "PASS248 schedules missing/stale adapter lanes into P0/P1/P2 tasks so browser-only previews cannot masquerade as production data.",
    customerBoundary: "Adapter scheduler is internal operations metadata. Customer copy must only mention source confidence and missing-data boundaries.",
  };
}

export const PASS248_VLM_BRAIN_ADAPTER_READINESS_SCHEDULER_CONTRACT = true;
