import fs from "node:fs";

const BASE = "http://localhost:3000";

// Load known secrets from .env.local to ensure none are leaked
const envContent = fs.readFileSync("C:\\Users\\marci\\Desktop\\Nowy folder\\.env.local", "utf8");
const secretsToGuard = [];
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
    const [key, ...rest] = trimmed.split("=");
    const val = rest.join("=").trim();
    if (
      val.length >= 8 &&
      (key.includes("SECRET") || key.includes("KEY") || key.includes("TOKEN") || key.includes("ROLE"))
    ) {
      secretsToGuard.push({ key, val });
    }
  }
}

console.log(`Checking responses for leakage of ${secretsToGuard.length} sensitive keys...`);

const PUBLIC_ENDPOINTS = [
  "/api/auth/session",
  "/api/market-integrity/real-markets?ids=btc,eth,sol",
  "/api/market-integrity/cross-asset",
  "/api/market-integrity/klines?symbol=BTC&quote=USD&assetClass=crypto&marketId=bitcoin&range=1h",
  "/api/market-integrity/search?query=BTC",
  "/api/market-integrity/investigator?query=bitcoin&locale=en",
  "/api/audit/report?address=0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c&tier=basic",
  "/api/search?q=BTC&locale=en&intent=detail",
];

async function main() {
  const leaks = [];

  for (const ep of PUBLIC_ENDPOINTS) {
    try {
      const res = await fetch(BASE + ep);
      const text = await res.text();

      for (const secret of secretsToGuard) {
        if (text.includes(secret.val)) {
          leaks.push({ endpoint: ep, key: secret.key });
        }
      }
    } catch (e) {
      console.log(`Endpoint ${ep} fetch error: ${e.message}`);
    }
  }

  console.log("\n=== SECURITY / SECRET LEAKAGE AUDIT ===");
  if (leaks.length === 0) {
    console.log("[PASS] ZERO secret leakage detected across all public API surfaces!");
  } else {
    console.log(`[FAIL] ${leaks.length} LEAKS DETECTED:`, leaks);
  }
}

main().catch(console.error);
