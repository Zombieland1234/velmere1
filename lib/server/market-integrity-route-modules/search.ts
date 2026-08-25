import { publicApiError } from "@/lib/security/api-error-envelope";
import { fetchCoinGeckoSuggestions } from "@/lib/market-integrity/coingecko";
import { abuseShieldResponseMeta, applyApiAbuseShield } from "@/lib/security/api-abuse-shield";
import { securityJson } from "@/lib/security/api-guard";
import {
  buildShieldBasicDeliveryPreflight,
  projectShieldBasicCustomerDelivery,
  toShieldBasicCustomerSafeWithheld,
} from "@/lib/market-integrity/shield-basic-delivery-policy";

export async function GET(request: Request) {
  const shield = await applyApiAbuseShield(request, "search", { keyPrefix: "market-search", queryParam: "query", allowEmptyQuery: true });
  if (!shield.ok) return shield.response;

  const rightsPreflight = buildShieldBasicDeliveryPreflight("search");
  if (!rightsPreflight.customerDeliveryAllowed || !rightsPreflight.providerNetworkAllowed) {
    return securityJson(toShieldBasicCustomerSafeWithheld("search"), { status: 503 });
  }

  const customerJson = (payload: unknown, status = 200) => {
    const projected = projectShieldBasicCustomerDelivery({ decision: rightsPreflight, payload, status });
    return securityJson(projected.payload, { status: projected.status });
  };

  const query = shield.query ?? "";
  if (query.length < 2) {
    return customerJson({
      mode: "available",
      publication: { scope: "identity_lookup", liveMarketClaimed: false },
      suggestions: [],
      generatedAt: new Date().toISOString(),
      security: "api-abuse-shield-local-first-short-query",
      ...abuseShieldResponseMeta(shield),
    });
  }

  try {
    const suggestions = await fetchCoinGeckoSuggestions(query);
    return customerJson({
      mode: "available",
      publication: { scope: "identity_lookup", liveMarketClaimed: false },
      suggestions: suggestions.slice(0, 8),
      generatedAt: new Date().toISOString(),
      ...abuseShieldResponseMeta(shield),
    });
  } catch (error) {
    return publicApiError(error, { route: "/api/market-integrity/search", code: "search_failed", status: 502 });
  }
}
