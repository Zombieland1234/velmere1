import type { TokenRiskResult } from "./risk-types";
import type { DurableAuditReceiptVault } from "./durable-audit-receipt-vault";
import type { SourceFreshnessRegistryGate } from "./source-freshness-registry-gate";

export type AnalyticsEventTaxonomyTone = "gold" | "cyan" | "amber" | "red" | "green" | "neutral";

export type AnalyticsEventTaxonomyStatus =
  | "telemetry_quarantine"
  | "redaction_review"
  | "consent_gap"
  | "velvet_event_passport";

export type AnalyticsEventPrivacy =
  | "aggregate_only"
  | "redacted_operator"
  | "operator_only"
  | "blocked_raw_payload";

export type AnalyticsEventIntent =
  | "observe"
  | "compare"
  | "source_repair"
  | "export_attempt"
  | "tier_depth"
  | "anti_fomo_cooldown";

export type AnalyticsEventTaxonomyRail = {
  id: "passport" | "privacy" | "intent" | "fomo" | "status" | "retention";
  label: string;
  value: string;
  tone: AnalyticsEventTaxonomyTone;
  note: string;
};

export type AnalyticsEventTaxonomyLane = {
  id: string;
  label: string;
  eventKey: string;
  intent: AnalyticsEventIntent;
  privacy: AnalyticsEventPrivacy;
  status: "allowed" | "redacted" | "operator_only" | "blocked";
  note: string;
};

