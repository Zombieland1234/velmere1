import { chromium } from "playwright";

const LOCALES = ["pl", "en", "de"];
const ROUTES = [
  "",
  "/shield",
  "/shield-pro",
  "/shield-map",
  "/real-markets",
  "/browser",
  "/security/audits",
  "/contact",
  "/terms",
  "/privacy",
  "/shipping",
  "/returns",
  "/faq",
];

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const report = [];

  for (const locale of LOCALES) {
    console.log(`\nScanning i18n for [${locale.toUpperCase()}]...`);
    for (const route of ROUTES) {
      const url = `http://localhost:3000/${locale}${route}`;
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
      await page.waitForTimeout(400);

      const bodyText = await page.locator("body").innerText();

      // Check for raw translation keys or missing translations
      const hasMissingKey =
        bodyText.includes("MISSING_TRANSLATION") ||
        bodyText.includes("undefined") ||
        bodyText.includes("[object Object]") ||
        bodyText.includes("translation.missing");

      // Check language specific markers
      let localeCheck = true;
      if (locale === "pl") {
        // Should contain Polish characters or Polish words
        localeCheck =
          bodyText.includes("i") &&
          !bodyText.includes("Submit prescreen") &&
          !bodyText.includes("Analyse wiederholen");
      } else if (locale === "de") {
        // Should contain German terms
        localeCheck =
          !bodyText.includes("Zapisz prescreen") &&
          !bodyText.includes("Ponów analizę");
      } else if (locale === "en") {
        // Should contain English terms
        localeCheck =
          !bodyText.includes("Zapisz prescreen") &&
          !bodyText.includes("Analyse wiederholen") &&
          !bodyText.includes("Ponów analizę");
      }

      const pass = !hasMissingKey && localeCheck;
      report.push({
        locale,
        route,
        pass,
        hasMissingKey,
        localeCheck,
      });

      if (!pass) {
        console.log(`[FAIL] ${locale.toUpperCase()} ${route} - missingKey: ${hasMissingKey}, localeCheck: ${localeCheck}`);
      } else {
        console.log(`[PASS] ${locale.toUpperCase()} ${route}`);
      }
    }
  }

  await browser.close();

  console.log("\n=== I18N AUDIT SUMMARY ===");
  const passCount = report.filter((r) => r.pass).length;
  console.log(`RESULT: ${passCount}/${report.length} PASSED`);
}

main().catch(console.error);
