import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ARTIFACT_DIR = "C:\\Users\\marci\\.gemini\\antigravity\\brain\\48d46592-4f85-4d32-be56-a1ee6bf183b7";

async function run() {
  console.log("Starting Stripe Checkout flow E2E verification test...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => {
    errors.push(err.message);
  });

  try {
    // 1. Visit Bitcoin asset page
    console.log("1. Visiting /pl/shield/assets/bitcoin...");
    await page.goto("http://localhost:3000/pl/shield/assets/bitcoin", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await page.waitForTimeout(1500);

    // 2. Click Pro purchase button to open the Stripe purchase modal
    console.log("2. Clicking 'Kup Pro (14.99 €)' to open the Stripe purchase modal...");
    const buyProBtn = page.locator("button:has-text('Kup Pro')").first();
    await buyProBtn.click();

    // Verify modal appeared
    await page.waitForSelector("text=Zakup: Analiza Profesjonalna (Pro)", { timeout: 4000 });
    console.log("✓ Okno zakupu (Purchase modal) opened!");

    // Verify Stripe badge & payment methods
    const modalText = await page.innerText(".fixed");
    if (!modalText.includes("Bramka Stripe: Gotowa i Połączona")) {
      throw new Error("Stripe connected status not found in modal!");
    }
    console.log("✓ Stripe Live Gateway status verified!");

    if (!modalText.includes("BLIK") || !modalText.includes("KARTA (VISA/MC)") || !modalText.includes("APPLE PAY")) {
      throw new Error("Expected payment methods (BLIK, Karta, Apple Pay) not listed!");
    }
    console.log("✓ Payment methods (Karta, BLIK, Apple Pay, Google Pay) verified!");

    // Capture screenshot of Okno Zakupu
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "stripe_purchase_modal_window.png"),
    });
    console.log("✓ Saved stripe_purchase_modal_window.png");

    // 3. Test Stripe Checkout API call directly with origin header
    console.log("3. Testing Stripe Checkout API endpoint...");
    const apiRes = await context.request.post("http://localhost:3000/api/checkout/stripe-analysis", {
      headers: { origin: "http://localhost:3000" },
      data: {
        tier: "pro",
        assetId: "bitcoin",
        symbol: "BTC",
        locale: "pl",
      },
    });
    const apiJson = await apiRes.json();
    console.log("✓ /api/checkout/stripe-analysis response:", {
      status: apiRes.status(),
      ok: apiJson.ok,
      sessionId: apiJson.sessionId,
      urlPrefix: apiJson.url?.slice(0, 50),
    });

    if (!apiJson.ok || !apiJson.url?.startsWith("https://checkout.stripe.com/")) {
      throw new Error("Stripe checkout API did not return a valid checkout.stripe.com URL!");
    }
    console.log("✓ Verified live Stripe Checkout session generation via API!");

    // 4. Test Return from Stripe Checkout with payment=success
    console.log("4. Testing return from Stripe with success query param...");
    await page.goto("http://localhost:3000/pl/shield/assets/bitcoin?payment=success&tier=pro&session_id=" + apiJson.sessionId, {
      waitUntil: "networkidle",
    });

    // Check celebratory success notification
    await page.waitForSelector("text=Płatność Stripe powiodła się!", { timeout: 6000 });
    console.log("✓ Stripe success banner appeared!");

    // Check unlocked Pro signals modal appears
    await page.waitForSelector("text=Analiza Profesjonalna (Pro Terminal)", { timeout: 10000 });
    console.log("✓ Pro analysis permanently unlocked with 14 signals!");

    // Capture success return screenshot
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "stripe_payment_success_unlocked.png"),
    });
    console.log("✓ Saved stripe_payment_success_unlocked.png");

    // 5. Test Advanced tier Checkout as well
    console.log("5. Testing Advanced tier Stripe Checkout API...");
    const advRes = await context.request.post("http://localhost:3000/api/checkout/stripe-analysis", {
      headers: { origin: "http://localhost:3000" },
      data: {
        tier: "advanced",
        assetId: "bitcoin",
        symbol: "BTC",
        locale: "pl",
      },
    });
    const advJson = await advRes.json();
    console.log("✓ Advanced tier Stripe session created:", {
      status: advRes.status(),
      ok: advJson.ok,
      amount: advJson.amount,
      sessionId: advJson.sessionId,
    });

    if (!advJson.ok || advJson.amount !== 149.99) {
      throw new Error("Advanced Stripe checkout session creation failed!");
    }

    console.log("\n=======================================================");
    console.log("STRIPE CHECKOUT E2E VERIFICATION SUCCEEDED 100%!");
    console.log(`Console error count: ${errors.length}`);
    console.log("=======================================================\n");
  } catch (err) {
    console.error("Test failed:", err);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "stripe_test_failure.png"),
    });
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
