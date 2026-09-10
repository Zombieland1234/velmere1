import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const VIEWPORTS = [
  { name: "mobile_390x844", width: 390, height: 844 },
  { name: "tablet_portrait_768x1024", width: 768, height: 1024 },
  { name: "tablet_landscape_1024x768", width: 1024, height: 768 },
  { name: "laptop_1280x800", width: 1280, height: 800 },
  { name: "desktop_1440x900", width: 1440, height: 900 },
];

const PAGES = [
  { name: "home", path: "/en" },
  { name: "shield", path: "/en/shield" },
  { name: "shield_pro", path: "/en/shield-pro" },
  { name: "shield_map", path: "/en/shield-map" },
  { name: "real_markets", path: "/en/real-markets" },
  { name: "browser", path: "/en/browser" },
  { name: "audits", path: "/en/security/audits" },
];

const OUT_DIR = "C:\\Users\\marci\\Desktop\\Nowy folder\\preview_screenshots\\responsive";
fs.mkdirSync(OUT_DIR, { recursive: true });

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const results = [];

  for (const vp of VIEWPORTS) {
    console.log(`\n========================================`);
    console.log(`TESTING VIEWPORT: ${vp.name} (${vp.width}x${vp.height})`);
    console.log(`========================================`);
    await page.setViewportSize({ width: vp.width, height: vp.height });

    for (const p of PAGES) {
      const url = `http://localhost:3000${p.path}`;
      try {
        await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
        await page.waitForTimeout(400);

        // Check horizontal document overflow (document dragging bug)
        const overflow = await page.evaluate(() => {
          const docEl = document.documentElement;
          const body = document.body;
          const scrollWidth = Math.max(docEl.scrollWidth, body ? body.scrollWidth : 0);
          const clientWidth = docEl.clientWidth;
          return {
            hasOverflow: scrollWidth > clientWidth,
            scrollWidth,
            clientWidth,
            delta: scrollWidth - clientWidth,
          };
        });

        // Screenshot
        const shotPath = path.join(OUT_DIR, `${vp.name}_${p.name}.png`);
        await page.screenshot({ path: shotPath, fullPage: false });

        const pass = !overflow.hasOverflow;
        results.push({
          viewport: vp.name,
          page: p.name,
          pass,
          overflow,
          shotPath,
        });

        console.log(
          `[${pass ? "PASS" : "FAIL"}] ${vp.name} on ${p.name} - scrollWidth: ${overflow.scrollWidth}, clientWidth: ${overflow.clientWidth}`
        );
      } catch (err) {
        results.push({
          viewport: vp.name,
          page: p.name,
          pass: false,
          error: err.message,
        });
        console.log(`[FAIL] ${vp.name} on ${p.name} - ERROR: ${err.message}`);
      }
    }
  }

  await browser.close();

  console.log("\n=========================================");
  console.log("RESPONSIVE MATRIX RESULTS");
  console.log("=========================================");
  let passes = 0;
  for (const r of results) {
    if (r.pass) passes++;
    else console.log(`FAIL DETAIL: ${r.viewport} on ${r.page}: delta ${r.overflow?.delta}px overflow`);
  }
  console.log(`\nTOTAL: ${passes}/${results.length} PASSED`);
}

main().catch(console.error);
