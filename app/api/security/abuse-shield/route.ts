import { abuseShieldResponseMeta, applyApiAbuseShield, evaluateAbuseSignals } from "@/lib/security/api-abuse-shield";
import { buildDurableRateLimitReadiness } from "@/lib/security/durable-rate-limit";
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
import { securityJson } from "@/lib/security/api-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const shield = await applyApiAbuseShield(request, "security", { keyPrefix: "abuse-shield-readiness", queryParam: "q", allowEmptyQuery: true });
  if (!shield.ok) return shield.response;

  const url = new URL(request.url);
  const sampleQuery = url.searchParams.get("q") ?? "";
  const sampleSignals = evaluateAbuseSignals(request, sampleQuery);

  return securityJson({
    ok: true,
    schemaVersion: "velmere-api-abuse-shield-readiness-v1",
    mode: "api_abuse_shield_preview",
    generatedAt: new Date().toISOString(),
    implemented: [
      "method guard",
      "URL size guard",
      "bounded query sanitizer",
      "scanner user-agent scoring",
      "malicious URL pattern scoring",
      "sensitive/script query scoring",
      "adaptive rate-limit profile",
      "durable provider contract with memory fallback",
    ],
    profiles: ["search", "analyze", "icon", "security", "contract", "osint", "default"],
    sampleSignals,
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
    productionBoundary:
      "API Abuse Shield reduces common endpoint abuse, but production still needs a distributed rate-limit store, Vercel/WAF rules, bot protection and monitoring.",
  });
}
