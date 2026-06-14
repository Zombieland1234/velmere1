import type { TokenRiskResult } from "./risk-types";
import type { AnalyticsEventTaxonomyGate } from "./analytics-event-taxonomy-gate";
import type { DurableAuditReceiptVault } from "./durable-audit-receipt-vault";
import type { SourceFreshnessRegistryGate } from "./source-freshness-registry-gate";

export type StorageAdapterContractTone = "gold" | "cyan" | "amber" | "red" | "green" | "neutral";

export type StorageAdapterContractStatus =
  | "server_adapter_missing"
  | "idempotency_review"
  | "redaction_bind_pending"
  | "quiet_storage_covenant";

export type StorageAdapterContractRail = {
  id: "adapter" | "idempotency" | "redaction" | "retention" | "replay" | "covenant";
  label: string;
  value: string;
  tone: StorageAdapterContractTone;
  note: string;
};

export type StorageAdapterContractLane = {
  id: "case_write" | "source_snapshot" | "analytics_event" | "receipt_hash" | "retention_rule" | "export_replay";
  label: string;
  state: "ready" | "preview_only" | "operator_only" | "blocked";
  writeTarget: "server_adapter" | "redacted_preview" | "operator_queue" | "none";
  note: string;
};

export type StorageAdapterContractGate = {
  version: "velmere_storage_adapter_contract_gate_v1_pass281";
  status: StorageAdapterContractStatus;
  headline: string;
  trustBadge: string;
  operatorCue: string;
  rails: StorageAdapterContractRail[];
  lanes: StorageAdapterContractLane[];
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

function toneFromStress(score: number): StorageAdapterContractTone {
  if (score >= 74) return "red";
  if (score >= 52) return "amber";
  if (score >= 30) return "gold";
  return "green";
}

function laneStress(state: StorageAdapterContractLane["state"]) {
  switch (state) {
    case "ready":
      return 12;
    case "preview_only":
      return 34;
    case "operator_only":
      return 58;
    case "blocked":
      return 86;
    default:
      return 62;
  }
}

function stateFor(condition: boolean, blocked: boolean): StorageAdapterContractLane["state"] {
  if (blocked) return "blocked";
  return condition ? "preview_only" : "operator_only";
}

function buildCovenantId(result: TokenRiskResult, vault: DurableAuditReceiptVault, taxonomy: AnalyticsEventTaxonomyGate) {
  const seed = [
    stablePart(result.token.marketId),
    stablePart(result.token.chainId),
    stablePart(result.token.tokenAddress),
    stablePart(result.generatedAt).slice(0, 13),
    vault.status,
    taxonomy.status,
  ].join("|");
  return `SAC-${shortHash(seed).slice(0, 4)}-${shortHash(`${seed}|storage`).slice(0, 6)}`;
}

export function buildStorageAdapterContractGate(
  result: TokenRiskResult,
  durableVault: DurableAuditReceiptVault,
  freshnessRegistry: SourceFreshnessRegistryGate,
  analyticsTaxonomy: AnalyticsEventTaxonomyGate,
): StorageAdapterContractGate {
  const serverAdapterReady = false;
  const hasContractIdentity = Boolean(result.token.chainId && result.token.tokenAddress);
  const hasMarketIdentity = Boolean(result.token.marketId || result.token.symbol);
  const hasSourceReceipt = durableVault.status !== "ledger_write_blocked";
  const hasFreshnessSeal = freshnessRegistry.status === "private_freshness_seal";
  const hasTaxonomySeal = analyticsTaxonomy.status === "velvet_event_passport";
  const redactionScore = parseScore(durableVault.trustBadge) ?? 72;
  const freshnessScore = parseScore(freshnessRegistry.trustBadge) ?? 68;
  const taxonomyScore = parseScore(analyticsTaxonomy.trustBadge) ?? 64;
  const covenantId = buildCovenantId(result, durableVault, analyticsTaxonomy);

  const lanes: StorageAdapterContractLane[] = [
    {
      id: "case_write",
      label: "case write",
      state: serverAdapterReady ? "ready" : "blocked",
      writeTarget: serverAdapterReady ? "server_adapter" : "none",
      note: serverAdapterReady
        ? "server-side append path available"
        : "no browser/localStorage proof may pretend to be durable storage",
    },
    {
      id: "source_snapshot",
      label: "source snapshot",
      state: stateFor(hasFreshnessSeal, !hasMarketIdentity),
      writeTarget: hasFreshnessSeal ? "redacted_preview" : "operator_queue",
      note: hasFreshnessSeal ? "freshness seal can be copied into storage envelope" : "chart/depth/source TTL still needs reviewer replay",
    },
    {
      id: "analytics_event",
      label: "analytics event",
      state: hasTaxonomySeal ? "preview_only" : "operator_only",
      writeTarget: hasTaxonomySeal ? "redacted_preview" : "operator_queue",
      note: "aggregate event keys only; no wallet, IP, raw query or customer PII payload",
    },
    {
      id: "receipt_hash",
      label: "receipt hash",
      state: hasSourceReceipt ? "preview_only" : "blocked",
      writeTarget: hasSourceReceipt ? "redacted_preview" : "none",
      note: hasSourceReceipt ? "receipt can be previewed with redaction envelope" : "receipt write remains blocked until storage adapter exists",
    },
    {
      id: "retention_rule",
      label: "retention rule",
      state: "operator_only",
      writeTarget: "operator_queue",
      note: "retention owner, TTL and delete/export boundary must be attached before customer export",
    },
    {
      id: "export_replay",
      label: "export replay",
      state: hasContractIdentity && hasSourceReceipt && hasTaxonomySeal ? "operator_only" : "blocked",
      writeTarget: hasContractIdentity ? "operator_queue" : "none",
      note: "export intent stays replay-only until durable adapter, redaction and browser evidence pass",
    },
  ];

  const storageStress = serverAdapterReady ? 12 : 84;
  const identityStress = hasContractIdentity ? 18 : hasMarketIdentity ? 44 : 72;
  const laneAverage = Math.round(clamp(lanes.reduce((sum, lane) => sum + laneStress(lane.state), 0) / lanes.length));
  const totalScore = Math.round(
    clamp(
      storageStress * 0.28 +
        identityStress * 0.12 +
        redactionScore * 0.18 +
        freshnessScore * 0.16 +
        taxonomyScore * 0.12 +
        laneAverage * 0.14,
    ),
  );

  const blockers = [
    !serverAdapterReady ? "server storage adapter" : null,
    !hasContractIdentity ? "chain/contract identity" : null,
    durableVault.status === "ledger_write_blocked" ? "durable receipt write" : null,
    freshnessRegistry.status !== "private_freshness_seal" ? "freshness replay seal" : null,
    analyticsTaxonomy.status !== "velvet_event_passport" ? "analytics privacy seal" : null,
    "retention owner / deletion boundary",
  ].filter((item): item is string => Boolean(item));

  const status: StorageAdapterContractStatus =
    !serverAdapterReady || totalScore >= 74
      ? "server_adapter_missing"
      : lanes.some((lane) => lane.id === "export_replay" && lane.state === "blocked")
        ? "idempotency_review"
        : !hasSourceReceipt || !hasTaxonomySeal
          ? "redaction_bind_pending"
          : "quiet_storage_covenant";

  const headline =
    status === "server_adapter_missing"
      ? "server storage adapter missing"
      : status === "idempotency_review"
        ? "storage idempotency review"
        : status === "redaction_bind_pending"
          ? "redaction bind pending"
          : "Quiet Storage Covenant";

  const operatorCue =
    status === "server_adapter_missing"
      ? "Storage stays honest: the UI can preview receipts, but it cannot pretend local/browser state is durable proof. Elite status appears only after server append, idempotency and retention are attached."
      : status === "idempotency_review"
        ? "The adapter path exists, but replay/idempotency must be proven before export or customer copy. Calm review beats urgency pressure."
        : status === "redaction_bind_pending"
          ? "Storage is close, but redaction and analytics privacy seals must bind before any public report language."
          : "The storage covenant can act as a private trust seal: server append, redaction, retention and replay are aligned without FOMO pressure.";

  return {
    version: "velmere_storage_adapter_contract_gate_v1_pass281",
    status,
    headline,
    trustBadge: `storage ${totalScore}/100`,
    operatorCue,
    rails: [
      {
        id: "adapter",
        label: "adapter",
        value: serverAdapterReady ? "server" : "missing",
        tone: toneFromStress(storageStress),
        note: "browser state cannot be durable proof",
      },
      {
        id: "idempotency",
        label: "idempotency",
        value: covenantId,
        tone: hasContractIdentity ? "cyan" : "amber",
        note: "case replay key",
      },
      {
        id: "redaction",
        label: "redaction",
        value: durableVault.status.replaceAll("_", " "),
        tone: toneFromStress(redactionScore),
        note: "receipt payload boundary",
      },
      {
        id: "retention",
        label: "retention",
        value: "operator",
        tone: "gold",
        note: "owner/TTL needed",
      },
      {
        id: "replay",
        label: "replay",
        value: lanes.find((lane) => lane.id === "export_replay")?.state.replaceAll("_", " ") ?? "blocked",
        tone: lanes.some((lane) => lane.state === "blocked") ? "red" : "green",
        note: "export remains replay-gated",
      },
      {
        id: "covenant",
        label: "covenant",
        value: status.replaceAll("_", " "),
        tone: toneFromStress(totalScore),
        note: "quiet trust, no urgency badge",
      },
    ],
    lanes,
    blockers,
    nextAction:
      status === "server_adapter_missing"
        ? "Create a server-only append adapter with idempotency key, redacted payload schema, retention owner, replay route and no localStorage/customer PII shortcut."
        : status === "idempotency_review"
          ? "Run duplicate-write replay and verify receipt hash stability before export preview expands."
          : status === "redaction_bind_pending"
            ? "Bind redaction, freshness and analytics seals into one storage envelope before customer copy."
            : "Keep the Quiet Storage Covenant private until browser replay, source quorum and retention proof are attached.",
    customerBoundary:
      "Customer-facing copy may mention privacy-preserving audit history only after server storage, redaction and retention are implemented; it must not claim safety, profit, certification, guaranteed accuracy or investment advice.",
  };
}
