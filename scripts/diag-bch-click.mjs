import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on("request", (req) => {
    if (req.url().includes("search")) console.log("REQ:", req.method(), req.url());
  });
  page.on("response", async (res) => {
    if (res.url().includes("search")) console.log("RES:", res.status(), res.url());
  });
  page.on("console", (msg) => {
    console.log("CONSOLE:", msg.type(), msg.text());
  });

  await page.goto("http://localhost:3000/en/browser", { waitUntil: "networkidle" });
  console.log("URL after goto:", page.url());

  const btn = page.locator(".velmere-lens-discovery-card").first();
  console.log("Card found count:", await btn.count());
  console.log("Card text:", (await btn.innerText()).replace(/\s+/g, " "));

  await btn.click();
  console.log("Clicked card, waiting 4s...");
  await page.waitForTimeout(4000);

  console.log("Search input value:", await page.locator("input[type='search'], input[role='combobox'], input").first().inputValue());
  console.log("Has BCH text:", (await page.content()).includes("BCH"));
  console.log("Results count:", await page.locator("[data-testid='lens-result-card']").count());

  await browser.close();
}

main().catch(console.error);
