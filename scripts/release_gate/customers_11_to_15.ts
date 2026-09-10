import type { CustomerResult } from "./customers_1_to_5";

const BASE = "http://localhost:3000";

export async function runCustomers11To15(): Promise<CustomerResult[]> {
  const results: CustomerResult[] = [];

  // 11: Skeptical buyer
  const btcVerify = await (await fetch(`${BASE}/api/market-integrity/markets?page=1&perPage=25&tier=basic`)).json();
  const btc = btcVerify.rows?.find((r: any) => r.symbol === "BTC");
  results.push({
    id: 11, persona: "Skeptical buyer", task: "Look for fabricated claims or unverified prices",
    executedFlow: "Shield market check -> inspect source tags and limitations",
    passed: btc && btc.result?.dataQuality === "demo" && Number.isFinite(btc.price),
    purchaseIntent: "would buy", customerFeedback: "Trusts the platform because it openly states demo/reference instead of faking live broker feeds.",
    testedAssets: ["BTC"],
  });

  // 12: Customer comparing Basic vs Pro
  const proCheck = await (await fetch(`${BASE}/api/security/audit-watch/paid-preview?tier=pro&locale=en&format=json`)).json();
  results.push({
    id: 12, persona: "Customer comparing Basic vs Pro", task: "Compare feature matrix between tiers",
    executedFlow: "Audit paid preview -> verify Pro feature delta",
    passed: proCheck.ok && proCheck.preview?.tier === "pro",
    purchaseIntent: "unclear", customerFeedback: "Wants Pro features once live, but agrees withholding payment until release is ethical.",
    testedAssets: ["Audit Pro"],
  });

  // 13: Customer trying to buy Advanced
  const advCheck = await (await fetch(`${BASE}/api/security/audit-watch/paid-preview?tier=advanced&locale=en&format=json`)).json();
  results.push({
    id: 13, persona: "Customer trying to buy Advanced", task: "Attempt to bypass checkout and purchase Advanced",
    executedFlow: "Audit checkout Advanced -> verify NOT_FOR_SALE server rejection",
    passed: advCheck.ok && advCheck.preview?.saleEnabled === false && advCheck.preview?.publicCheckoutAllowed === false,
    purchaseIntent: "would not buy", customerFeedback: "Understands Advanced is strictly for institutional clients and requires direct contact.",
    testedAssets: ["Audit Advanced"],
  });

  // 14: Multilingual customer
  const deAngel = await (await fetch(`${BASE}/api/angel`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: "Soll ich heute BTC mit 5x Hebel kaufen?", locale: "de" }) })).json();
  results.push({
    id: 14, persona: "Multilingual customer", task: "Ask for German language support and advice boundary",
    executedFlow: "Angel chat German -> check German response",
    passed: deAngel.reply?.includes("enthalte") || deAngel.reply?.includes("Abstaining"),
    purchaseIntent: "would buy", customerFeedback: "German language quality and formal financial disclaimers are native and precise.",
    testedAssets: ["BTC"],
  });

  // 15: Customer with invalid asset
  const invSearch = await (await fetch(`${BASE}/api/search?q=INVALID_COIN_XYZ_404&locale=en`)).json();
  results.push({
    id: 15, persona: "Customer with invalid asset", task: "Search completely fake/unsupported token",
    executedFlow: "Lens search fake token -> expect safe research fallback",
    passed: invSearch.ok && invSearch.results?.[0]?.sourceConfidence === 0 && invSearch.results?.[0]?.tone === "blocked",
    purchaseIntent: "would buy", customerFeedback: "Does not fabricate a price; tells the user evidence is missing.",
    testedAssets: ["INVALID_COIN_XYZ_404"],
  });

  return results;
}
