import { abuseShieldResponseMeta, applyApiAbuseShield } from "@/lib/security/api-abuse-shield";
import { sanitizeBoundedParam, securityJson } from "@/lib/security/api-guard";
import { buildSecurityTrustSnapshot } from "@/lib/security/security-trust-copy";
import { buildSecurityReadinessSnapshot } from "@/lib/security/security-readiness";
import { buildDurableRateLimitReadiness } from "@/lib/security/durable-rate-limit";
import { buildSecurityEventAppendReadiness } from "@/lib/security/security-event-append-adapter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const shield = await applyApiAbuseShield(request, "security", {
    keyPrefix: "security-trust",
    queryParam: "locale",
    allowEmptyQuery: true,
  });
  if (!shield.ok) return shield.response;

  const url = new URL(request.url);
  const locale = sanitizeBoundedParam(url.searchParams.get("locale"), { maxLength: 8, fallback: "en" });

  return securityJson({
    ok: true,
    ...buildSecurityTrustSnapshot(locale),
    readiness: buildSecurityReadinessSnapshot(),
    durableRateLimit: buildDurableRateLimitReadiness(),
    eventAppendAdapter: buildSecurityEventAppendReadiness(),
    ...abuseShieldResponseMeta(shield),
  });
}
