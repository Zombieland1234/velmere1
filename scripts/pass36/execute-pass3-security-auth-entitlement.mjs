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
    return { name, url, method: options.method || "GET", status: res.status, durationMs, passed, evidenceSnippet: bodyText.slice(0, 160) };
  } catch (err) {
    return { name, url, method: options.method || "GET", status: 0, durationMs: Date.now() - t0, passed: false, error: err.message };
  }
}

async function main() {
  console.log("=== PASS 3: SECURITY, AUTH, RLS & ENTITLEMENT GATES ===");
  fs.mkdirSync("artifacts/security", { recursive: true });

  const probes = [
    {
      name: "IDOR_FORGED_CASE_REF",
      url: `${BASE}/api/account/customer-artifact?caseRef=AUD-FORGED-IDOR-ATTACK`,
      options: { method: "GET" },
      validator: (status, json) => status === 401 && json?.error === "account_session_required"
    },
    {
      name: "PATH_TRAVERSAL_ETC_PASSWD",
      url: `${BASE}/api/account/customer-artifact?caseRef=../../../../../../etc/passwd`,
      options: { method: "GET" },
      validator: (status, json) => (status === 401 || status === 403) && json?.ok === false
    },
    {
      name: "PATH_TRAVERSAL_WIN_SYSTEM32",
      url: `${BASE}/api/account/customer-artifact?caseRef=..\\..\\..\\Windows\\System32\\drivers\\etc\\hosts`,
      options: { method: "GET" },
      validator: (status, json) => (status === 401 || status === 403 || status === 400) && json?.ok === false
    },
    {
      name: "SSRF_CLOUD_METADATA_169_254",
      url: `${BASE}/api/audit/basic/case`,
      options: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: "http://169.254.169.254/latest/meta-data/", chainId: 56 })
      },
      validator: (status) => status === 401 || status === 502 || status === 400 || status === 403
    },
    {
      name: "OVERSIZED_PAYLOAD_BODY_ATTACK",
      url: `${BASE}/api/contact/message`,
      options: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "A".repeat(150_000) })
      },
      validator: (status) => status === 503 || status === 413 || status === 400
    },
    {
      name: "CORS_ORIGIN_FORGERY_UNTRUSTED",
      url: `${BASE}/api/shield/analysis/composite`,
      options: {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "https://blackhat-attacker-site.com" },
        body: JSON.stringify({ symbol: "ETH" })
      },
      validator: (status) => status === 403 || status === 400 || status === 401
    },
    {
      name: "DIRECT_API_ENTITLEMENT_BYPASS_ATTEMPT",
      url: `${BASE}/api/checkout/vlm-service`,
      options: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: "vlm_advanced_audit_human_review",
          tier: "advanced",
          context: { depth: "advanced" }
        })
      },
      validator: (status, json) => (status === 403 || status === 503 || status === 400) && json?.ok === false
    },
    {
      name: "FAKE_COOKIE_INJECTION_REJECTION",
      url: `${BASE}/api/account/customer-artifact`,
      options: {
        method: "GET",
        headers: { Cookie: "sb-access-token=forged.invalid.token; velmere-account=fake_account_admin" }
      },
      validator: (status, json) => status === 401 && json?.ok === false
    }
  ];

  const results = [];
  for (const p of probes) {
    const res = await probe(p.name, p.url, p.options, p.validator);
    console.log(`[${res.passed ? "PASS" : "FAIL"}] ${res.name}: HTTP ${res.status} (${res.durationMs}ms)`);
    results.push(res);
  }

  const allPassed = results.every((r) => r.passed);
  const receipt = {
    schemaVersion: "velmere.pass3.security-auth-entitlement.receipt.v1",
    executedAt: new Date().toISOString(),
    totalProbes: results.length,
    passedCount: results.filter((r) => r.passed).length,
    passed: allPassed,
    probes: results
  };

  const receiptPath = path.resolve("artifacts/security/PASS3_SECURITY_AUTH_ENTITLEMENT_RECEIPT.json");
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2), "utf8");
  console.log(`Saved Pass 3 Security Receipt to: ${receiptPath}`);
  if (!allPassed) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
