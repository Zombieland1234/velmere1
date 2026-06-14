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
const blockedPatterns = [
  /navigation\.(drawer|locales)/i,
  /Home\.(heroImageAlt|productTag)/,
  /\b(Vlm|Wallet|Legal|Token)\.[A-Za-z0-9_.-]+/,
  /\bundefined\b/i,
  /\bNaN\b/,
  /\bUSD\b/,
  />\s*Buy VLM\s*<|15,000 VLM|Phantom connection rejected/i,
  /Riemann constraints|impenetrable|secured by Bajak/i,
  /Audio Wy|Social Media|Paryż|Warszawa|On-chain/i,
];

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

      const visibleBody = body.replaceAll("$undefined", "");
      const blocked = blockedPatterns.find((pattern) => pattern.test(visibleBody));
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
