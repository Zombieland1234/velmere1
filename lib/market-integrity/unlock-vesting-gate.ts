import type { RiskSignalId, TokenRiskResult } from "./risk-types";

export type UnlockVestingGateTone = "gold" | "cyan" | "amber" | "red" | "green" | "neutral";

export type UnlockVestingGateStatus =
  | "cliff_radar_gate"
  | "vesting_review"
  | "source_gap"
  | "calm_calendar";

export type UnlockVestingGateRail = {
  id: "float" | "fdvGap" | "cliff" | "team" | "cooldown" | "source";
  label: string;
  value: string;
  tone: UnlockVestingGateTone;
  note: string;
};

export type UnlockVestingSnapshot = {
  nextUnlockDate?: string;
  nextUnlockPercentOfSupply?: number;
  nextUnlockUsd?: number;
  teamAdvisorUnlockPercent?: number;
  vestingSource?: string;
  lastUpdatedAt?: string;
  riskPoints?: number;
};

export type UnlockVestingGate = {
  version: "velmere_unlock_vesting_gate_v1_pass274";
  status: UnlockVestingGateStatus;
  headline: string;
  trustBadge: string;
  operatorCue: string;
  rails: UnlockVestingGateRail[];
  blockers: string[];
  nextAction: string;
};

const UNLOCK_SIGNALS = new Set<RiskSignalId>([
  "fdv_marketcap_gap",
  "supply_overhang",
  "thin_liquidity",
  "very_thin_liquidity",
  "low_dex_liquidity",
  "parabolic_24h_gain",
  "parabolic_7d_gain",
  "multi_timeframe_pump",
]);

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function finite(value?: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function formatPercent(value?: number, fallback = "missing") {
  const safe = finite(value);
  if (safe === undefined) return fallback;
  return `${safe.toFixed(Math.abs(safe) >= 10 ? 1 : 2)}%`;
}

function formatUsd(value?: number) {
  const safe = finite(value);
  if (safe === undefined) return "missing";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: Math.abs(safe) >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: 2,
  }).format(safe);
}

function toneFromScore(score: number): UnlockVestingGateTone {
  if (score >= 74) return "red";
  if (score >= 52) return "amber";
  if (score >= 30) return "gold";
  return "green";
}

function circulatingFloatPercent(result: TokenRiskResult) {
  const circulating = finite(result.metrics.circulatingSupply);
  const total = finite(result.metrics.totalSupply ?? result.metrics.maxSupply);
  if (circulating === undefined || total === undefined || total <= 0) return undefined;
  return clamp((circulating / total) * 100);
}

function hasSignal(result: TokenRiskResult, ids: RiskSignalId[]) {
  const wanted = new Set(ids);
  return result.signals.some((signal) => wanted.has(signal.id));
}

function daysUntil(dateLike?: string) {
  if (!dateLike) return undefined;
  const timestamp = Date.parse(dateLike);
  if (!Number.isFinite(timestamp)) return undefined;
  return Math.ceil((timestamp - Date.now()) / 86_400_000);
}

