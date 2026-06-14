import { abuseShieldResponseMeta, applyApiAbuseShield } from "@/lib/security/api-abuse-shield";
import { buildDurableRateLimitReadiness } from "@/lib/security/durable-rate-limit";
import { securityJson } from "@/lib/security/api-guard";
import { buildSecurityReadinessSnapshot } from "@/lib/security/security-readiness";
import { buildSecurityEventLedgerSnapshot } from "@/lib/security/security-event-ledger";
import { buildSecurityAlertSnapshot } from "@/lib/security/security-alert-rules";
import { buildSecurityAdminGateReadiness } from "@/lib/security/security-admin-auth";
import { buildSecurityEventStoreSnapshot } from "@/lib/security/security-event-store-contract";
import { buildSecurityEventAppendReadiness } from "@/lib/security/security-event-append-adapter";
import { buildSecurityRuntimeQaSnapshot } from "@/lib/security/security-runtime-qa";
import { buildSecurityReleaseGateSnapshot } from "@/lib/security/security-release-gate";
import { buildPaymentWebhookSecuritySnapshot } from "@/lib/security/payment-webhook-security";
import { buildPaymentRuntimeEvidenceSnapshot } from "@/lib/security/payment-runtime-evidence";
import { buildStripeWebhookReplayQaSnapshot } from "@/lib/security/stripe-webhook-replay-qa";
import { buildSecurityAdminAuditSnapshot } from "@/lib/security/security-admin-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const shield = await applyApiAbuseShield(request, "security", { keyPrefix: "security-readiness", queryParam: "q", allowEmptyQuery: true });
  if (!shield.ok) return shield.response;

  return securityJson({
    ok: true,
    ...buildSecurityReadinessSnapshot(),
    durableRateLimit: buildDurableRateLimitReadiness(),
    securityEventLedger: buildSecurityEventLedgerSnapshot(),
    alertRules: buildSecurityAlertSnapshot(),
    securityAdminGate: buildSecurityAdminGateReadiness(),
    eventStore: buildSecurityEventStoreSnapshot(),
    eventAppendAdapter: buildSecurityEventAppendReadiness(),
    runtimeQa: buildSecurityRuntimeQaSnapshot(),
    releaseGate: buildSecurityReleaseGateSnapshot(),
    paymentWebhookSecurity: buildPaymentWebhookSecuritySnapshot(),
    paymentRuntimeEvidence: buildPaymentRuntimeEvidenceSnapshot(),
    stripeWebhookReplayQa: buildStripeWebhookReplayQaSnapshot(),
    securityAdminAudit: buildSecurityAdminAuditSnapshot(),
    ...abuseShieldResponseMeta(shield),
  });
}
