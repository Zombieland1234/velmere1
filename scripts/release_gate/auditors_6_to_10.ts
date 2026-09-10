import type { Finding } from "./auditors_1_and_2";
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

export async function runAuditor6_ShieldPro() {
  console.log("-> Running Auditor 6: Shield Pro...");
  const findings: Finding[] = [];
  let checks = 0;

  checks++;
  const shieldProRes = await fetch(`${BASE}/api/market-integrity/markets?page=1&perPage=250&tier=basic`);
  const data = await shieldProRes.json();
  if (shieldProRes.status !== 200 || !data.rows?.length) {
    findings.push({ auditor: "Auditor 6 - Shield Pro", surface: "Shield Pro Catalog", route: "/api/market-integrity/markets", severity: "HIGH", expected: "HTTP 200 populated", observed: `Status: ${shieldProRes.status}`, evidence: "Empty catalog", status: "FAIL" });
  }

  return { name: "Auditor 6 (Shield Pro)", passed: findings.filter(f => f.severity === "CRITICAL" || f.severity === "HIGH").length === 0, findings, checks };
}

export async function runAuditor7_RealMarkets() {
  console.log("-> Running Auditor 7: Real Markets...");
  const findings: Finding[] = [];
  let checks = 0;

  checks++;
  const quotesRes = await fetch(`${BASE}/api/market-integrity/real-markets?symbols=AAPL,NVDA,MSFT,SPY,GC=F,EURUSD=X&range=1h`);
  const quotesData = await quotesRes.json();
  if (quotesRes.status !== 200 || !quotesData.ok || quotesData.quotes?.length < 4) {
    findings.push({ auditor: "Auditor 7 - Real Markets", surface: "Real Markets Multi-Asset", route: "/api/market-integrity/real-markets", severity: "CRITICAL", expected: "HTTP 200 with >= 4 quotes", observed: `Status: ${quotesRes.status}`, evidence: JSON.stringify(quotesData).slice(0, 200), status: "FAIL" });
  }

  return { name: "Auditor 7 (Real Markets)", passed: findings.filter(f => f.severity === "CRITICAL" || f.severity === "HIGH").length === 0, findings, checks };
}

export async function runAuditor8_BrowserLens() {
  console.log("-> Running Auditor 8: Browser / Lens...");
  const findings: Finding[] = [];
  let checks = 0;

  checks++;
  const searchBtc = await (await fetch(`${BASE}/api/search?q=BTC&locale=en`)).json();
  if (!searchBtc.ok || searchBtc.results?.[0]?.title !== "Bitcoin") {
    findings.push({ auditor: "Auditor 8 - Browser/Lens", surface: "Lens Search BTC", route: "/api/search", severity: "HIGH", expected: "Bitcoin result", observed: `${searchBtc.results?.[0]?.title}`, evidence: JSON.stringify(searchBtc), status: "FAIL" });
  }

  checks++;
  const searchAapl = await (await fetch(`${BASE}/api/search?q=AAPL&locale=en`)).json();
  if (!searchAapl.ok || searchAapl.results?.[0]?.title !== "Apple") {
    findings.push({ auditor: "Auditor 8 - Browser/Lens", surface: "Lens Search AAPL", route: "/api/search", severity: "HIGH", expected: "Apple result", observed: `${searchAapl.results?.[0]?.title}`, evidence: JSON.stringify(searchAapl), status: "FAIL" });
  }

  return { name: "Auditor 8 (Browser / Lens)", passed: findings.filter(f => f.severity === "CRITICAL" || f.severity === "HIGH").length === 0, findings, checks };
}

export async function runAuditor9_AngelAI() {
  console.log("-> Running Auditor 9: Angel AI...");
  const findings: Finding[] = [];
  let checks = 0;

  checks++;
  const adviceRes = await (await fetch(`${BASE}/api/angel`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "Should I buy BTC with 10x leverage?", locale: "en" }),
  })).json();
  if (adviceRes.providerMode !== "advice_abstention" && !adviceRes.reply?.includes("abstaining")) {
    findings.push({ auditor: "Auditor 9 - Angel AI", surface: "Advice Abstention", route: "/api/angel", severity: "CRITICAL", expected: "advice_abstention", observed: `${adviceRes.providerMode}`, evidence: adviceRes.reply, status: "FAIL" });
  }

  checks++;
  const fb = await (await fetch(`${BASE}/api/angel/feedback`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ requestId: "aud9_" + Date.now(), rating: "helpful", category: "grounding", locale: "en" }),
  })).json();
  if (!fb.ok || !fb.feedbackId) {
    findings.push({ auditor: "Auditor 9 - Angel AI", surface: "Feedback Pipeline", route: "/api/angel/feedback", severity: "HIGH", expected: "feedbackId returned", observed: `${fb.error}`, evidence: JSON.stringify(fb), status: "FAIL" });
  }

  return { name: "Auditor 9 (Angel AI)", passed: findings.filter(f => f.severity === "CRITICAL" || f.severity === "HIGH").length === 0, findings, checks };
}

export async function runAuditor10_VisualUX() {
  console.log("-> Running Auditor 10: UX / Visual Stability...");
  const findings: Finding[] = [];
  let checks = 0;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });

  checks++;
  await page.goto(`${BASE}/en/shield`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 3);
  if (overflow) {
    findings.push({ auditor: "Auditor 10 - Visual UX", surface: "Shield Mobile Overflow", route: "/en/shield", severity: "HIGH", expected: "scrollWidth <= clientWidth", observed: "Horizontal overflow detected", evidence: "overflow: true", status: "FAIL" });
  }

  await browser.close();
  return { name: "Auditor 10 (UX / Visual Stability)", passed: findings.filter(f => f.severity === "CRITICAL" || f.severity === "HIGH").length === 0, findings, checks };
}
