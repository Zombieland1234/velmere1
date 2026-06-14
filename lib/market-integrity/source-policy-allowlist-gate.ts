import type { TokenRiskResult } from "./risk-types";
import type { SourceAdapterQuorumGate } from "./source-adapter-quorum-gate";

export type SourcePolicyAllowlistGateTone = "gold" | "cyan" | "amber" | "red" | "green" | "neutral";

export type SourcePolicyAllowlistGateStatus =
  | "policy_quarantine"
  | "second_source_required"
  | "privacy_passport_pending"
  | "private_passport_ready";

export type SourcePolicyClass =
  | "exchange"
  | "indexer"
  | "explorer"
  | "official"
  | "social"
  | "fallback"
  | "unknown";

export type SourcePolicyAllowlistRail = {
  id: "allowlist" | "provenance" | "second" | "conflict" | "privacy" | "passport";
  label: string;
  value: string;
  tone: SourcePolicyAllowlistGateTone;
  note: string;
};

export type SourcePolicyLane = {
  id: string;
  label: string;
  sourceClass: SourcePolicyClass;
  policy: "trusted_preview" | "second_source" | "operator_only" | "blocked_until_review";
  evidenceUse: "chart" | "liquidity" | "identity" | "narrative" | "fallback" | "unknown";
  note: string;
};

export type SourcePolicyAllowlistGate = {
  version: "velmere_source_policy_allowlist_gate_v1_pass277";
  status: SourcePolicyAllowlistGateStatus;
  headline: string;
  trustBadge: string;
  operatorCue: string;
  rails: SourcePolicyAllowlistRail[];
  lanes: SourcePolicyLane[];
  blockers: string[];
  nextAction: string;
  customerBoundary: string;
};

