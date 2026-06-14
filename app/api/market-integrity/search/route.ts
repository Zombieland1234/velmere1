import { fetchCoinGeckoSuggestions } from "@/lib/market-integrity/coingecko";
import { abuseShieldResponseMeta, applyApiAbuseShield } from "@/lib/security/api-abuse-shield";
import { securityJson } from "@/lib/security/api-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const shield = await applyApiAbuseShield(request, "search", { keyPrefix: "market-search", queryParam: "query", allowEmptyQuery: true });
  if (!shield.ok) return shield.response;

  const query = shield.query ?? "";
  if (query.length < 2) {
    return securityJson({
      mode: "live",
      suggestions: [],
      generatedAt: new Date().toISOString(),
      security: "api-abuse-shield-local-first-short-query",
      ...abuseShieldResponseMeta(shield),
    });
  }

  try {
    const suggestions = await fetchCoinGeckoSuggestions(query);
    return securityJson({
      mode: "live",
      suggestions: suggestions.slice(0, 8),
      generatedAt: new Date().toISOString(),
      ...abuseShieldResponseMeta(shield),
    });
  } catch (error) {
    return securityJson({ mode: "error", error: error instanceof Error ? error.message : "Search failed" }, { status: 502 });
  }
}
