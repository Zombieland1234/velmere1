import type { Pass517ProviderFailoverRuntime } from "./pass517-provider-failover-runtime";
import type { Pass518CrossProviderChartDiff } from "./pass518-cross-provider-chart-diff";

export type Pass524ProviderRouteStep = {
  id: "primary" | "standby" | "consensus" | "boundary";
  label: string;
  state: "healthy" | "ready" | "review" | "blocked";
  detail: string;
};

export type Pass524ProviderRouteLedger = {
  version: "pass524-provider-route-ledger";
  state: "resilient" | "single_route" | "degraded" | "blocked";
  activeSource: string;
  routeCount: number;
  confidenceCap: number;
  steps: Pass524ProviderRouteStep[];
  headline: string;
  nextAction: string;
  boundary: string;
};

export function buildPass524ProviderRouteLedger(
  failover: Pass517ProviderFailoverRuntime,
  comparison: Pass518CrossProviderChartDiff,
): Pass524ProviderRouteLedger {
  const state: Pass524ProviderRouteLedger["state"] = failover.mode === "blocked"
    ? "blocked"
    : failover.mode === "degraded"
      ? "degraded"
      : failover.failoverAllowed && comparison.state === "aligned"
        ? "resilient"
        : "single_route";
  const steps: Pass524ProviderRouteStep[] = [
    {
      id: "primary",
      label: "Active route",
      state: failover.mode === "blocked" ? "blocked" : failover.mode === "degraded" ? "review" : "healthy",
      detail: failover.activeSource,
    },
    {
      id: "standby",
      label: "Standby route",
      state: failover.failoverAllowed ? "ready" : failover.standbySource ? "review" : "blocked",
      detail: failover.standbySource || "No verified standby stream",
    },
    {
      id: "consensus",
      label: "Cross-provider check",
      state: comparison.state === "aligned" ? "healthy" : comparison.state === "watch" || comparison.state === "single_source" ? "review" : "blocked",
      detail: comparison.medianCloseDivergenceBps === null
        ? comparison.explanation
        : `${comparison.medianCloseDivergenceBps} bps median divergence · ${comparison.matchRate}% matched bars`,
    },
    {
      id: "boundary",
      label: "Truth boundary",
      state: "ready",
      detail: failover.boundary,
    },
  ];
  return {
    version: "pass524-provider-route-ledger",
    state,
    activeSource: failover.activeSource,
    routeCount: failover.route.length,
    confidenceCap: failover.confidenceCap,
    steps,
    headline: state === "resilient"
      ? "Verified standby route and aligned provider path"
      : state === "single_route"
        ? "Primary route is usable, but redundancy is incomplete"
        : state === "degraded"
          ? "Provider route is operating under an evidence cap"
          : "No verified market route is available",
    nextAction: state === "resilient"
      ? "Keep monitoring freshness and divergence before switching routes."
      : state === "single_route"
        ? "Attach a timestamp-compatible secondary candle stream."
        : state === "degraded"
          ? "Refresh the active source and verify a standby provider."
          : "Stop live chart claims until a verified source returns.",
    boundary: "Route resilience describes source continuity only; it is not a market-quality or investment score.",
  };
}