export function buildUnlockVestingGate(
  result: TokenRiskResult,
  snapshot?: UnlockVestingSnapshot | null,
): UnlockVestingGate {
  const floatPercent = circulatingFloatPercent(result);
  const lockedFloatPercent = floatPercent === undefined ? undefined : clamp(100 - floatPercent);
  const fdvGap = finite(result.metrics.fdvToMarketCapRatio);
  const nextUnlockPercent = finite(snapshot?.nextUnlockPercentOfSupply);
  const nextUnlockUsd = finite(snapshot?.nextUnlockUsd);
  const teamAdvisorUnlock = finite(snapshot?.teamAdvisorUnlockPercent);
  const nextUnlockDays = daysUntil(snapshot?.nextUnlockDate);
  const unlockSignals = result.signals.filter((signal) => UNLOCK_SIGNALS.has(signal.id));
  const supplyOverhang = hasSignal(result, ["fdv_marketcap_gap", "supply_overhang"]);
  const fastRepricing = hasSignal(result, ["parabolic_24h_gain", "parabolic_7d_gain", "multi_timeframe_pump"]);

  const floatStress = clamp(
    (lockedFloatPercent === undefined ? 50 : lockedFloatPercent) +
      (fdvGap === undefined ? 10 : fdvGap > 6 ? 28 : fdvGap > 3 ? 18 : fdvGap > 1.7 ? 8 : 0),
  );
  const fdvStress = clamp(
    (fdvGap === undefined ? 42 : fdvGap > 8 ? 88 : fdvGap > 5 ? 70 : fdvGap > 3 ? 52 : fdvGap > 1.7 ? 32 : 12) +
      (supplyOverhang ? 12 : 0),
  );
  const cliffStress = clamp(
    (nextUnlockPercent === undefined ? 46 : nextUnlockPercent > 8 ? 86 : nextUnlockPercent > 4 ? 66 : nextUnlockPercent > 1.5 ? 42 : 16) +
      (nextUnlockDays !== undefined && nextUnlockDays >= 0 && nextUnlockDays <= 14 ? 18 : 0),
  );
  const teamStress = clamp(
    teamAdvisorUnlock === undefined ? 40 : teamAdvisorUnlock > 12 ? 82 : teamAdvisorUnlock > 6 ? 62 : teamAdvisorUnlock > 2 ? 35 : 14,
  );
  const cooldownStress = clamp(
    (fastRepricing ? 58 : 18) +
      Math.min(24, Math.abs(finite(result.metrics.priceChange7d) ?? 0) * 0.5) +
      Math.min(16, unlockSignals.length * 4),
  );
  const sourceStress = clamp(
    (snapshot?.vestingSource ? 14 : 56) +
      (result.dataQuality === "live" ? 0 : result.dataQuality === "partial" ? 12 : 24) +
      (snapshot?.lastUpdatedAt ? 0 : 8),
  );
  const externalRisk = finite(snapshot?.riskPoints) ?? 0;

  const totalScore = Math.round(clamp(
    floatStress * 0.22 +
      fdvStress * 0.2 +
      cliffStress * 0.2 +
      teamStress * 0.12 +
      cooldownStress * 0.12 +
      sourceStress * 0.1 +
      externalRisk * 0.04,
  ));

  const blockers = [
    floatPercent === undefined ? "circulating / total supply source" : null,
    fdvGap === undefined ? "FDV to market-cap ratio" : null,
    !snapshot?.vestingSource ? "token unlock calendar source" : null,
    nextUnlockPercent === undefined ? "next unlock percent" : null,
    teamAdvisorUnlock === undefined ? "team/advisor vesting lane" : null,
    result.dataQuality !== "live" ? "fresh market source timestamp" : null,
  ].filter((item): item is string => Boolean(item));

  const status: UnlockVestingGateStatus =
    totalScore >= 70 || (fdvStress >= 64 && cliffStress >= 58)
      ? "cliff_radar_gate"
      : blockers.length >= 4
        ? "source_gap"
        : totalScore >= 44
          ? "vesting_review"
          : "calm_calendar";

  const headline =
    status === "cliff_radar_gate"
      ? "cliff radar gate active"
      : status === "source_gap"
        ? "unlock source gap"
        : status === "vesting_review"
          ? "vesting calendar needs review"
          : "calendar calmer, verify proof";

  const operatorCue =
    status === "cliff_radar_gate"
      ? "Do not let a premium-looking chart hide future supply pressure: compare float, FDV gap and the next unlock before any public summary."
      : status === "source_gap"
        ? "Missing vesting data is uncertainty, not trust. Keep Basic concise and push Pro/Advanced toward source proof."
        : status === "vesting_review"
          ? "Review future supply before lowering pressure: a clean current candle can still sit before a cliff."
          : "Current inputs look calmer, but the time-lock mirror still needs refreshed vesting proof.";

  const nextAction =
    status === "cliff_radar_gate"
      ? "Open Advanced, attach unlock calendar proof, compare FDV gap with circulating float and keep customer wording source-gated."
      : status === "source_gap"
        ? "Attach TokenUnlocks/CoinMarketCap/project vesting source or mark the unlock lane as blocked before export."
        : status === "vesting_review"
          ? "Replay the next 7/30/90 day supply windows and separate team/advisor cliffs from public float."
          : "Refresh vesting source and keep the gate visible as a trust cue, not a trade signal.";

  const cliffValue = nextUnlockDays === undefined
    ? "missing"
    : nextUnlockDays < 0
      ? "elapsed"
      : `${nextUnlockDays}d`;

  return {
    version: "velmere_unlock_vesting_gate_v1_pass274",
    status,
    headline,
    trustBadge: `unlock ${totalScore}/100`,
    operatorCue,
    blockers,
    nextAction,
    rails: [
      {
        id: "float",
        label: "float",
        value: formatPercent(floatPercent),
        tone: toneFromScore(floatStress),
        note: lockedFloatPercent === undefined ? "float missing" : `${formatPercent(lockedFloatPercent, "0%")} locked/unknown`,
      },
      {
        id: "fdvGap",
        label: "FDV gap",
        value: fdvGap === undefined ? "missing" : `${fdvGap.toFixed(fdvGap >= 10 ? 1 : 2)}x`,
        tone: toneFromScore(fdvStress),
        note: supplyOverhang ? "supply overhang" : "valuation pressure",
      },
      {
        id: "cliff",
        label: "next cliff",
        value: nextUnlockPercent === undefined ? cliffValue : `${cliffValue} · ${formatPercent(nextUnlockPercent)}`,
        tone: toneFromScore(cliffStress),
        note: nextUnlockUsd === undefined ? "unlock USD missing" : formatUsd(nextUnlockUsd),
      },
      {
        id: "team",
        label: "team lane",
        value: formatPercent(teamAdvisorUnlock),
        tone: toneFromScore(teamStress),
        note: "advisor/team pressure",
      },
      {
        id: "cooldown",
        label: "cooldown",
        value: fastRepricing ? "required" : "soft",
        tone: toneFromScore(cooldownStress),
        note: unlockSignals.length ? `${unlockSignals.length} supply signals` : "no supply spike",
      },
      {
        id: "source",
        label: "source",
        value: snapshot?.vestingSource ?? result.dataQuality,
        tone: toneFromScore(sourceStress),
        note: blockers.length ? `${blockers.length} blockers` : "freshness gate",
      },
    ],
  };
}
