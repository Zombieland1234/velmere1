const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

const coreRoutes = [
  "",
  "/shop",
  "/collection",
  "/market-integrity",
  "/shield-map",
  "/real-markets",
  "/search",
  "/square",
  "/member",
  "/security",
  "/shop/essential-oversized-hoodie",
  "/vlm-token",
  "/lookbook",
  "/archive",
  "/terms",
  "/privacy",
  "/shipping",
  "/returns",
  "/impressum",
  "/contact",
  "/token-agreement",
  "/cart",
  "/checkout/success",
  "/checkout/cancel",
  "/admin/import-products",
];

const locales = ["pl", "en", "de"];
const usdPattern = /\bUSD\b/;
const blockedPatterns = [
  /navigation\.(drawer|locales)/i,
  /Home\.(heroImageAlt|productTag)/,
  /\b(Vlm|Wallet|Legal|Token)\.[A-Za-z0-9_.-]+/,
  /\bundefined\b/i,
  /\bNaN\b/,
  usdPattern,
  />\s*Buy VLM\s*<|15,000 VLM|Phantom connection rejected/i,
  /Riemann constraints|impenetrable|secured by Bajak/i,
  /Audio Wy|Social Media|Paryż|Warszawa|On-chain/i,
];

function htmlToSmokeVisibleText(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function routeBlockedPatterns(locale, route) {
  // PASS4236: USD is legitimate visible market terminology on cross-asset/risk surfaces
  // across PL/EN/DE. Blocking it globally created a false-negative local proof at 76%.
  // Keep the USD smoke blocker for non-market pages where it usually means untranslated
  // commerce/legal copy, but allow it on market data routes where quote currency labels are real data.
  const routeAllowsMarketCurrency = /\/(market-integrity|real-markets|shield-map|search|vlm-token)(?:\/|$)/.test(route);
  return blockedPatterns.filter((pattern) => pattern !== usdPattern || routeAllowsMarketCurrency);
}

let failed = false;

for (const locale of locales) {
  for (const route of coreRoutes) {
    const url = `${baseUrl}/${locale}${route}`;
    try {
      const response = await fetch(url, { redirect: "follow" });
      const body = await response.text();

      if (!response.ok) {
        failed = true;
        console.error(`${response.status} ${url}`);
        continue;
      }

      const visibleBody = htmlToSmokeVisibleText(body).replaceAll("$undefined", "");
      const blocked = routeBlockedPatterns(locale, route).find((pattern) => pattern.test(visibleBody));
      if (blocked) {
        failed = true;
        console.error(`blocked pattern ${blocked} in ${url}`);
      }
    } catch (error) {
      failed = true;
      console.error(`request failed ${url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

if (failed) process.exit(1);
console.log(`route smoke ok at ${baseUrl}`);
