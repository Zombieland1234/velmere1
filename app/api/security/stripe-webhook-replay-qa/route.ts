import { abuseShieldResponseMeta, applyApiAbuseShield } from "@/lib/security/api-abuse-shield";
import { securityJson } from "@/lib/security/api-guard";
import { verifySecurityAdminToken } from "@/lib/security/security-admin-auth";
import { buildStripeWebhookReplayQaSnapshot, recordStripeWebhookReplayEvidence } from "@/lib/security/stripe-webhook-replay-qa";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function payloadTooLarge(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  return Number.isFinite(length) && length > 12_000;
}

export async function GET(request: Request) {
  const shield = await applyApiAbuseShield(request, "security", {
    keyPrefix: "stripe-webhook-replay-qa",
    queryParam: "q",
    allowEmptyQuery: true,
  });
  if (!shield.ok) return shield.response;

  const admin = verifySecurityAdminToken(request, ["security:events"]);
  if (!admin.ok) return admin.response;

  return securityJson({
    ok: true,
    ...buildStripeWebhookReplayQaSnapshot(),
    securityAdminGate: admin.snapshot,
    operator: admin.operator,
    ...abuseShieldResponseMeta(shield),
  });
}

export async function POST(request: Request) {
  const shield = await applyApiAbuseShield(request, "security", {
    keyPrefix: "stripe-webhook-replay-qa-write",
    queryParam: "q",
    allowEmptyQuery: true,
  });
  if (!shield.ok) return shield.response;

  const admin = verifySecurityAdminToken(request, ["security:events"]);
  if (!admin.ok) return admin.response;

  if (payloadTooLarge(request)) {
    return securityJson({ ok: false, mode: "stripe_webhook_replay_payload_too_large" }, { status: 413 });
  }

  const payload = await request.json().catch(() => ({}));
  const record = recordStripeWebhookReplayEvidence({
    ...(payload && typeof payload === "object" ? payload : {}),
    operator: admin.operator.id,
  });

  return securityJson({
    ok: true,
    record,
    snapshot: buildStripeWebhookReplayQaSnapshot(),
    securityAdminGate: admin.snapshot,
    operator: admin.operator,
    ...abuseShieldResponseMeta(shield),
  });
}