const TRUSTED_EXCHANGES = ["mexc", "binance", "coinbase", "kraken", "okx", "bybit", "kucoin"];
const TRUSTED_INDEXERS = ["coingecko", "coinmarketcap", "dexscreener", "dextools", "geckoterminal", "defillama"];
const TRUSTED_EXPLORERS = ["etherscan", "bscscan", "polygonscan", "arbiscan", "basescan", "solscan", "tronscan"];
const SOCIAL_HINTS = ["twitter", "x.com", "telegram", "discord", "medium", "reddit", "youtube", "tiktok"];

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function compact(value?: number, fallback = "missing") {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return new Intl.NumberFormat("en-US", {
    notation: Math.abs(value) >= 1_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function toneFromStress(score: number): SourcePolicyAllowlistGateTone {
  if (score >= 74) return "red";
  if (score >= 52) return "amber";
  if (score >= 30) return "gold";
  return "green";
}

function normalizeSource(value: string) {
  return value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "");
}

function classifySource(raw: string): SourcePolicyClass {
  const source = normalizeSource(raw);
  if (!source) return "unknown";
  if (source === "project_url" || source.includes("official") || source.includes("token website")) return "official";
  if (TRUSTED_EXCHANGES.some((item) => source.includes(item))) return "exchange";
  if (TRUSTED_INDEXERS.some((item) => source.includes(item))) return "indexer";
  if (TRUSTED_EXPLORERS.some((item) => source.includes(item))) return "explorer";
  if (SOCIAL_HINTS.some((item) => source.includes(item))) return "social";
  if (source.includes("fallback") || source.includes("demo") || source.includes("sparkline")) return "fallback";
  return "unknown";
}

function evidenceUse(sourceClass: SourcePolicyClass): SourcePolicyLane["evidenceUse"] {
  if (sourceClass === "exchange" || sourceClass === "indexer") return "chart";
  if (sourceClass === "explorer") return "identity";
  if (sourceClass === "official") return "identity";
  if (sourceClass === "social") return "narrative";
  if (sourceClass === "fallback") return "fallback";
  return "unknown";
}

function sourcePolicy(sourceClass: SourcePolicyClass): SourcePolicyLane["policy"] {
  if (sourceClass === "exchange" || sourceClass === "indexer" || sourceClass === "explorer") return "trusted_preview";
  if (sourceClass === "official") return "second_source";
  if (sourceClass === "social" || sourceClass === "fallback") return "operator_only";
  return "blocked_until_review";
}

function uniqueSources(result: TokenRiskResult) {
  const values = new Set<string>();
  for (const source of result.dataSources ?? []) {
    if (source) values.add(source);
  }
  if (result.token.url) values.add("project_url");
  if (result.dataQuality !== "live") values.add(`${result.dataQuality}_fallback_lane`);
  return Array.from(values).slice(0, 8);
}

function parseQuorumScore(gate?: SourceAdapterQuorumGate | null) {
  const raw = gate?.trustBadge.match(/(\d+)\/100/)?.[1];
  return raw ? Number(raw) : undefined;
}

export function buildSourcePolicyAllowlistGate(
  result: TokenRiskResult,
  quorumGate?: SourceAdapterQuorumGate | null,
): SourcePolicyAllowlistGate {
  const sources = uniqueSources(result);
  const lanes: SourcePolicyLane[] = sources.length
    ? sources.map((source, index) => {
        const sourceClass = classifySource(source);
        return {
          id: `source-${index + 1}`,
          label: source,
          sourceClass,
          policy: sourcePolicy(sourceClass),
          evidenceUse: evidenceUse(sourceClass),
          note:
            sourceClass === "social"
              ? "narrative only; never a verdict"
              : sourceClass === "fallback"
                ? "layout preview until live proof returns"
                : sourceClass === "unknown"
                  ? "needs allowlist owner review"
                  : "eligible after second-source check",
        };
      })
    : [
        {
          id: "source-missing",
          label: "source missing",
          sourceClass: "unknown",
          policy: "blocked_until_review",
          evidenceUse: "unknown",
          note: "no allowlisted source attached",
        },
      ];

  const trustedCount = lanes.filter((lane) => lane.policy === "trusted_preview").length;
  const officialCount = lanes.filter((lane) => lane.sourceClass === "official").length;
  const blockedCount = lanes.filter((lane) => lane.policy === "blocked_until_review").length;
  const operatorOnlyCount = lanes.filter((lane) => lane.policy === "operator_only").length;
  const fallbackCount = lanes.filter((lane) => lane.sourceClass === "fallback").length;
  const unknownCount = lanes.filter((lane) => lane.sourceClass === "unknown").length;
  const classes = new Set(lanes.map((lane) => lane.sourceClass));
  const quorumScore = parseQuorumScore(quorumGate);
  const quorumIsCalm = quorumGate?.status === "calm_quorum" || (quorumScore !== undefined && quorumScore < 34);

  const allowlistStress = clamp(trustedCount >= 2 ? 14 : trustedCount === 1 ? 42 : 78);
  const provenanceStress = clamp(officialCount ? 22 : result.token.url ? 34 : 66);
  const secondSourceStress = clamp(classes.size >= 3 && trustedCount >= 2 ? 16 : classes.size >= 2 ? 42 : 70);
  const conflictStress = clamp(
    blockedCount * 18 +
      operatorOnlyCount * 10 +
      fallbackCount * 14 +
      unknownCount * 16 +
      (quorumGate?.status === "circuit_breaker_active" ? 22 : quorumGate?.status === "fallback_gap" ? 14 : 0),
  );
  const privacyStress = clamp(result.dataQuality === "demo" ? 60 : result.dataQuality === "partial" ? 38 : 18);
  const passportStress = clamp(quorumIsCalm && trustedCount >= 2 && blockedCount === 0 ? 14 : 58 + unknownCount * 8 + fallbackCount * 6);

  const policyScore = Math.round(clamp(
    allowlistStress * 0.22 +
      provenanceStress * 0.17 +
      secondSourceStress * 0.18 +
      conflictStress * 0.17 +
      privacyStress * 0.1 +
      passportStress * 0.16,
  ));

  const blockers = [
    trustedCount < 2 ? "two trusted allowlisted sources" : null,
    classes.size < 2 ? "second source class" : null,
    officialCount < 1 ? "official provenance source" : null,
    blockedCount > 0 ? "unknown source policy owner" : null,
    operatorOnlyCount > 0 ? "operator-only narrative/fallback lane" : null,
    fallbackCount > 0 ? "fallback source replacement" : null,
    !quorumIsCalm ? "adapter quorum calm state" : null,
  ].filter((item): item is string => Boolean(item));

  const status: SourcePolicyAllowlistGateStatus =
    policyScore >= 72 || blockedCount > 0
      ? "policy_quarantine"
      : secondSourceStress >= 58 || trustedCount < 2
        ? "second_source_required"
        : passportStress >= 46
          ? "privacy_passport_pending"
          : "private_passport_ready";

  const headline =
    status === "policy_quarantine"
      ? "source policy quarantine"
      : status === "second_source_required"
        ? "second-source gate required"
        : status === "privacy_passport_pending"
          ? "private source passport pending"
          : "private source passport ready";

  const operatorCue =
    status === "policy_quarantine"
      ? "Unknown, fallback or operator-only sources cannot become public confidence. FOMO is converted into review delay; elite status is earned only by allowlisted proof."
      : status === "second_source_required"
        ? "One source can inform layout, but Pro/Advanced copy needs another class of proof before stronger language is allowed."
        : status === "privacy_passport_pending"
          ? "The signal can stay visible, but the private proof passport waits for calm quorum, source owner and privacy-safe evidence use."
          : "Allowlisted proof is strong enough for a quiet private passport cue. Keep it calm, traceable and free of urgency pressure.";

  const nextAction =
    status === "policy_quarantine"
      ? "Attach source owner, allowlist class, evidence-use boundary and a second source before customer-facing confidence is raised."
      : status === "second_source_required"
        ? "Pair market data with explorer/official provenance or another trusted indexer before Pro/Advanced summary copy."
        : status === "privacy_passport_pending"
          ? "Add reviewer seal, calm adapter quorum and privacy note before the proof passport becomes visible."
          : "Keep the passport as a private trust cue and refresh source policy before each export or report preview.";

  return {
    version: "velmere_source_policy_allowlist_gate_v1_pass277",
    status,
    headline,
    trustBadge: `policy ${policyScore}/100`,
    operatorCue,
    lanes,
    blockers,
    nextAction,
    customerBoundary: "Customer copy may mention review status only; raw source payload, urgency and safety-certification language stay blocked.",
    rails: [
      {
        id: "allowlist",
        label: "allowlist",
        value: `${trustedCount}/${Math.max(2, lanes.length)}`,
        tone: toneFromStress(allowlistStress),
        note: trustedCount >= 2 ? "trusted preview lanes" : "more trusted proof needed",
      },
      {
        id: "provenance",
        label: "provenance",
        value: officialCount ? "official" : result.token.url ? "url" : "missing",
        tone: toneFromStress(provenanceStress),
        note: "identity before confidence",
      },
      {
        id: "second",
        label: "second source",
        value: `${compact(classes.size)}/3`,
        tone: toneFromStress(secondSourceStress),
        note: "separate source classes",
      },
      {
        id: "conflict",
        label: "conflict",
        value: blockedCount || operatorOnlyCount || fallbackCount ? `${compact(blockedCount + operatorOnlyCount + fallbackCount)}` : "none",
        tone: toneFromStress(conflictStress),
        note: quorumGate?.status ?? "quorum pending",
      },
      {
        id: "privacy",
        label: "privacy",
        value: result.dataQuality === "live" ? "minimal" : result.dataQuality,
        tone: toneFromStress(privacyStress),
        note: "no raw payload in public copy",
      },
      {
        id: "passport",
        label: "passport",
        value: status === "private_passport_ready" ? "ready" : "pending",
        tone: toneFromStress(passportStress),
        note: "quiet elite trust cue",
      },
    ],
  };
}
