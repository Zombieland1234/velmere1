import { chromium } from "playwright";
import fs from "fs";

async function main() {
  console.log("=== PASS_05 VERIFICATION: POST-ANALYSIS EXPORT MODAL & GENERATORS ===");

  // 1. Direct API Checks
  console.log("1. Testing Export API Endpoints (PDF, JSON, TXT)...");
  
  // Test PDF
  const pdfRes = await fetch("http://localhost:3000/api/market-integrity/export?symbol=BNB&name=BNB%20Beacon&price=752.44&tier=basic&riskScore=35&format=pdf");
  if (pdfRes.status !== 200) throw new Error(`PDF export failed with status ${pdfRes.status}`);
  const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
  const isPdfHeader = pdfBuffer.toString("utf8", 0, 5) === "%PDF-";
  console.log(`✓ PDF Export Status: 200, Size: ${pdfBuffer.length} bytes, Valid PDF: ${isPdfHeader}`);
  if (!isPdfHeader) throw new Error("Exported file is not a valid PDF");

  // Test JSON
  const jsonRes = await fetch("http://localhost:3000/api/market-integrity/export?symbol=BNB&name=BNB%20Beacon&price=752.44&tier=pro&riskScore=35&format=json");
  if (jsonRes.status !== 200) throw new Error(`JSON export failed with status ${jsonRes.status}`);
  const jsonData = await jsonRes.json();
  console.log(`✓ JSON Export Status: 200, Signals: ${jsonData.signals?.length}, Tier: ${jsonData.analysisTier}, Proof: ${jsonData.cryptographicProof?.reportDigest?.slice(0, 16)}...`);
  if (!jsonData.signals || jsonData.signals.length === 0) throw new Error("JSON export missing signals");

  // Test TXT (Real Markets AAPL)
  const txtRes = await fetch("http://localhost:3000/api/market-integrity/export?symbol=AAPL&name=Apple%20Inc.&surface=real-markets&tier=advanced&riskScore=18&format=txt");
  if (txtRes.status !== 200) throw new Error(`TXT export failed with status ${txtRes.status}`);
  const txtData = await txtRes.text();
  console.log(`✓ TXT Export Status: 200, Length: ${txtData.length} chars, Contains Header: ${txtData.includes("VELMÈRE INTELLIGENCE")}`);
  if (!txtData.includes("VELMÈRE INTELLIGENCE") || !txtData.includes("Real Markets")) throw new Error("TXT export missing expected text");

  // 2. Playwright UI Verification
  console.log("2. Launching browser to verify export modal UX on Shield & Real Markets...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    // Navigate to BNB detail
    console.log("Navigating to /en/shield/assets/bnb...");
    await page.goto("http://localhost:3000/en/shield/assets/bnb", { waitUntil: "networkidle" });

    // Scroll to analysis section
    await page.evaluate(() => window.scrollTo(0, 700));
    await page.waitForTimeout(600);

    // Click "Analizuj (0 PLN)" / "Analyze Core"
    console.log("Clicking 'Analizuj (0 PLN)' / 'Analyze Core'...");
    const analyzeBtn = page.locator("button:has-text('Analizuj (0 PLN)'), button:has-text('Analyze Core'), [data-testid='analysis-card-btn-basic']").first();
    await analyzeBtn.click();

    // Wait for analysis progress and modal appearance
    console.log("Waiting for analysis to complete and export modal to display...");
    const exportModal = page.locator('[data-testid="export-modal"]');
    await exportModal.waitFor({ state: "visible", timeout: 8000 });

    // Verify 3 download buttons
    const pdfBtn = page.locator('[data-testid="download-pdf-btn"]');
    const jsonBtn = page.locator('[data-testid="download-json-btn"]');
    const txtBtn = page.locator('[data-testid="download-txt-btn"]');

    const pdfVisible = await pdfBtn.isVisible();
    const jsonVisible = await jsonBtn.isVisible();
    const txtVisible = await txtBtn.isVisible();

    console.log(`Export Modal Buttons -> PDF: ${pdfVisible}, JSON: ${jsonVisible}, TXT: ${txtVisible}`);
    if (!pdfVisible || !jsonVisible || !txtVisible) {
      throw new Error("Export modal buttons missing!");
    }

    // Save screenshot
    await page.screenshot({ path: "artifacts/pass05_export_modal.png" });
    console.log("Saved screenshot: artifacts/pass05_export_modal.png");

    // Close modal
    await page.locator('[data-testid="export-modal"] button:has-text("Zamknij"), [data-testid="export-modal"] button:has-text("Close")').first().click();
    await page.waitForTimeout(400);

    // Test Real Markets AAPL
    console.log("Navigating to /en/real-markets/assets/aapl...");
    await page.goto("http://localhost:3000/en/real-markets/assets/aapl", { waitUntil: "networkidle" });
    await page.evaluate(() => window.scrollTo(0, 700));
    await page.waitForTimeout(600);

    const analyzeAaplBtn = page.locator("button:has-text('Analizuj (0 PLN)'), button:has-text('Analyze Core'), [data-testid='analysis-card-btn-basic']").first();
    await analyzeAaplBtn.click();
    await exportModal.waitFor({ state: "visible", timeout: 8000 });

    await page.screenshot({ path: "artifacts/pass05_real_markets_export_modal.png" });
    console.log("Saved screenshot: artifacts/pass05_real_markets_export_modal.png");

    console.log("=== PASS_05 VERIFICATION SUCCESSFUL ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
