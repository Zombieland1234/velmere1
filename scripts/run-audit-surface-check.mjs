import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const LOCALES = ["pl", "en", "de"];
const PATHS = [
  "",
  "/shield",
  "/shield-pro",
  "/shield-map",
  "/real-markets",
  "/browser",
  "/security/audits",
  "/security/audits/report/0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c?tier=basic&address=0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
  "/security/audits/report/0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c?tier=pro&address=0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
  "/security/audits/report/0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c?tier=advanced&address=0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
  "/contact",
  "/shop",
  "/terms",
  "/privacy",
  "/shipping",
  "/returns",
  "/faq",
  "/some-unknown-404-route",
];

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push({ text: msg.text(), location: msg.location() });
    }
  });

  const results = [];

  for (const locale of LOCALES) {
    for (const path of PATHS) {
      const url = `${BASE}/${locale}${path}`;
      const is404Expected = path.includes("404");
      try {
        const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
        const status = res ? res.status() : 0;
        await page.waitForTimeout(600);
        const title = await page.title();
        const hasBody = (await page.locator("body").count()) > 0;

        let ok = false;
        if (is404Expected) {
          const bodyText = await page.locator("body").innerText();
          ok = status === 404 || bodyText.includes("404") || bodyText.toLowerCase().includes("nie znaleziono") || bodyText.toLowerCase().includes("not found");
        } else {
          ok = status >= 200 && status < 400 && hasBody;
        }

        results.push({
          url,
          locale,
          path,
          status,
          title,
          ok,
        });
        console.log(`[${ok ? "PASS" : "FAIL"}] ${status} ${url} - ${title}`);
      } catch (e) {
        results.push({ url, locale, path, status: 0, error: e.message, ok: false });
        console.log(`[FAIL] ERROR ${url} - ${e.message}`);
      }
    }
  }

  await browser.close();

  const passCount = results.filter((r) => r.ok).length;
  console.log(`\nSurface Check: ${passCount}/${results.length} PASS`);
  if (consoleErrors.length > 0) {
    console.log(`Console errors logged during test (${consoleErrors.length}):`);
    consoleErrors.slice(0, 15).forEach((e) => console.log("  -", e.text.slice(0, 150)));
  }
}

main().catch(console.error);
