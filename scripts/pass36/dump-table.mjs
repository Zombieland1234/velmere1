import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto("http://localhost:3000/pl/shield-pro", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000);
  
  const html = await page.evaluate(() => {
    const table = document.querySelector("table");
    return table ? table.outerHTML : "NO TABLE IN DOM; BODY:\n" + document.body.innerText;
  });

  console.log("TABLE HTML / BODY:\n", html.slice(0, 1500));
  await browser.close();
}

run().catch(console.error);
