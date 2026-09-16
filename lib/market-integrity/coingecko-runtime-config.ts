/** Select the official host and exactly one matching credential header.
 * This selects technical access only; it does not grant commercial data rights.
 */
export function resolveCoinGeckoRequestConfig(env: Record<string, string | undefined>) {
  const pro = env.COINGECKO_PRO_API_KEY?.trim();
  const demo = env.COINGECKO_DEMO_API_KEY?.trim();
  const headers: Record<string, string> = {
    accept: "application/json",
    "user-agent": "Velmere-Market-Integrity/1.0",
  };
  if (pro) headers["x-cg-pro-api-key"] = pro;
  else if (demo) headers["x-cg-demo-api-key"] = demo;
  return {
    baseUrl: pro ? "https://pro-api.coingecko.com/api/v3" : "https://api.coingecko.com/api/v3",
    headers,
  };
}
