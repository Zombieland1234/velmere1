import { abuseShieldResponseMeta, applyApiAbuseShield } from "@/lib/security/api-abuse-shield";
import { securityJson } from "@/lib/security/api-guard";
import { verifySecurityAdminToken } from "@/lib/security/security-admin-auth";
import { buildSecurityReleaseGateSnapshot } from "@/lib/security/security-release-gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const shield = await applyApiAbuseShield(request, "security", {
    keyPrefix: "security-release-gate",
    queryParam: "q",
    allowEmptyQuery: true,
  });
  if (!shield.ok) return shield.response;

  const admin = verifySecurityAdminToken(request, ["security:events"]);
  if (!admin.ok) return admin.response;

  return securityJson({
    ok: true,
    ...buildSecurityReleaseGateSnapshot(),
    securityAdminGate: admin.snapshot,
    operator: admin.operator,
    ...abuseShieldResponseMeta(shield),
  });
}
