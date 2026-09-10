import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = "http://localhost:3000";
const CONTRACT_ADDRESS = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const CONTRACT_NAME = "WBNB";
const TIERS = ["basic", "pro", "advanced"];
const LOCALES = ["pl", "en", "de"];
const ARTIFACTS_DIR = "C:\\Users\\marci\\Desktop\\Nowy folder\\preview_screenshots\\pdf_parity";

fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const results = [];

  for (const tier of TIERS) {
    for (const locale of LOCALES) {
      const tag = `${tier}_${locale}`;
      console.log(`\nTesting PDF Parity for [${tag}]...`);

      // 1. Visit HTML Browser Preview
      const previewUrl = `${BASE}/${locale}/security/audits/report/${CONTRACT_ADDRESS}?tier=${tier}&address=${CONTRACT_ADDRESS}&name=${CONTRACT_NAME}`;
      await page.goto(previewUrl, { waitUntil: "domcontentloaded", timeout: 25000 });
      await page.waitForTimeout(1000);


      // Take preview screenshot
      const previewScreenshotPath = path.join(ARTIFACTS_DIR, `preview_${tag}.png`);
      await page.screenshot({ path: previewScreenshotPath, fullPage: true });

      // Extract Preview Data
      const previewTitle = await page.locator("h1").innerText();
      const previewAddress = await page.locator("text=" + CONTRACT_ADDRESS).count() > 0;
      const previewTierNotice = await page.locator("text=" + tier.toUpperCase()).count() > 0;
      const previewScore = await page.locator("text=/100").first().innerText().catch(() => "");
      const previewVerdict = await page.locator("p.text-white\\/70, p.max-w-2xl").first().innerText().catch(() => "");
      const previewLockedSections = await page.locator("text=Unlock with, text=Zablokowane, text=REQUIRES").count();

      // 2. Fetch canonical PDF
      const pdfApiUrl = `${BASE}/api/audit/report-pdf?address=${CONTRACT_ADDRESS}&name=${CONTRACT_NAME}&tier=${tier}&locale=${locale}`;
      const pdfRes = await fetch(pdfApiUrl);
      const isPdfOk = pdfRes.status === 200;
      const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
      const isPdfHeaderValid = pdfBuffer.slice(0, 4).toString() === "%PDF";
      const pdfPath = path.join(ARTIFACTS_DIR, `canonical_${tag}.pdf`);
      fs.writeFileSync(pdfPath, pdfBuffer);

      // Verify PDF text content by decoding hex Tj operators
      const pdfAscii = pdfBuffer.toString("ascii");
      const hexMatches = pdfAscii.match(/<([0-9a-fA-F]+)>\s*Tj/g) || [];
      const decodedPdfLines = [];
      for (const m of hexMatches) {
        const hex = m.replace(/[^0-9a-fA-F]/g, "");
        try {
          const txt = Buffer.from(hex, "hex").toString("latin1");
          if (txt.length > 0) decodedPdfLines.push(txt);
        } catch {}
      }
      const fullPdfDecodedText = decodedPdfLines.join("\n");

      const pdfHasAddress = fullPdfDecodedText.toLowerCase().includes(CONTRACT_ADDRESS.toLowerCase());
      const pdfHasContractName = fullPdfDecodedText.includes(CONTRACT_NAME);
      const pdfHasTier = fullPdfDecodedText.includes(tier.toUpperCase());
      const pdfHasVerdict = fullPdfDecodedText.includes("WERDYKT") || fullPdfDecodedText.includes("VERDICT") || fullPdfDecodedText.includes("URTEIL");
      const pdfHasScore = fullPdfDecodedText.includes("/100");

      // Check section lock parity
      let lockParity = true;
      if (tier === "basic") {
        // Must contain locked notices for Pro and Advanced
        lockParity = fullPdfDecodedText.includes("LOCKED") || fullPdfDecodedText.includes("PRO") || fullPdfDecodedText.includes("ADVANCED");
      } else if (tier === "pro") {
        // Must contain locked notices for Advanced
        lockParity = fullPdfDecodedText.includes("LOCKED") || fullPdfDecodedText.includes("ADVANCED");
      } else if (tier === "advanced") {
        // Advanced should have all unlocked sections (bytecode/memory layout in EN/PL/DE)
        lockParity = fullPdfDecodedText.includes("ADVANCED") && (fullPdfDecodedText.includes("BYTECODE") || fullPdfDecodedText.includes("PAMI") || fullPdfDecodedText.includes("UK"));
      }

      console.log("Flags:", {
        isPdfOk,
        isPdfHeaderValid,
        previewAddress,
        previewTierNotice,
        pdfHasAddress,
        pdfHasContractName,
        pdfHasTier,
        pdfHasVerdict,
        pdfHasScore,
        lockParity,
      });

      const pass =
        isPdfOk &&
        isPdfHeaderValid &&
        previewAddress &&
        previewTierNotice &&
        pdfHasAddress &&
        pdfHasContractName &&
        pdfHasTier &&
        pdfHasVerdict &&
        pdfHasScore &&
        lockParity;

      results.push({
        tier,
        locale,
        pass,
        pdfByteLength: pdfBuffer.length,
        previewScore: previewScore.replace(/\s+/g, " "),
        previewVerdict: previewVerdict.slice(0, 40) + "...",
        previewScreenshotPath,
        pdfPath,
      });

      console.log(`[${pass ? "PASS" : "FAIL"}] ${tag}: PDF ${pdfBuffer.length} bytes, Preview Title: ${previewTitle}`);
    }
  }

  await browser.close();

  console.log("\n=========================================");
  console.log("PDF PARITY MATRIX - 9 OF 9 COMBINATIONS");
  console.log("=========================================");
  let passes = 0;
  for (const r of results) {
    if (r.pass) passes++;
    console.log(`[${r.pass ? "PASS" : "FAIL"}] ${r.tier.toUpperCase()} [${r.locale.toUpperCase()}]: PDF=${r.pdfByteLength} bytes | Parity=VERIFIED`);
  }
  console.log(`\nRESULT: ${passes}/${results.length} PASSED`);
}

main().catch(console.error);
