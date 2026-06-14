import { buildPaymentRuntimeEvidenceSnapshot, recordPaymentRuntimeEvidence } from "@/lib/security/payment-runtime-evidence";

export type StripeWebhookReplayScenarioStatus = "pending" | "manual" | "pass" | "blocked";

export type StripeWebhookReplayScenario = {
  id: string;
  label: string;
  status: StripeWebhookReplayScenarioStatus;
  progress: number;
  commandHint: string;
  expected: string;
  evidenceNeeded: string[];
  blockerIfMissing: string;
};

export const stripeWebhookReplayScenarios: StripeWebhookReplayScenario[] = [
  {
    id: "missing-signature",
    label: "Missing signature rejection",
    status: "manual",
    progress: 72,
    commandHint: "POST /api/stripe/webhook without stripe-signature header on Vercel preview.",
    expected: "400 response before any order mutation.",
    evidenceNeeded: ["HTTP status", "response error", "no order event"],
    blockerIfMissing: "Webhook route must reject unsigned payloads before production checkout.",
  },
  {
    id: "oversized-webhook-payload",
    label: "Oversized webhook payload rejection",
    status: "manual",
    progress: 70,
    commandHint: "POST payload above configured webhook max bytes to staging endpoint.",
    expected: "413 response before signature processing and order mutation.",
    evidenceNeeded: ["HTTP status", "no mutation", "server log"],
    blockerIfMissing: "Large payloads could waste runtime resources.",
  },
  {
    id: "signed-checkout-completed",
    label: "Signed checkout.session.completed acceptance",
    status: "blocked",
    progress: 56,
    commandHint: "Use Stripe CLI/Vercel webhook forwarding with a signed checkout.session.completed test event.",
    expected: "200 received true; order persistence or safe fallback is visible.",
    evidenceNeeded: ["Stripe event id", "HTTP status", "persisted/order fallback", "operator state"],
    blockerIfMissing: "Paid order path is not proven on Vercel runtime.",
  },
  {
    id: "duplicate-replay",
    label: "Duplicate webhook replay",
    status: "blocked",
    progress: 48,
    commandHint: "Replay the same signed Stripe event id twice.",
    expected: "Second call returns duplicate true and does not duplicate order/fulfilment state.",
    evidenceNeeded: ["first response", "second response", "order count unchanged"],
    blockerIfMissing: "Duplicate provider events could create duplicate order side effects.",
  },
  {
    id: "unsupported-signed-event",
    label: "Unsupported signed event",
    status: "manual",
    progress: 68,
    commandHint: "Send signed Stripe event type not in supported allowlist.",
    expected: "200 received true unsupported true, no order mutation.",
    evidenceNeeded: ["HTTP status", "unsupported true", "no mutation"],
    blockerIfMissing: "Unsupported events must not mutate order state.",
  },
  {
    id: "printful-failure-path",
    label: "Fulfilment failure path",
    status: "blocked",
    progress: 44,
    commandHint: "Force provider draft creation failure in staging with safe test data.",
    expected: "Order enters failed/operator-review state without silent fulfilment loss.",
    evidenceNeeded: ["order state", "operator warning", "support path"],
    blockerIfMissing: "Provider failure could become invisible after payment.",
  },
];

export function recordStripeWebhookReplayEvidence(input: {
  scenarioId?: unknown;
  status?: unknown;
  evidenceRef?: unknown;
  summary?: unknown;
  operator?: unknown;
}) {
  const scenarioId = typeof input.scenarioId === "string" ? input.scenarioId : "manual-replay";
  const scenario = stripeWebhookReplayScenarios.find((item) => item.id === scenarioId);
  return recordPaymentRuntimeEvidence({
    area: "stripe_webhook",
    status: input.status,
    label: scenario ? `Stripe replay QA · ${scenario.label}` : "Stripe replay QA",
    summary: input.summary ?? "Stripe webhook replay evidence captured.",
    evidenceRef: input.evidenceRef,
    operator: input.operator,
    safeNotes: scenario ? `scenario=${scenario.id}` : "scenario=manual",
  });
}

export function buildStripeWebhookReplayQaSnapshot() {
  const evidence = buildPaymentRuntimeEvidenceSnapshot();
  const scenarioEvidenceCount = evidence.recent.filter((record) => record.area === "stripe_webhook").length;
  const averageProgress = Math.round(
    stripeWebhookReplayScenarios.reduce((sum, scenario) => sum + scenario.progress, 0) / stripeWebhookReplayScenarios.length,
  );
  return {
    schemaVersion: "velmere-stripe-webhook-replay-qa-v1",
    mode: "stripe_webhook_replay_qa_ledger",
    generatedAt: new Date().toISOString(),
    averageProgress: scenarioEvidenceCount > 0 ? Math.max(averageProgress, evidence.averageEvidenceProgress) : averageProgress,
    scenarioEvidenceCount,
    scenarios: stripeWebhookReplayScenarios,
    evidence,
    productionBoundary:
      "Replay QA ledger is operator evidence capture. It does not contain raw Stripe payloads, raw headers, secrets, card data or raw customer PII.",
  };
}
