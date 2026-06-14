export type PaymentRuntimeEvidenceStatus = "pass" | "fail" | "manual" | "blocked";
export type PaymentRuntimeEvidenceArea =
  | "checkout"
  | "stripe_webhook"
  | "idempotency"
  | "order_persistence"
  | "fulfilment"
  | "refund_support"
  | "release_gate";

export type PaymentRuntimeEvidenceRecord = {
  id: string;
  area: PaymentRuntimeEvidenceArea;
  status: PaymentRuntimeEvidenceStatus;
  label: string;
  summary: string;
  evidenceRef: string;
  operator: string;
  createdAt: string;
  safeNotes?: string;
};

export type PaymentRuntimeEvidenceInput = {
  area?: unknown;
  status?: unknown;
  label?: unknown;
  summary?: unknown;
  evidenceRef?: unknown;
  operator?: unknown;
  safeNotes?: unknown;
};

const paymentEvidenceRecords: PaymentRuntimeEvidenceRecord[] = [];
const MAX_PAYMENT_EVIDENCE = 160;

const allowedAreas = new Set<PaymentRuntimeEvidenceArea>([
  "checkout",
  "stripe_webhook",
  "idempotency",
  "order_persistence",
  "fulfilment",
  "refund_support",
  "release_gate",
]);

const allowedStatuses = new Set<PaymentRuntimeEvidenceStatus>(["pass", "fail", "manual", "blocked"]);

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function cleanText(value: unknown, fallback: string, max = 220) {
  if (typeof value !== "string") return fallback;
  return value
    .replace(/[<>{}[\]`$\\]/g, " ")
    .replace(/\b(?:sk_live|pk_live|whsec|Bearer)\b[^\s]*/gi, "[redacted]")
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, "[redacted-card-like]")
    .trim()
    .slice(0, max) || fallback;
}

function normalizeArea(value: unknown): PaymentRuntimeEvidenceArea {
  return typeof value === "string" && allowedAreas.has(value as PaymentRuntimeEvidenceArea)
    ? (value as PaymentRuntimeEvidenceArea)
    : "release_gate";
}

function normalizeStatus(value: unknown): PaymentRuntimeEvidenceStatus {
  return typeof value === "string" && allowedStatuses.has(value as PaymentRuntimeEvidenceStatus)
    ? (value as PaymentRuntimeEvidenceStatus)
    : "manual";
}

export function recordPaymentRuntimeEvidence(input: PaymentRuntimeEvidenceInput) {
  const createdAt = new Date().toISOString();
  const area = normalizeArea(input.area);
  const status = normalizeStatus(input.status);
  const record: PaymentRuntimeEvidenceRecord = {
    id: `payev_${stableHash(`${area}:${status}:${createdAt}:${Math.random()}`)}`,
    area,
    status,
    label: cleanText(input.label, "Payment runtime evidence"),
    summary: cleanText(input.summary, "Operator evidence captured without raw payment payloads.", 420),
    evidenceRef: cleanText(input.evidenceRef, "manual-reference", 180),
    operator: cleanText(input.operator, "security-admin", 120),
    createdAt,
    safeNotes: cleanText(input.safeNotes, "", 420) || undefined,
  };

  paymentEvidenceRecords.unshift(record);
  if (paymentEvidenceRecords.length > MAX_PAYMENT_EVIDENCE) paymentEvidenceRecords.length = MAX_PAYMENT_EVIDENCE;
  return record;
}

export function listPaymentRuntimeEvidence(limit = 40) {
  return paymentEvidenceRecords.slice(0, Math.max(1, Math.min(limit, 100)));
}

export function getPaymentRuntimeEvidenceAreaProgress(area: PaymentRuntimeEvidenceArea) {
  const records = paymentEvidenceRecords.filter((record) => record.area === area);
  if (!records.length) return 0;
  const pass = records.filter((record) => record.status === "pass").length;
  const fail = records.filter((record) => record.status === "fail" || record.status === "blocked").length;
  return Math.max(0, Math.min(100, Math.round((pass / Math.max(1, records.length + fail)) * 100)));
}

export function buildPaymentRuntimeEvidenceSnapshot() {
  const recent = listPaymentRuntimeEvidence(40);
  const pass = paymentEvidenceRecords.filter((record) => record.status === "pass").length;
  const fail = paymentEvidenceRecords.filter((record) => record.status === "fail").length;
  const blocked = paymentEvidenceRecords.filter((record) => record.status === "blocked").length;
  const manual = paymentEvidenceRecords.filter((record) => record.status === "manual").length;
  const averageEvidenceProgress = Math.round(
    (getPaymentRuntimeEvidenceAreaProgress("checkout") +
      getPaymentRuntimeEvidenceAreaProgress("stripe_webhook") +
      getPaymentRuntimeEvidenceAreaProgress("idempotency") +
      getPaymentRuntimeEvidenceAreaProgress("order_persistence") +
      getPaymentRuntimeEvidenceAreaProgress("fulfilment") +
      getPaymentRuntimeEvidenceAreaProgress("refund_support")) /
      6,
  );

  return {
    schemaVersion: "velmere-payment-runtime-evidence-v1",
    mode: "in_memory_payment_runtime_evidence_capture",
    generatedAt: new Date().toISOString(),
    total: paymentEvidenceRecords.length,
    pass,
    fail,
    blocked,
    manual,
    averageEvidenceProgress,
    recent,
    storageWritePerformed: false,
    durableStorageReady: false,
    productionBoundary:
      "Payment runtime evidence stores operator-safe summaries only; no raw Stripe payloads are permitted. It must not store card data, raw Stripe payloads, raw headers, secrets, raw IP addresses or raw customer PII.",
  };
}
