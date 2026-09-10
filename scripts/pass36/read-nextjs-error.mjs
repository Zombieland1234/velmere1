import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  page.on("pageerror", err => console.error("CLIENT PAGE ERROR:\n", err.stack || err.message));
  page.on("console", msg => {
    if (msg.type() === "error") console.error("CLIENT CONSOLE ERROR:\n", msg.text());
  });

  await page.goto("http://localhost:3000/pl/shield-pro", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  // Click on the Next.js error toast if present
  const toast = page.locator('[data-nextjs-toast="true"], nextjs-portal, [class*="toast"]').first();
  if (await toast.isVisible().catch(() => false)) {
    console.log("TOAST TEXT:\n", await toast.innerText());
  }

  // Also inspect nextjs-portal
  const portal = page.locator("nextjs-portal");
  if (await portal.count() > 0) {
    console.log("PORTAL HTML:\n", await portal.innerHTML());
  }

  await browser.close();
}

run().catch(console.error);
