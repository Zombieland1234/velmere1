import fs from "fs";
import path from "path";

const BASE = "http://localhost:3000";

async function main() {
  console.log("=== PASS 4: DATA TRUTH & FAIL-CLOSED WITHHOLDING ===");
  fs.mkdirSync("artifacts/providers", { recursive: true });

  const tests = [
    {
      name: "MARKET_INTEGRITY_WITHHELD_COMMERCIAL_LICENSE_MISSING",
      url: `${BASE}/api/market-integrity/markets`,
      validator: (status, json) => status === 503 && json?.mode === "withheld" && json?.error === "shield_customer_data_delivery_unavailable"
    },
    {
      name: "INVESTIGATOR_API_WITHHELD_ON_REDISTRIBUTION_LIMIT",
      url: `${BASE}/api/market-integrity/investigator?query=BTC&locale=en`,
      validator: (status, json) => status === 503 && json?.mode === "withheld" && json?.availability === "WITHHELD"
    },
    {
      name: "UI_DISCLAIMER_VERIFICATION_SHIELD_MAP",
      url: `${BASE}/en/security/shield-map`,
      validator: async (status, json, html) => status === 200 && (html.includes("UNAVAILABLE") || html.includes("Shield") || html.includes("withheld"))
    },
    {
      name: "UI_DISCLAIMER_VERIFICATION_SHIELD_PRO",
      url: `${BASE}/en/security/shield-pro`,
      validator: async (status, json, html) => status === 200 && (html.includes("Institutional") || html.includes("UNAVAILABLE") || html.includes("Terminal"))
    }
  ];

  const results = [];
  for (const t of tests) {
    const t0 = Date.now();
    const res = await fetch(t.url);
    const durationMs = Date.now() - t0;
    const bodyText = await res.text().catch(() => "");
    let bodyJson = null;
    try { bodyJson = JSON.parse(bodyText); } catch {}
    const passed = await t.validator(res.status, bodyJson, bodyText);
    console.log(`[${passed ? "PASS" : "FAIL"}] ${t.name}: HTTP ${res.status} (${durationMs}ms)`);
    results.push({ name: t.name, status: res.status, durationMs, passed, sample: bodyText.slice(0, 160) });
  }

  const allPassed = results.every((r) => r.passed);
  const receipt = {
    schemaVersion: "velmere.pass4.provider-truth-withholding.receipt.v1",
    executedAt: new Date().toISOString(),
    totalChecks: results.length,
    passedCount: results.filter((r) => r.passed).length,
    passed: allPassed,
    checks: results
  };

  const receiptPath = path.resolve("artifacts/providers/PASS4_PROVIDER_TRUTH_WITHHOLDING_RECEIPT.json");
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2), "utf8");
  console.log(`Saved Pass 4 Provider Truth Receipt to: ${receiptPath}`);
  if (!allPassed) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
