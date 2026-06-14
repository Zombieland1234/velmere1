import type { TokenRiskResult } from "./risk-types";
import type {
  SourceAdapterQuorumGate,
  SourceAdapterQuorumSnapshot,
} from "./source-adapter-quorum-gate";
import type { DurableAuditReceiptVault } from "./durable-audit-receipt-vault";

export type SourceFreshnessRegistryTone = "gold" | "cyan" | "amber" | "red" | "green" | "neutral";

export type SourceFreshnessRegistryStatus =
  | "expired_registry"
  | "stale_registry_review"
  | "freshness_gap"
  | "private_freshness_seal";

export type SourceFreshnessRegistryRail = {
  id: "registry" | "ttl" | "chart" | "depth" | "receipt" | "seal";
  label: string;
  value: string;
  tone: SourceFreshnessRegistryTone;
  note: string;
};

export type SourceFreshnessRegistryEntry = {
  id: "chart" | "depth" | "policy" | "receipt" | "operator";
  label: string;
  state: "fresh" | "stale" | "missing" | "blocked" | "operator_only";
  ttlMinutes: number;
  ageMinutes?: number;
  note: string;
};

export type SourceFreshnessRegistryGate = {
  version: "velmere_source_freshness_registry_gate_v1_pass279";
  status: SourceFreshnessRegistryStatus;
  headline: string;
  trustBadge: string;
  operatorCue: string;
  rails: SourceFreshnessRegistryRail[];
  entries: SourceFreshnessRegistryEntry[];
  blockers: string[];
  nextAction: string;
  customerBoundary: string;
};

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

function minutesSince(value?: string | null) {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.max(0, Math.round((Date.now() - parsed) / 60_000));
}

function toneFromStress(score: number): SourceFreshnessRegistryTone {
  if (score >= 74) return "red";
  if (score >= 52) return "amber";
  if (score >= 30) return "gold";
  return "green";
}

function freshnessState(
  ageMinutes: number | undefined,
  ttlMinutes: number,
  blocked = false,
): SourceFreshnessRegistryEntry["state"] {
  if (blocked) return "blocked";
  if (ageMinutes === undefined) return "missing";
  if (ageMinutes > ttlMinutes * 2) return "stale";
  if (ageMinutes > ttlMinutes) return "operator_only";
  return "fresh";
}

function stateStress(state: SourceFreshnessRegistryEntry["state"]) {
  switch (state) {
    case "fresh":
      return 12;
    case "operator_only":
      return 46;
    case "stale":
      return 64;
    case "missing":
      return 72;
    case "blocked":
      return 86;
    default:
      return 58;
  }
}

function parseScore(value?: string) {
  const raw = value?.match(/(\d+)\/100/)?.[1];
  return raw ? Number(raw) : undefined;
}

function hasOrderbook(snapshot?: SourceAdapterQuorumSnapshot | null) {
  const book = snapshot?.orderbook;
  return Boolean(
    book &&
      (book.bestBid ||
        book.bestAsk ||
        book.bidDepthUsd ||
        book.askDepthUsd ||
        book.bids?.length ||
        book.asks?.length),
  );
}

