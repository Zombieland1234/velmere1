import { abuseShieldResponseMeta, applyApiAbuseShield } from "@/lib/security/api-abuse-shield";
import { verifySecurityAdminToken } from "@/lib/security/security-admin-auth";
import { securityJson } from "@/lib/security/api-guard";
import { buildSecurityAlertSnapshot } from "@/lib/security/security-alert-rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const shield = await applyApiAbuseShield(request, "security", {
    keyPrefix: "security-alerts",
    queryParam: "q",
    allowEmptyQuery: true,
  });
  if (!shield.ok) return shield.response;

  const admin = verifySecurityAdminToken(request, ["security:alerts"]);
  if (!admin.ok) return admin.response;

  return securityJson({
    ok: true,
    ...buildSecurityAlertSnapshot(),
    securityAdminGate: admin.snapshot,
    operator: admin.operator,
    ...abuseShieldResponseMeta(shield),
  });
}
