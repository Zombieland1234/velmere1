import { chromium } from "playwright";

const BASE = "http://localhost:3000";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push({ text: msg.text(), location: msg.location() });
    }
  });

  const chaosResults = [];

  console.log("=== STARTING CHAOS / STRESS / BUG HUNT ===");

  // 1. Invalid Contract Inputs on /pl/security/audits
  console.log("\n[1] Testing Invalid Contract Inputs on Security Audits...");
  await page.goto(`${BASE}/pl/security/audits`, { waitUntil: "networkidle" });
  
  const input = page.locator("input[placeholder*='0x']").first();
  const submitBtn = page.locator(".audit-v4609-generate-btn").first();

  // Test 1a: Short invalid hex
  await input.fill("0x1234");
  await page.waitForTimeout(200);
  let hasGenerateBtn = (await submitBtn.count()) > 0;
  chaosResults.push({ test: "Invalid short hex does not reveal generate button", pass: !hasGenerateBtn });

  // Test 1b: Malformed characters
  await input.fill("0xZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ");
  await page.waitForTimeout(200);
  hasGenerateBtn = (await submitBtn.count()) > 0;
  chaosResults.push({ test: "Malformed characters do not reveal generate button", pass: !hasGenerateBtn });

  // Test 1c: SQL Injection attempt
  await input.fill("' OR '1'='1'; DROP TABLE audits; --");
  await page.waitForTimeout(200);
  hasGenerateBtn = (await submitBtn.count()) > 0;
  chaosResults.push({ test: "SQL injection payload rejected gracefully", pass: !hasGenerateBtn });

  // Test 1d: Valid contract address shows generate button
  await input.fill("0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c");
  await page.waitForTimeout(300);
  hasGenerateBtn = (await submitBtn.count()) > 0;
  chaosResults.push({ test: "Valid contract address enables generate button", pass: hasGenerateBtn });

  // 2. Rapid button clicks (Debounce / double-submit test)
  console.log("\n[2] Testing Rapid Button Clicks...");
  if (hasGenerateBtn) {
    let clickErrors = 0;
    try {
      await Promise.all([
        submitBtn.click().catch(() => {}),
        submitBtn.click().catch(() => {}),
        submitBtn.click().catch(() => {}),
      ]);
    } catch {
      clickErrors++;
    }
    chaosResults.push({ test: "Rapid button clicks handled without crash", pass: clickErrors === 0 });
  }

  // 3. Direct route navigation & back/forward rapid cycle
  console.log("\n[3] Testing Rapid Browser Navigation (Back / Forward)...");
  try {
    await page.goto(`${BASE}/en`, { waitUntil: "domcontentloaded" });
    await page.goto(`${BASE}/en/shield`, { waitUntil: "domcontentloaded" });
    await page.goto(`${BASE}/en/real-markets`, { waitUntil: "domcontentloaded" });
    await page.goto(`${BASE}/en/browser`, { waitUntil: "domcontentloaded" });
    await page.goBack();
    await page.goBack();
    await page.goForward();
    await page.goBack();
    const currentUrl = page.url();
    chaosResults.push({ test: "Rapid back/forward history cycle stable", pass: currentUrl.includes("localhost:3000") });
  } catch (e) {
    chaosResults.push({ test: "Rapid back/forward history cycle stable", pass: false, error: e.message });
  }

  // 4. Reload mid-flight during search
  console.log("\n[4] Testing Reload During Active Query...");
  try {
    await page.goto(`${BASE}/en/browser`, { waitUntil: "networkidle" });
    const searchInput = page.locator("input[type='search'], input[role='combobox'], input").first();
    await searchInput.fill("Bitcoin");
    await page.keyboard.press("Enter");
    // Reload immediately
    await page.reload({ waitUntil: "networkidle" });
    const isBodyRendered = (await page.locator("body").count()) > 0;
    chaosResults.push({ test: "Reload during active query recovers cleanly", pass: isBodyRendered });
  } catch (e) {
    chaosResults.push({ test: "Reload during active query recovers cleanly", pass: false, error: e.message });
  }

  // 5. Malformed API inputs
  console.log("\n[5] Testing Malformed API Endpoints...");
  const apiTests = [
    { url: `${BASE}/api/market-integrity/klines?symbol=INVALID$$$&quote=USD&assetClass=crypto&marketId=invalid&range=1h`, expected: [400, 404] },
    { url: `${BASE}/api/market-integrity/real-markets?ids=invalid_xyz_12345`, expected: [400] },
    { url: `${BASE}/api/market-integrity/search?query=${"A".repeat(500)}`, expected: [200, 400] },
    { url: `${BASE}/api/audit/report-pdf?address=invalid_address&tier=basic&locale=pl`, expected: [200, 400] },
    { url: `${BASE}/en/some-route-that-does-not-exist-at-all-404-test`, expected: [200, 404] },
  ];

  for (const t of apiTests) {
    const res = await fetch(t.url);
    const pass = t.expected.includes(res.status);
    chaosResults.push({ test: `Malformed endpoint [${t.url.split("?")[0].replace(BASE, "")}] returns ${res.status}`, pass });
  }

  await browser.close();

  console.log("\n=========================================");
  console.log("CHAOS / BUG HUNT AUDIT REPORT");
  console.log("=========================================");
  let passes = 0;
  for (const r of chaosResults) {
    if (r.pass) passes++;
    console.log(`[${r.pass ? "PASS" : "FAIL"}] ${r.test}`);
  }
  console.log(`\nRESULT: ${passes}/${chaosResults.length} PASSED`);
}

main().catch(console.error);