export function buildSourceFreshnessRegistryGate(
  result: TokenRiskResult,
  quorumGate: SourceAdapterQuorumGate,
  durableVault: DurableAuditReceiptVault,
  snapshot?: SourceAdapterQuorumSnapshot | null,
): SourceFreshnessRegistryGate {
  const generatedAge = minutesSince(result.generatedAt);
  const chartAge = snapshot?.chartLoading || snapshot?.chartError ? undefined : generatedAge;
  const depthAge = hasOrderbook(snapshot) && !snapshot?.orderbookLoading && !snapshot?.orderbookError ? generatedAge : undefined;
  const policyScore = parseScore(quorumGate.trustBadge);
  const vaultScore = parseScore(durableVault.trustBadge);
  const registryHash = [
    result.token.marketId ?? result.token.symbol,
    result.token.chainId ?? "chain-missing",
    result.token.tokenAddress ?? "address-missing",
    result.dataQuality,
    result.generatedAt,
    quorumGate.status,
    durableVault.status,
  ].join("|");

  let hash = 2166136261;
  for (let index = 0; index < registryHash.length; index += 1) {
    hash ^= registryHash.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const registryId = `FSR-${(hash >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;

  const entries: SourceFreshnessRegistryEntry[] = [
    {
      id: "chart",
      label: "chart tape",
      ttlMinutes: 15,
      ageMinutes: chartAge,
      state: freshnessState(chartAge, 15, Boolean(snapshot?.chartError)),
      note: snapshot?.chartError ?? (snapshot?.chartSource ? `${snapshot.chartSource} heartbeat` : "chart adapter timestamp"),
    },
    {
      id: "depth",
      label: "depth tape",
      ttlMinutes: 5,
      ageMinutes: depthAge,
      state: freshnessState(depthAge, 5, Boolean(snapshot?.orderbookError)),
      note: snapshot?.orderbookError ?? (hasOrderbook(snapshot) ? "orderbook/depth snapshot" : "depth adapter missing"),
    },
    {
      id: "policy",
      label: "source policy",
      ttlMinutes: 60,
      ageMinutes: policyScore !== undefined ? generatedAge : undefined,
      state:
        quorumGate.status === "circuit_breaker_active"
          ? "blocked"
          : freshnessState(policyScore !== undefined ? generatedAge : undefined, 60),
      note: quorumGate.headline,
    },
    {
      id: "receipt",
      label: "audit receipt",
      ttlMinutes: 240,
      ageMinutes: vaultScore !== undefined ? generatedAge : undefined,
      state:
        durableVault.status === "ledger_write_blocked"
          ? "operator_only"
          : freshnessState(vaultScore !== undefined ? generatedAge : undefined, 240),
      note: durableVault.headline,
    },
    {
      id: "operator",
      label: "review seal",
      ttlMinutes: 720,
      ageMinutes: undefined,
      state: "operator_only",
      note: "human reviewer owner required before customer export",
    },
  ];

  const laneStress = Math.round(
    clamp(entries.reduce((sum, entry) => sum + stateStress(entry.state), 0) / entries.length),
  );
  const sourceStress = clamp(
    result.dataQuality === "live" ? 18 : result.dataQuality === "partial" ? 48 : 72,
  );
  const quorumStress = clamp(policyScore ?? 58);
  const vaultStress = clamp(vaultScore ?? 64);
  const freshnessScore = Math.round(
    clamp(laneStress * 0.38 + sourceStress * 0.2 + quorumStress * 0.22 + vaultStress * 0.2),
  );

  const blockers = [
    entries.some((entry) => entry.state === "blocked") ? "blocked freshness lane" : null,
    entries.some((entry) => entry.state === "missing") ? "missing source timestamp" : null,
    entries.some((entry) => entry.state === "stale") ? "stale source lane" : null,
    entries.some((entry) => entry.state === "operator_only") ? "operator reviewer seal" : null,
    result.dataQuality !== "live" ? "live source replacement" : null,
    durableVault.status === "ledger_write_blocked" ? "durable receipt write" : null,
  ].filter((item): item is string => Boolean(item));

  const status: SourceFreshnessRegistryStatus =
    freshnessScore >= 72 || blockers.includes("blocked freshness lane")
      ? "expired_registry"
      : freshnessScore >= 56 || blockers.includes("stale source lane")
        ? "stale_registry_review"
        : freshnessScore >= 38 || blockers.includes("missing source timestamp")
          ? "freshness_gap"
          : "private_freshness_seal";

  const headline =
    status === "expired_registry"
      ? "freshness registry expired"
      : status === "stale_registry_review"
        ? "freshness needs review"
        : status === "freshness_gap"
          ? "freshness gap detected"
          : "private freshness seal";

  const operatorCue =
    status === "expired_registry"
      ? "The readout enters a velvet waiting room: stale or blocked source lanes pause confidence instead of creating urgency. No FOMO copy, no public seal, no export shortcut."
      : status === "stale_registry_review"
        ? "The source registry has enough structure for review, but TTL decay is visible. Elite status stays locked until chart, depth, policy and receipt lanes are refreshed."
        : status === "freshness_gap"
          ? "Some inputs are missing timestamps. Keep the interface calm and route Pro/Advanced toward source repair rather than stronger conclusions."
          : "Freshness lanes are calm enough for a private proof cue; keep it as quiet status, not a trading or safety certificate.";

  return {
    version: "velmere_source_freshness_registry_gate_v1_pass279",
    status,
    headline,
    trustBadge: `freshness ${freshnessScore}/100`,
    operatorCue,
    entries,
    blockers,
    nextAction:
      status === "expired_registry"
        ? "Refresh chart/depth adapters, write the receipt server-side and attach an operator seal before any stronger customer wording."
        : status === "stale_registry_review"
          ? "Replay second-source timestamps and keep the freshness lane operator-only until TTL, receipt and policy lanes agree."
          : status === "freshness_gap"
            ? "Attach timestamp metadata to every source lane and show Basic as short review-pending copy."
            : "Preserve the private freshness seal, schedule TTL refresh and avoid urgency/status pressure in public copy.",
    customerBoundary:
      "Customer-facing copy may say review pending / sources refreshed privately only; it must not claim safety, profit, certainty, or a public certification.",
    rails: [
      {
        id: "registry",
        label: "registry",
        value: registryId,
        tone: blockers.length ? "gold" : "green",
        note: "deterministic freshness key",
      },
      {
        id: "ttl",
        label: "ttl decay",
        value: `${entries.filter((entry) => entry.state === "fresh").length}/${entries.length}`,
        tone: toneFromStress(laneStress),
        note: "fresh lanes inside TTL",
      },
      {
        id: "chart",
        label: "chart",
        value: chartAge === undefined ? "missing" : `${compact(chartAge)}m`,
        tone: toneFromStress(stateStress(entries[0].state)),
        note: entries[0].note,
      },
      {
        id: "depth",
        label: "depth",
        value: depthAge === undefined ? "missing" : `${compact(depthAge)}m`,
        tone: toneFromStress(stateStress(entries[1].state)),
        note: entries[1].note,
      },
      {
        id: "receipt",
        label: "receipt",
        value: durableVault.status.replaceAll("_", " "),
        tone: toneFromStress(vaultStress),
        note: "audit receipt freshness",
      },
      {
        id: "seal",
        label: "seal",
        value: `${freshnessScore}/100`,
        tone: toneFromStress(freshnessScore),
        note: status.replaceAll("_", " "),
      },
    ],
  };
}
