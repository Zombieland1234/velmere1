import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  page.on("console", msg => console.log("[CONSOLE]:", msg.type(), msg.text()));
  page.on("pageerror", err => console.log("[PAGE ERR]:", err.message));

  await page.goto("http://localhost:3000/en/shield", { waitUntil: "domcontentloaded" });
  
  const cookieBtn = page.locator('button:has-text("Necessary only"), button:has-text("Allow all")').first();
  if (await cookieBtn.isVisible()) await cookieBtn.click();

  // Evaluate fetch in page context
  const res = await page.evaluate(async () => {
    try {
      const r = await fetch("/api/market-integrity/markets?page=1&perPage=250&tier=basic");
      const d = await r.json();
      return { status: r.status, ok: d.ok, mode: d.mode, rowsCount: d.rows?.length };
    } catch (e) {
      return { error: e.message };
    }
  });
  console.log("IN-PAGE FETCH RESULT:", res);

  // Now wait 8 seconds for the component to receive data
  console.log("Waiting 8 seconds for React state update...");
  await page.waitForTimeout(8000);

  const kpiValue = await page.locator(".shield-kpi-grid-pass2382").first().innerText().catch(() => "not found");
  console.log("KPI GRID TEXT:\n", kpiValue);

  const rowsCount = await page.locator('[data-pass4577-shield-row]').count();
  console.log("ROWS WITH data-pass4577-shield-row:", rowsCount);

  await browser.close();
}

run().catch(console.error);
