import fs from "fs";
import path from "path";

const BASE = "http://localhost:3000";

async function probe(name, url, options, validator) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, options);
    const durationMs = Date.now() - t0;
    const bodyText = await res.text().catch(() => "");
    let bodyJson = null;
    try { bodyJson = JSON.parse(bodyText); } catch {}
    const passed = validator(res.status, bodyJson, bodyText);
    return { name, url, method: options.method || "GET", status: res.status, durationMs, passed, sample: bodyText.slice(0, 160) };
  } catch (err) {
    return { name, url, method: options.method || "GET", status: 0, durationMs: Date.now() - t0, passed: false, error: err.message };
  }
}

async function main() {
  console.log("=== PASS 5: PAYMENTS, COMMERCE & CUSTOMER ARTIFACTS ===");
  fs.mkdirSync("artifacts/payments", { recursive: true });

  const tests = [
    {
      name: "STOP_SELL_PRO_AUDIT_PURCHASE_BLOCKED",
      url: `${BASE}/api/checkout/vlm-service`,
      options: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: "vlm_pro_audit_review",
          tier: "pro",
          locale: "en"
        })
      },
      validator: (status, json) => status === 403 && json?.ok === false
    },
    {
      name: "STOP_SELL_ADVANCED_AUDIT_PURCHASE_BLOCKED",
      url: `${BASE}/api/checkout/vlm-service`,
      options: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: "vlm_advanced_audit_human_review",
          tier: "advanced",
          locale: "en"
        })
      },
      validator: (status, json) => status === 403 && json?.ok === false
    },
    {
      name: "UNAUTHENTICATED_ARTIFACT_DOWNLOAD_BLOCKED",
      url: `${BASE}/api/account/customer-artifact?caseRef=AUD-DEMO-9999&format=pdf`,
      options: { method: "GET" },
      validator: (status, json) => status === 401 && json?.error === "account_session_required"
    },
    {
      name: "PREVIEW_ONLY_TIER_PAYLOAD_CONFIRMED",
      url: `${BASE}/api/security/audit-watch/paid-preview?tier=pro&locale=en&format=json`,
      options: { method: "GET" },
      validator: (status, json) => status === 200 && json?.ok === true && json?.preview?.previewOnly === true && json?.preview?.fullContentIncluded === false
    }
  ];

  const results = [];
  for (const t of tests) {
    const res = await probe(t.name, t.url, t.options, t.validator);
    console.log(`[${res.passed ? "PASS" : "FAIL"}] ${t.name}: HTTP ${res.status} (${res.durationMs}ms)`);
    results.push(res);
  }

  const allPassed = results.every((r) => r.passed);
  const receipt = {
    schemaVersion: "velmere.pass5.payments-commerce-artifacts.receipt.v1",
    executedAt: new Date().toISOString(),
    totalChecks: results.length,
    passedCount: results.filter((r) => r.passed).length,
    passed: allPassed,
    checks: results
  };

  const receiptPath = path.resolve("artifacts/payments/PASS5_PAYMENTS_COMMERCE_ARTIFACTS_RECEIPT.json");
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2), "utf8");
  console.log(`Saved Pass 5 Payments Receipt to: ${receiptPath}`);
  if (!allPassed) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
