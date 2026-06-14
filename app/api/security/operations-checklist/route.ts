import { abuseShieldResponseMeta, applyApiAbuseShield } from "@/lib/security/api-abuse-shield";
import { securityJson } from "@/lib/security/api-guard";
import { buildSecurityOperationsChecklistSnapshot } from "@/lib/security/security-operations-checklist";
import { buildSecurityReadinessSnapshot } from "@/lib/security/security-readiness";
import { buildDurableRateLimitReadiness } from "@/lib/security/durable-rate-limit";
import { buildSecurityAdminGateReadiness } from "@/lib/security/security-admin-auth";
import { buildSecurityEventAppendReadiness } from "@/lib/security/security-event-append-adapter";
import { buildSecurityRuntimeQaSnapshot } from "@/lib/security/security-runtime-qa";
import { buildSecurityReleaseGateSnapshot } from "@/lib/security/security-release-gate";
import { buildPaymentWebhookSecuritySnapshot } from "@/lib/security/payment-webhook-security";
import { buildPaymentRuntimeEvidenceSnapshot } from "@/lib/security/payment-runtime-evidence";
import { buildStripeWebhookReplayQaSnapshot } from "@/lib/security/stripe-webhook-replay-qa";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const shield = await applyApiAbuseShield(request, "security", {
    keyPrefix: "security-operations-checklist",
    queryParam: "q",
    allowEmptyQuery: true,
  });
  if (!shield.ok) return shield.response;

  return securityJson({
    ok: true,
    ...buildSecurityOperationsChecklistSnapshot(),
    readiness: buildSecurityReadinessSnapshot(),
    durableRateLimit: buildDurableRateLimitReadiness(),
    securityAdminGate: buildSecurityAdminGateReadiness(),
    eventAppendAdapter: buildSecurityEventAppendReadiness(),
    runtimeQa: buildSecurityRuntimeQaSnapshot(),
    releaseGate: buildSecurityReleaseGateSnapshot(),
    paymentWebhookSecurity: buildPaymentWebhookSecuritySnapshot(),
    paymentRuntimeEvidence: buildPaymentRuntimeEvidenceSnapshot(),
    stripeWebhookReplayQa: buildStripeWebhookReplayQaSnapshot(),
    ...abuseShieldResponseMeta(shield),
  });
}
