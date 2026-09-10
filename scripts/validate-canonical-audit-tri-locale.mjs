import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const outDir = path.resolve(process.cwd(), "preview_screenshots", "tri_locale");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function run() {
  console.log("Launching Playwright for Tri-Locale Canonical Audit Report validation...");
  const browser = await chromium.launch({ headless: true }).catch(() => chromium.launch({ channel: "msedge", headless: true }));
  const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  const page = await context.newPage();

  const baseUrl = "http://localhost:3000";
  const address = "0x1111222233334444555566667777888899990000";

  // --- 1. POLISH VALIDATION ---
  console.log("\n[1/3] Validating Polish (PL) Canonical Audit Report...");
  await page.goto(`${baseUrl}/pl/security/audits/report/rep_canonical_pl?address=${address}&tier=basic`, { waitUntil: "networkidle" });
  await page.waitForSelector(".audit-canonical-view", { timeout: 10000 });

  const textPl = await page.textContent("body");
  assert.ok(textPl.includes("NISKIE RYZYKO"), "PL: Verdict risk label must be 'NISKIE RYZYKO'");
  assert.ok(textPl.includes("Przegląd audytu i kontekst kontraktu"), "PL: Section title must be localized");
  assert.ok(textPl.includes("Odblokuj w pakiecie Pro") || textPl.includes("ODBLOKUJ W PAKIECIE PRO"), "PL: Locked section notice must be localized");
  assert.ok(textPl.includes("Poufność i zastrzeżenie prawne") || textPl.includes("POUFNOŚĆ I ZASTRZEŻENIE"), "PL: Footer disclaimer must be localized");

  const plScreenshotPath = path.join(outDir, "canonical_audit_report_pl.png");
  await page.screenshot({ path: plScreenshotPath, fullPage: true });
  console.log(`✓ Polish canonical report verified. Screenshot saved: ${plScreenshotPath}`);

  // --- 2. GERMAN VALIDATION ---
  console.log("\n[2/3] Validating German (DE) Canonical Audit Report...");
  await page.goto(`${baseUrl}/de/security/audits/report/rep_canonical_de?address=${address}&tier=basic`, { waitUntil: "networkidle" });
  await page.waitForSelector(".audit-canonical-view", { timeout: 10000 });

  const textDe = await page.textContent("body");
  assert.ok(textDe.includes("GERINGES RISIKO"), "DE: Verdict risk label must be 'GERINGES RISIKO'");
  assert.ok(textDe.includes("Audit-Übersicht & Vertragskontext"), "DE: Section title must be localized");
  assert.ok(textDe.includes("Freischalten mit Pro Audit") || textDe.includes("FREISCHALTEN MIT PRO"), "DE: Locked section notice must be localized");
  assert.ok(textDe.includes("Vertraulichkeit & rechtlicher Hinweis") || textDe.includes("VERTRAULICHKEIT"), "DE: Footer disclaimer must be localized");

  const deScreenshotPath = path.join(outDir, "canonical_audit_report_de.png");
  await page.screenshot({ path: deScreenshotPath, fullPage: true });
  console.log(`✓ German canonical report verified. Screenshot saved: ${deScreenshotPath}`);

  // --- 3. ENGLISH VALIDATION ---
  console.log("\n[3/3] Validating English (EN) Canonical Audit Report...");
  await page.goto(`${baseUrl}/en/security/audits/report/rep_canonical_en?address=${address}&tier=basic`, { waitUntil: "networkidle" });
  await page.waitForSelector(".audit-canonical-view", { timeout: 10000 });

  const textEn = await page.textContent("body");
  assert.ok(textEn.includes("LOW RISK"), "EN: Verdict risk label must be 'LOW RISK'");
  assert.ok(textEn.includes("Audit Overview & Contract Context"), "EN: Section title must be localized");
  assert.ok(textEn.includes("Unlock with Pro Audit") || textEn.includes("UNLOCK WITH PRO"), "EN: Locked section notice must be localized");
  assert.ok(textEn.includes("Confidentiality & Legal Notice") || textEn.includes("CONFIDENTIALITY"), "EN: Footer disclaimer must be localized");

  const enScreenshotPath = path.join(outDir, "canonical_audit_report_en.png");
  await page.screenshot({ path: enScreenshotPath, fullPage: true });
  console.log(`✓ English canonical report verified. Screenshot saved: ${enScreenshotPath}`);

  // --- 4. TIER UNLOCK VERIFICATION (PRO & ADVANCED) ---
  console.log("\n[4/4] Validating Pro and Advanced tier view states...");
  // Pro tier view
  await page.goto(`${baseUrl}/en/security/audits/report/rep_canonical_pro?address=${address}&tier=pro`, { waitUntil: "networkidle" });
  await page.waitForSelector(".audit-canonical-view", { timeout: 10000 });
  const textPro = await page.textContent("body");
  assert.ok(textPro.includes("CANONICAL AUDIT REPORT · TIER PRO"));
  assert.ok(textPro.includes("DEFAULT_ADMIN_ROLE"), "Pro tier must display unlocked permission details");
  assert.ok(textPro.includes("Unlock with Advanced Audit"), "Advanced sections remain locked in Pro");

  const proScreenshotPath = path.join(outDir, "canonical_audit_report_tier_pro.png");
  await page.screenshot({ path: proScreenshotPath, fullPage: true });
  console.log(`✓ Pro tier report verified. Screenshot saved: ${proScreenshotPath}`);

  // Advanced tier view
  await page.goto(`${baseUrl}/en/security/audits/report/rep_canonical_adv?address=${address}&tier=advanced`, { waitUntil: "networkidle" });
  await page.waitForSelector(".audit-canonical-view", { timeout: 10000 });
  const textAdv = await page.textContent("body");
  assert.ok(textAdv.includes("CANONICAL AUDIT REPORT · TIER ADVANCED"));
  assert.ok(textAdv.includes("Human reviewer attestation is currently pending"), "Advanced displays pending human review without false claims");
  assert.equal(textAdv.includes("Unlock with"), false, "Advanced tier has zero locked sections");

  const advScreenshotPath = path.join(outDir, "canonical_audit_report_tier_advanced.png");
  await page.screenshot({ path: advScreenshotPath, fullPage: true });
  console.log(`✓ Advanced tier report verified. Screenshot saved: ${advScreenshotPath}`);

  await browser.close();
  console.log("\nALL TIERS AND LOCALES SUCCESSFULLY VALIDATED WITH PLAYWRIGHT!");
}

run().catch((err) => {
  console.error("Playwright validation failed:", err);
  process.exit(1);
});
