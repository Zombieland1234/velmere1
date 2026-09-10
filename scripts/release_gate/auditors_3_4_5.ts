import type { Finding } from "./auditors_1_and_2";

const BASE = "http://localhost:3000";

export async function runAuditor3_RiskEngine() {
  console.log("-> Running Auditor 3: Risk Engine...");
  const findings: Finding[] = [];
  let checks = 0;

  checks++;
  const markets = await (await fetch(`${BASE}/api/market-integrity/markets?page=1&perPage=250&tier=basic`)).json();
  const rows = markets.rows || [];
  for (const row of rows) {
    if (typeof row.price !== "number" || !Number.isFinite(row.price) || row.price <= 0) {
      findings.push({ auditor: "Auditor 3 - Risk Engine", surface: "Market Row Sanity", route: "/api/market-integrity/markets", severity: "HIGH", expected: `Finite price > 0 for ${row.symbol}`, observed: `Price: ${row.price}`, evidence: JSON.stringify(row).slice(0, 200), status: "FAIL" });
      break;
    }
  }

  checks++;
  const btcRow = rows.find((r: any) => r.symbol === "BTC");
  if (!btcRow || !Array.isArray(btcRow.sparkline7d) || btcRow.sparkline7d.length < 10) {
    findings.push({ auditor: "Auditor 3 - Risk Engine", surface: "BTC Sparkline Series", route: "/api/market-integrity/markets", severity: "MEDIUM", expected: "Array of sparkline points >= 10", observed: `Points: ${btcRow?.sparkline7d?.length}`, evidence: JSON.stringify(btcRow?.sparkline7d), status: "FAIL" });
  }

  return { name: "Auditor 3 (Risk Engine)", passed: findings.filter(f => f.severity === "CRITICAL" || f.severity === "HIGH").length === 0, findings, checks };
}

export async function runAuditor4_AuditProduct() {
  console.log("-> Running Auditor 4: Audit Product...");
  const findings: Finding[] = [];
  let checks = 0;

  checks++;
  const proPreview = await (await fetch(`${BASE}/api/security/audit-watch/paid-preview?tier=pro&locale=en&format=json`)).json();
  if (!proPreview.ok || proPreview.preview?.publicCheckoutAllowed !== false || proPreview.preview?.saleEnabled !== false) {
    findings.push({ auditor: "Auditor 4 - Audit Product", surface: "Pro Audit Controlled Beta Gate", route: "/api/security/audit-watch/paid-preview", severity: "CRITICAL", expected: "publicCheckoutAllowed: false, saleEnabled: false", observed: JSON.stringify(proPreview.preview), evidence: JSON.stringify(proPreview), status: "FAIL" });
  }

  checks++;
  const advPreview = await (await fetch(`${BASE}/api/security/audit-watch/paid-preview?tier=advanced&locale=en&format=json`)).json();
  if (!advPreview.ok || advPreview.preview?.saleEnabled !== false) {
    findings.push({ auditor: "Auditor 4 - Audit Product", surface: "Advanced Audit NOT_FOR_SALE Gate", route: "/api/security/audit-watch/paid-preview", severity: "CRITICAL", expected: "saleEnabled: false", observed: JSON.stringify(advPreview.preview), evidence: JSON.stringify(advPreview), status: "FAIL" });
  }

  return { name: "Auditor 4 (Audit Product)", passed: findings.filter(f => f.severity === "CRITICAL" || f.severity === "HIGH").length === 0, findings, checks };
}

export async function runAuditor5_Shield() {
  console.log("-> Running Auditor 5: Shield...");
  const findings: Finding[] = [];
  let checks = 0;

  checks++;
  const klineRes = await fetch(`${BASE}/api/market-integrity/klines?symbol=BTC&assetClass=crypto&marketId=bitcoin&quote=USD&range=1d`);
  const klineData = await klineRes.json();
  if (klineRes.status !== 200 || !klineData.ok || !Array.isArray(klineData.candles) || klineData.candles.length === 0) {
    findings.push({ auditor: "Auditor 5 - Shield", surface: "Kline Series API", route: "/api/market-integrity/klines", severity: "HIGH", expected: "HTTP 200 with candles array > 0", observed: `Status: ${klineRes.status}, Candles: ${klineData.candles?.length}`, evidence: JSON.stringify(klineData).slice(0, 300), status: "FAIL" });
  }

  return { name: "Auditor 5 (Shield)", passed: findings.filter(f => f.severity === "CRITICAL" || f.severity === "HIGH").length === 0, findings, checks };
}
