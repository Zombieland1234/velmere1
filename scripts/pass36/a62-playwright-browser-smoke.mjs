#!/usr/bin/env node
import fs from "node:fs";
import process from "node:process";

const executablePath = String(process.env.VELMERE_PLAYWRIGHT_EXECUTABLE_PATH ?? "").trim();
if (!executablePath || !fs.existsSync(executablePath)) throw new Error("a62_browser_executable_not_supplied");
const { chromium } = await import("playwright");
let browser = null;
try {
  browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  await page.setContent("<!doctype html><html><body><main id='a62'>A62_BROWSER_OK</main></body></html>");
  const text = await page.locator("#a62").textContent();
  if (text !== "A62_BROWSER_OK") throw new Error(`a62_browser_content_mismatch:${text}`);
  const version = browser.version();
  if (!version) throw new Error("a62_browser_version_missing");
  console.log(JSON.stringify({ status: "PASS_A62_PLAYWRIGHT_BROWSER_SMOKE", browserVersion: version, executablePresent: true }, null, 2));
} finally {
  if (browser) await browser.close();
}
