import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on("console", (msg) => {
    console.log("[BROWSER CONSOLE]:", msg.type(), msg.text());
  });

  page.on("requestfailed", (req) => {
    console.log("[REQUEST FAILED]:", req.url(), req.failure()?.errorText);
  });

  page.on("response", (res) => {
    if (res.url().includes("/api/")) {
      console.log("[API RESPONSE]:", res.url(), res.status());
    }
  });

  await page.goto("http://localhost:3000/en/shield", { waitUntil: "networkidle" });
  await page.waitForTimeout(4000);
  await browser.close();
}

run().catch(console.error);
