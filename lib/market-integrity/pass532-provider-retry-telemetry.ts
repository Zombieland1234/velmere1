import type { Pass503ProviderState } from "./pass503-provider-state-runtime";

export type Pass532RetryOutcome =
  | "observed"
  | "scheduled"
  | "recovered"
  | "failed"
  | "cancelled";

export type Pass532ProviderRetryEvent = {
  id: string;
  sourceLabel: string;
  observedAt: number;
  state: Pass503ProviderState;
  attempt: number;
  delayMs: number | null;
  outcome: Pass532RetryOutcome;
  detail: string;
};

export type Pass532ProviderRetryTelemetry = {
  version: "pass532-provider-retry-telemetry";
  state: "healthy" | "retrying" | "degraded" | "blocked";
  events: Pass532ProviderRetryEvent[];
  nextDelayMs: number | null;
  maximumDelayMs: number;
  headline: string;
  nextAction: string;
  boundary: string;
};

const MAX_DELAY_MS = 30_000;

export function pass532BackoffDelay(attempt: number) {
  const safeAttempt = Math.max(1, Math.min(8, Math.floor(attempt)));
  return Math.min(MAX_DELAY_MS, 1_000 * 2 ** (safeAttempt - 1));
}

export function buildPass532ProviderRetryTelemetry(
  sourceLabel: string,
  state: Pass503ProviderState,
  events: Pass532ProviderRetryEvent[],
): Pass532ProviderRetryTelemetry {
  const ordered = [...events]
    .filter(
      (event) => Number.isFinite(event.observedAt) && event.sourceLabel.trim(),
    )
    .sort((left, right) => right.observedAt - left.observedAt)
    .slice(0, 8);
  const consecutiveFailures = ordered.findIndex(
    (event) => event.outcome === "recovered",
  );
  const attempts =
    consecutiveFailures === -1
      ? ordered.filter(
          (event) =>
            event.outcome === "failed" || event.outcome === "scheduled",
        ).length
      : consecutiveFailures;
  const unhealthy =
    state === "stale" || state === "partial" || state === "offline";
  const nextDelayMs = unhealthy
    ? pass532BackoffDelay(Math.max(1, attempts + 1))
    : null;
  const runtimeState: Pass532ProviderRetryTelemetry["state"] =
    state === "live"
      ? "healthy"
      : state === "offline"
        ? ordered.some((event) => event.outcome === "scheduled")
          ? "retrying"
          : "blocked"
        : "degraded";

  return {
    version: "pass532-provider-retry-telemetry",
    state: runtimeState,
    events: ordered,
    nextDelayMs,
    maximumDelayMs: MAX_DELAY_MS,
    headline:
      runtimeState === "healthy"
        ? `${sourceLabel} is inside the live freshness budget.`
        : runtimeState === "retrying"
          ? `${sourceLabel} has an adapter-owned retry scheduled.`
          : runtimeState === "degraded"
            ? `${sourceLabel} remains usable only with a degraded-data disclosure.`
            : `${sourceLabel} has no usable response and no confirmed recovery event.`,
    nextAction:
      runtimeState === "healthy"
        ? "Keep the active route and preserve standby monitoring."
        : `Retry through the provider adapter after ${Math.round((nextDelayMs ?? MAX_DELAY_MS) / 1000)}s, then record the observed outcome.`,
    boundary:
      "This panel reports adapter observations and deterministic backoff policy. It does not claim that a network retry occurred unless an event is supplied or observed by the runtime.",
  };
}
