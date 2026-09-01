import { createHash } from "node:crypto";

export function buildPreflightFailureEvent({
  authoredAssertionId = null,
  authoredGuardId = null,
  phase,
  guardScope,
  message,
  policy = null,
  observedAt = new Date().toISOString(),
}) {
  const normalizedMessage = String(message);
  const messageSha256 = createHash("sha256").update(normalizedMessage).digest("hex");
  return {
    id: `${authoredAssertionId ?? authoredGuardId ?? guardScope}.${messageSha256.slice(0, 12)}`,
    authoredAssertionId,
    authoredGuardId,
    phase,
    guardScope,
    message: normalizedMessage,
    messageSha256,
    severity: policy?.severity ?? "unknown",
    failureClass: policy?.failureClass ?? "unclassified",
    remediationOwner: policy?.remediationOwner ?? "unassigned",
    runbook: policy?.runbook ?? null,
    blocking: policy?.blocking ?? true,
    liveProofRequired: policy?.liveProofRequired ?? false,
    observedAt,
  };
}
