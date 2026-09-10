import { chromium } from "playwright";
import path from "node:path";

const OUT_DIR = "c:\\Users\\marci\\Desktop\\Nowy folder\\naprawa";

async function testPage(page, url, name) {
  console.log("\n--- Testing " + name + " (" + url + ") ---");
  const errors = [];
  const warnings = [];

  page.on("pageerror", (err) => {
    console.error("[" + name + "] Page error:", err.message);
    errors.push(err.message);
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.error("[" + name + "] Console error:", msg.text());
      errors.push(msg.text());
    } else if (msg.type() === "warning") {
      warnings.push(msg.text());
    }
  });

  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT_DIR, name + "_landing.png") });
  console.log("[" + name + "] Captured landing screenshot");

  // Find clickable buttons and test them
  const buttons = await page.locator("button:visible, [role='button']:visible, [role='tab']:visible").all();
  console.log("[" + name + "] Found " + buttons.length + " visible buttons/tabs");

  // Click first 5 safe buttons (e.g. tabs, filters)
  let clickedCount = 0;
  for (let i = 0; i < Math.min(buttons.length, 8); i++) {
    try {
      const btn = buttons[i];
      const text = (await btn.innerText().catch(() => "")) || (await btn.getAttribute("aria-label").catch(() => "")) || "button-" + i;
      // Skip checkout redirects or links that leave page
      if (/checkout|kup teraz|buy now|subskrybuj/i.test(text)) continue;
      
      console.log("[" + name + "] Clicking: " + text.slice(0, 30));
      await btn.click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(500);
      clickedCount++;
    } catch (e) {
      // Ignored
    }
  }

  await page.screenshot({ path: path.join(OUT_DIR, name + "_after_clicks.png") });
  console.log("[" + name + "] Successfully clicked " + clickedCount + " elements. Total errors: " + errors.length);
  return { name, errors, warnings };
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const results = [];
  results.push(await testPage(page, "http://localhost:3000/pl/shield", "shield"));
  results.push(await testPage(page, "http://localhost:3000/pl/shield-pro", "shield_pro"));
  results.push(await testPage(page, "http://localhost:3000/pl/shield-map", "shield_map"));

  await browser.close();

  console.log("\n================ SUMMARY ================");
  let totalErrors = 0;
  for (const r of results) {
    console.log(r.name + ": " + r.errors.length + " errors, " + r.warnings.length + " warnings");
    totalErrors += r.errors.length;
  }
  console.log("TOTAL ERRORS: " + totalErrors);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
