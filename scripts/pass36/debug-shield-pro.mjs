import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on("console", msg => console.log("PAGE CONSOLE:", msg.type(), msg.text()));
  page.on("pageerror", err => console.error("PAGE ERROR:", err.message));

  console.log("Navigating...");
  await page.goto("http://localhost:3000/pl/shield-pro", { waitUntil: "networkidle", timeout: 30000 }).catch(e => console.log("GOTO WARN:", e.message));
  
  const text = await page.innerText("body");
  console.log("BODY SNAPSHOT (first 1000):\n", text.slice(0, 1000));
  await browser.close();
}

run().catch(console.error);
