import type { TokenRiskResult } from "./risk-types";
import type { SourcePolicyAllowlistGate } from "./source-policy-allowlist-gate";

export type DurableAuditReceiptVaultTone = "gold" | "cyan" | "amber" | "red" | "green" | "neutral";

export type DurableAuditReceiptVaultStatus =
  | "ledger_write_blocked"
  | "operator_receipt_pending"
  | "redacted_receipt_ready"
  | "private_vault_ready";

export type DurableAuditReceiptVaultRail = {
  id: "case" | "hash" | "storage" | "redaction" | "retention" | "seal";
  label: string;
  value: string;
  tone: DurableAuditReceiptVaultTone;
  note: string;
};

export type DurableAuditReceiptVaultReceipt = {
  id: string;
  label: string;
  status: "write_ready" | "operator_only" | "blocked" | "redacted";
  value: string;
  note: string;
};

export type DurableAuditReceiptVault = {
  version: "velmere_durable_audit_receipt_vault_v1_pass278";
  status: DurableAuditReceiptVaultStatus;
  headline: string;
  trustBadge: string;
  operatorCue: string;
  rails: DurableAuditReceiptVaultRail[];
  receipts: DurableAuditReceiptVaultReceipt[];
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

function compact(value?: number, fallback = "missing") {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return new Intl.NumberFormat("en-US", {
    notation: Math.abs(value) >= 1_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function shortHash(payload: string) {
  let hash = 2166136261;
  for (let index = 0; index < payload.length; index += 1) {
    hash ^= payload.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").toUpperCase();
}

function toneFromStress(score: number): DurableAuditReceiptVaultTone {
  if (score >= 74) return "red";
  if (score >= 52) return "amber";
  if (score >= 30) return "gold";
  return "green";
}

function parsePolicyScore(gate?: SourcePolicyAllowlistGate | null) {
  const raw = gate?.trustBadge.match(/(\d+)\/100/)?.[1];
  return raw ? Number(raw) : undefined;
}

function missingCoreIdentity(result: TokenRiskResult) {
  const missing = [];
  if (!result.token.symbol) missing.push("symbol");
  if (!result.token.marketId) missing.push("market id");
  if (!result.token.chainId) missing.push("chain");
  if (!result.token.tokenAddress) missing.push("contract address");
  return missing;
}

function buildCaseId(result: TokenRiskResult) {
  const seed = [
    stablePart(result.token.marketId),
    stablePart(result.token.chainId),
    stablePart(result.token.tokenAddress),
    stablePart(result.token.symbol),
    stablePart(result.generatedAt).slice(0, 13),
  ].join("|");
  return `VLM-${shortHash(seed).slice(0, 4)}-${shortHash(`${seed}|case`).slice(0, 6)}`;
}

export function buildDurableAuditReceiptVault(
  result: TokenRiskResult,
  sourcePolicyGate?: SourcePolicyAllowlistGate | null,
): DurableAuditReceiptVault {
  const sourceCount = result.dataSources?.filter(Boolean).length ?? 0;
  const missingIdentity = missingCoreIdentity(result);
  const policyScore = parsePolicyScore(sourcePolicyGate);
  const policyBlocked = sourcePolicyGate?.status === "policy_quarantine" || sourcePolicyGate?.status === "second_source_required";
  const fallbackMode = result.dataQuality !== "live";
  const caseId = buildCaseId(result);
  const evidencePayload = [
    result.token.symbol,
    result.token.marketId,
    result.token.chainId,
    result.token.tokenAddress,
    result.score,
    result.level,
    result.dataQuality,
    result.generatedAt,
    result.dataSources?.join(",") ?? "",
  ].join("|");
  const fingerprint = `VR-${shortHash(evidencePayload)}-${shortHash(`${evidencePayload}|redacted`).slice(0, 4)}`;

  const caseStress = clamp(missingIdentity.length ? 62 + missingIdentity.length * 6 : 16);
  const hashStress = clamp(sourceCount >= 2 ? 18 : sourceCount === 1 ? 48 : 76);
  const storageStress = clamp(68 + (fallbackMode ? 8 : 0));
  const redactionStress = clamp(result.token.tokenAddress ? 24 : 42);
  const retentionStress = clamp(52);
  const sealStress = clamp(policyBlocked ? 68 : policyScore !== undefined && policyScore >= 56 ? 52 : 28);

  const vaultStress = Math.round(
    clamp(
      caseStress * 0.18 +
        hashStress * 0.16 +
        storageStress * 0.22 +
        redactionStress * 0.15 +
        retentionStress * 0.12 +
        sealStress * 0.17,
    ),
  );

  const blockers = [
    missingIdentity.length ? `identity fields: ${missingIdentity.join(", ")}` : null,
    sourceCount < 2 ? "minimum two source receipts" : null,
    fallbackMode ? "live source replacement" : null,
    "durable server storage adapter",
    "retention policy owner",
    policyBlocked ? "source policy/passport clearance" : null,
  ].filter((item): item is string => Boolean(item));

  const status: DurableAuditReceiptVaultStatus =
    blockers.includes("durable server storage adapter") && vaultStress >= 64
      ? "ledger_write_blocked"
      : policyBlocked || missingIdentity.length > 1
        ? "operator_receipt_pending"
        : vaultStress >= 38
          ? "redacted_receipt_ready"
          : "private_vault_ready";

  const headline =
    status === "ledger_write_blocked"
      ? "audit ledger write blocked"
      : status === "operator_receipt_pending"
        ? "operator receipt pending"
        : status === "redacted_receipt_ready"
          ? "redacted receipt ready"
          : "private vault ready";

  const operatorCue =
    status === "ledger_write_blocked"
      ? "The UI can generate a redacted proof receipt, but it must not pretend durable storage exists. FOMO is converted into a waiting room until storage, retention and source policy are reviewed."
      : status === "operator_receipt_pending"
        ? "The case has a receipt shell, but missing identity or policy evidence keeps it operator-only. Elite status is withheld until proof is written and review-owned."
        : status === "redacted_receipt_ready"
          ? "The receipt can be shown as a private proof cue while raw payloads stay hidden. Customer copy may mention review status only."
          : "The receipt has enough proof structure for a quiet private vault cue; keep the public surface calm and non-promotional.";

  const rails: DurableAuditReceiptVaultRail[] = [
    {
      id: "case",
      label: "case",
      value: caseId,
      tone: missingIdentity.length ? "amber" : "green",
      note: missingIdentity.length ? "identity gaps" : "stable case key",
    },
    {
      id: "hash",
      label: "receipt",
      value: fingerprint,
      tone: sourceCount >= 2 ? "cyan" : "amber",
      note: sourceCount >= 2 ? "redacted hash" : "needs receipts",
    },
    {
      id: "storage",
      label: "storage",
      value: "server adapter",
      tone: "red",
      note: "not public proof yet",
    },
    {
      id: "redaction",
      label: "redaction",
      value: result.token.tokenAddress ? "masked" : "minimal",
      tone: result.token.tokenAddress ? "green" : "gold",
      note: "no raw wallet/IP",
    },
    {
      id: "retention",
      label: "retention",
      value: "policy needed",
      tone: "amber",
      note: "legal owner gate",
    },
    {
      id: "seal",
      label: "seal",
      value: `${vaultStress}/100`,
      tone: toneFromStress(vaultStress),
      note: status.replaceAll("_", " "),
    },
  ];

  const receipts: DurableAuditReceiptVaultReceipt[] = [
    {
      id: "market-snapshot",
      label: "market snapshot",
      status: sourceCount >= 1 ? "redacted" : "blocked",
      value: compact(result.metrics.currentPrice),
      note: "price/risk snapshot; not advice",
    },
    {
      id: "source-passport",
      label: "source passport",
      status: policyBlocked ? "operator_only" : "write_ready",
      value: sourcePolicyGate?.headline ?? "policy missing",
      note: "allowlist state is preserved",
    },
    {
      id: "identity-envelope",
      label: "identity envelope",
      status: missingIdentity.length ? "operator_only" : "write_ready",
      value: missingIdentity.length ? `${missingIdentity.length} gaps` : "complete",
      note: "chain/address/market key",
    },
    {
      id: "redaction-envelope",
      label: "redaction envelope",
      status: "redacted",
      value: "customer-safe",
      note: "raw payloads stay internal",
    },
  ];

  return {
    version: "velmere_durable_audit_receipt_vault_v1_pass278",
    status,
    headline,
    trustBadge: `vault ${vaultStress}/100`,
    operatorCue,
    rails,
    receipts,
    blockers,
    nextAction:
      status === "ledger_write_blocked"
        ? "Connect server-side append storage, retention owner and source-policy clearance before this receipt is treated as durable evidence."
        : status === "operator_receipt_pending"
          ? "Complete missing identity fields, attach second-source receipts and keep the receipt operator-only."
          : status === "redacted_receipt_ready"
            ? "Write the redacted receipt to durable storage and attach reviewer/retention owner before export copy."
            : "Refresh the receipt, keep the vault private and avoid public safety or profit language.",
    customerBoundary:
      "Customer-visible surfaces may show review pending / receipt prepared only; they must not expose raw payloads, wallet/IP data, or any safety certificate wording.",
  };
}