export type AnalyticsEventTaxonomyGate = {
  version: "velmere_analytics_event_taxonomy_gate_v1_pass280";
  status: AnalyticsEventTaxonomyStatus;
  headline: string;
  trustBadge: string;
  operatorCue: string;
  rails: AnalyticsEventTaxonomyRail[];
  lanes: AnalyticsEventTaxonomyLane[];
  blockers: string[];
  nextAction: string;
  customerBoundary: string;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function stablePart(value?: string | number | null) {
  if (value === undefined || value === null || value === "") return "missing";
  return String(value).trim().toLowerCase();
}

function shortHash(payload: string) {
  let hash = 2166136261;
  for (let index = 0; index < payload.length; index += 1) {
    hash ^= payload.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").toUpperCase();
}

function parseScore(value?: string) {
  const raw = value?.match(/(\d+)\/100/)?.[1];
  return raw ? Number(raw) : undefined;
}

function toneFromStress(score: number): AnalyticsEventTaxonomyTone {
  if (score >= 74) return "red";
  if (score >= 52) return "amber";
  if (score >= 30) return "gold";
  return "green";
}

function privacyStress(privacy: AnalyticsEventPrivacy) {
  switch (privacy) {
    case "aggregate_only":
      return 12;
    case "redacted_operator":
      return 32;
    case "operator_only":
      return 52;
    case "blocked_raw_payload":
      return 86;
    default:
      return 64;
  }
}

function laneStatus(privacy: AnalyticsEventPrivacy): AnalyticsEventTaxonomyLane["status"] {
  if (privacy === "blocked_raw_payload") return "blocked";
  if (privacy === "operator_only") return "operator_only";
  if (privacy === "redacted_operator") return "redacted";
  return "allowed";
}

function buildPassportId(result: TokenRiskResult, freshnessGate: SourceFreshnessRegistryGate) {
  const seed = [
    stablePart(result.token.marketId),
    stablePart(result.token.chainId),
    stablePart(result.token.tokenAddress),
    stablePart(result.token.symbol),
    stablePart(result.generatedAt).slice(0, 13),
    freshnessGate.status,
  ].join("|");
  return `EVP-${shortHash(seed).slice(0, 4)}-${shortHash(`${seed}|taxonomy`).slice(0, 6)}`;
}

function missingIdentity(result: TokenRiskResult) {
  const missing = [];
  if (!result.token.symbol) missing.push("symbol");
  if (!result.token.marketId) missing.push("market id");
  if (!result.token.chainId) missing.push("chain");
  if (!result.token.tokenAddress) missing.push("contract address");
  return missing;
}

export function buildAnalyticsEventTaxonomyGate(
  result: TokenRiskResult,
  freshnessGate: SourceFreshnessRegistryGate,
  durableVault: DurableAuditReceiptVault,
): AnalyticsEventTaxonomyGate {
  const identityGaps = missingIdentity(result);
  const freshnessScore = parseScore(freshnessGate.trustBadge) ?? 64;
  const vaultScore = parseScore(durableVault.trustBadge) ?? 68;
  const receiptBlocked = durableVault.status === "ledger_write_blocked";
  const freshnessBlocked = freshnessGate.status === "expired_registry" || freshnessGate.status === "stale_registry_review";
  const dataQualityStress = result.dataQuality === "live" ? 14 : result.dataQuality === "partial" ? 44 : 72;
  const passportId = buildPassportId(result, freshnessGate);

  const lanes: AnalyticsEventTaxonomyLane[] = [
    {
      id: "modal_view",
      label: "token modal view",
      eventKey: `shield.modal.view.${stablePart(result.token.symbol)}`,
      intent: "observe",
      privacy: identityGaps.length > 2 ? "redacted_operator" : "aggregate_only",
      status: laneStatus(identityGaps.length > 2 ? "redacted_operator" : "aggregate_only"),
      note: "symbol/market bucket only; no wallet, IP or raw query payload",
    },
    {
      id: "chart_drag",
      label: "chart gesture",
      eventKey: "shield.chart.drag.direction_bucket",
      intent: "compare",
      privacy: "aggregate_only",
      status: laneStatus("aggregate_only"),
      note: "stores only range and direction bucket so chart UX can improve without behavioral profiling",
    },
    {
      id: "tier_switch",
      label: "Basic/Pro/Advanced switch",
      eventKey: "vlm.depth.switch.redacted",
      intent: "tier_depth",
      privacy: "redacted_operator",
      status: laneStatus("redacted_operator"),
      note: "mode depth is counted as product friction, not as investment intent",
    },
    {
      id: "source_gate_view",
      label: "source gate view",
      eventKey: `source.freshness.${freshnessGate.status}`,
      intent: "source_repair",
      privacy: freshnessBlocked ? "operator_only" : "redacted_operator",
      status: laneStatus(freshnessBlocked ? "operator_only" : "redacted_operator"),
      note: "source decay stays tied to reviewer repair and never becomes a public urgency badge",
    },
    {
      id: "export_attempt",
      label: "export intent",
      eventKey: `export.intent.${durableVault.status}`,
      intent: "export_attempt",
      privacy: receiptBlocked ? "blocked_raw_payload" : "operator_only",
      status: laneStatus(receiptBlocked ? "blocked_raw_payload" : "operator_only"),
      note: "raw payload, customer PII and unredacted receipts remain blocked until server storage and review exist",
    },
    {
      id: "anti_fomo_cooldown",
      label: "anti-FOMO cooldown",
      eventKey: "psychology.cooldown.no_pressure",
      intent: "anti_fomo_cooldown",
      privacy: "redacted_operator",
      status: laneStatus("redacted_operator"),
      note: "captures calm-down friction only; no buy/sell prompts, no timer urgency, no dark-pattern status theatre",
    },
  ];

  const laneStress = Math.round(
    clamp(lanes.reduce((sum, lane) => sum + privacyStress(lane.privacy), 0) / lanes.length),
  );
  const taxonomyStress = Math.round(
    clamp(
      dataQualityStress * 0.22 +
        freshnessScore * 0.24 +
        vaultScore * 0.2 +
        laneStress * 0.24 +
        Math.min(identityGaps.length * 12, 24) * 0.1,
    ),
  );

  const blockers = [
    identityGaps.length ? `identity gaps: ${identityGaps.join(", ")}` : null,
    freshnessBlocked ? "freshness registry review" : null,
    receiptBlocked ? "durable analytics receipt write" : null,
    lanes.some((lane) => lane.privacy === "blocked_raw_payload") ? "raw payload redaction" : null,
    result.dataQuality !== "live" ? "demo/partial data telemetry label" : null,
  ].filter((item): item is string => Boolean(item));

  const status: AnalyticsEventTaxonomyStatus =
    taxonomyStress >= 74 || receiptBlocked
      ? "telemetry_quarantine"
      : taxonomyStress >= 56 || blockers.length >= 4
        ? "redaction_review"
        : taxonomyStress >= 38 || identityGaps.length > 0
          ? "consent_gap"
          : "velvet_event_passport";

  const headline =
    status === "telemetry_quarantine"
      ? "telemetry quarantine active"
      : status === "redaction_review"
        ? "analytics redaction review"
        : status === "consent_gap"
          ? "event consent gap"
          : "Velvet Event Passport";

  const operatorCue =
    status === "telemetry_quarantine"
      ? "Analytics enters quarantine: unredacted payloads, export intent and stale source events are blocked before they can become growth-pressure or misleading status cues."
      : status === "redaction_review"
        ? "The taxonomy is structured, but redaction and source freshness still need an operator pass. Elite status remains private until events are aggregate, reviewed and receipt-bound."
        : status === "consent_gap"
          ? "The product can learn from aggregate friction, but identity and consent gaps keep Pro/Advanced telemetry redacted and operator-only."
          : "The event passport is calm enough for private product analytics: aggregate lanes only, anti-FOMO friction visible, no public performance or safety badge.";

  return {
    version: "velmere_analytics_event_taxonomy_gate_v1_pass280",
    status,
    headline,
    trustBadge: `taxonomy ${taxonomyStress}/100`,
    operatorCue,
    lanes,
    blockers,
    nextAction:
      status === "telemetry_quarantine"
        ? "Keep analytics in quarantine, remove raw payloads, attach server-side redaction receipts and replay freshness before any dashboard exposure."
        : status === "redaction_review"
          ? "Review event keys, keep export and FOMO-pressure interactions operator-only, then bind the taxonomy to the durable receipt vault."
          : status === "consent_gap"
            ? "Add consent/retention labels and keep only aggregate chart/search friction in public analytics."
            : "Preserve the Velvet Event Passport, rotate event keys by release and keep status psychology proof-based instead of urgency-based.",
    customerBoundary:
      "Customer-facing copy may say telemetry is privacy-preserving and used to improve reliability only; it must not claim safety, profit, certainty, public certification, or personalized trading advice.",
    rails: [
      {
        id: "passport",
        label: "passport",
        value: passportId,
        tone: blockers.length ? "gold" : "green",
        note: "deterministic event taxonomy key",
      },
      {
        id: "privacy",
        label: "privacy",
        value: `${lanes.filter((lane) => lane.privacy === "aggregate_only").length}/${lanes.length}`,
        tone: toneFromStress(laneStress),
        note: "aggregate-only lanes",
      },
      {
        id: "intent",
        label: "intent",
        value: `${lanes.filter((lane) => lane.intent === "source_repair" || lane.intent === "anti_fomo_cooldown").length} calm`,
        tone: freshnessBlocked ? "amber" : "cyan",
        note: "repair/cooldown over urgency",
      },
      {
        id: "fomo",
        label: "anti-FOMO",
        value: lanes.find((lane) => lane.id === "anti_fomo_cooldown")?.status ?? "redacted",
        tone: "gold",
        note: "dark-pattern firewall",
      },
      {
        id: "status",
        label: "status",
        value: status.replaceAll("_", " "),
        tone: toneFromStress(taxonomyStress),
        note: "private status, no public badge",
      },
      {
        id: "retention",
        label: "retention",
        value: receiptBlocked ? "locked" : "receipt-bound",
        tone: receiptBlocked ? "red" : "green",
        note: "no raw event storage",
      },
    ],
  };
}
