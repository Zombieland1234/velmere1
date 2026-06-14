import type { Pass503ProviderRuntime, Pass503ProviderState } from "./pass503-provider-state-runtime";

export type Pass517SecondaryProvider = {
  sourceLabel: string;
  state: Pass503ProviderState;
  ageSeconds: number | null;
  coverageScore: number;
};

export type Pass517ProviderFailoverRuntime = {
  version: "pass517-provider-failover-runtime";
  mode: "primary_live" | "failover_ready" | "degraded" | "blocked";
  activeSource: string;
  standbySource: string | null;
  failoverAllowed: boolean;
  confidenceCap: number;
  route: string[];
  reason: string;
  boundary: string;
};

const liveEnough = (state: Pass503ProviderState) => state === "live";
const usable = (state: Pass503ProviderState) => state === "live" || state === "partial";

export function buildPass517ProviderFailoverRuntime(
  primary: Pass503ProviderRuntime,
  secondary?: Pass517SecondaryProvider | null,
): Pass517ProviderFailoverRuntime {
  const primaryLive = liveEnough(primary.state);
  const secondaryLive = Boolean(secondary && liveEnough(secondary.state));
  const secondaryUsable = Boolean(secondary && usable(secondary.state));

  if (primaryLive) {
    return {
      version: "pass517-provider-failover-runtime",
      mode: "primary_live",
      activeSource: primary.sourceLabel,
      standbySource: secondary?.sourceLabel ?? null,
      failoverAllowed: secondaryLive,
      confidenceCap: secondaryLive ? 96 : 88,
      route: secondary ? [primary.sourceLabel, secondary.sourceLabel] : [primary.sourceLabel],
      reason: secondaryLive
        ? "Primary source is inside its freshness budget and a verified standby route is available."
        : "Primary source is healthy; no verified standby candle stream is currently attached.",
      boundary: "Failover changes the data route only when a real secondary stream is present; it never fabricates missing candles.",
    };
  }

  if (secondaryLive && secondary) {
    return {
      version: "pass517-provider-failover-runtime",
      mode: "failover_ready",
      activeSource: secondary.sourceLabel,
      standbySource: primary.sourceLabel,
      failoverAllowed: true,
      confidenceCap: Math.min(86, Math.max(50, secondary.coverageScore)),
      route: [primary.sourceLabel, secondary.sourceLabel],
      reason: "Primary source is outside the operating budget, while the verified secondary route is live.",
      boundary: "The UI may switch to the secondary route, but it must preserve the source label and freshness disclosure.",
    };
  }

  if (usable(primary.state) || secondaryUsable) {
    const active = usable(primary.state) ? primary.sourceLabel : secondary?.sourceLabel ?? "unavailable";
    return {
      version: "pass517-provider-failover-runtime",
      mode: "degraded",
      activeSource: active,
      standbySource: secondary?.sourceLabel ?? null,
      failoverAllowed: false,
      confidenceCap: 58,
      route: secondary ? [primary.sourceLabel, secondary.sourceLabel] : [primary.sourceLabel],
      reason: "At least one route contains partial data, but no live verified failover stream is available.",
      boundary: "Degraded mode is evidence-only. It must not be presented as a continuous live market feed.",
    };
  }

  return {
    version: "pass517-provider-failover-runtime",
    mode: "blocked",
    activeSource: "unavailable",
    standbySource: secondary?.sourceLabel ?? null,
    failoverAllowed: false,
    confidenceCap: 20,
    route: secondary ? [primary.sourceLabel, secondary.sourceLabel] : [primary.sourceLabel],
    reason: "Neither the primary nor the secondary route contains a usable verified candle stream.",
    boundary: "Blocked mode exposes the outage and stops chart claims instead of backfilling substitute data.",
  };
}
