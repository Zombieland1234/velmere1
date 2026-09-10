import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const failedRequests = [];
  page.on("response", (res) => {
    if (res.status() >= 400) {
      failedRequests.push({ url: res.url(), status: res.status() });
    }
  });

  for (const p of [
    "/pl",
    "/pl/shield",
    "/pl/shield-pro",
    "/pl/shield-map",
    "/pl/real-markets",
    "/pl/browser",
    "/pl/security/audits",
    "/pl/shop",
  ]) {
    console.log(`Checking ${p}...`);
    await page.goto("http://localhost:3000" + p, { waitUntil: "networkidle", timeout: 20000 }).catch((e) => console.log(`timeout on ${p}`));
  }

  await browser.close();
  console.log("\n--- FAILED REQUESTS REPORT ---");
  console.log(`Total >= 400 responses: ${failedRequests.length}`);
  for (const r of failedRequests) {
    console.log(`${r.status}: ${r.url}`);
  }
}

main().catch(console.error);
