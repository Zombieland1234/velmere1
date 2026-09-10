import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  page.on("request", req => console.log("[REQ]:", req.method(), req.url()));
  page.on("response", res => console.log("[RES]:", res.status(), res.url()));
  page.on("pageerror", err => console.log("[PAGE ERR]:", err.message));
  page.on("console", msg => console.log("[CONSOLE]:", msg.type(), msg.text()));

  await page.goto("http://localhost:3000/en/shield", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(6000);

  const text = await page.innerText("body");
  console.log("PAGE TEXT PREVIEW:\n", text.slice(0, 400));
  
  await browser.close();
}

run().catch(console.error);
