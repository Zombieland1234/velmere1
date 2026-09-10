/**
 * VELMÈRE — PRODUCT WORKFLOW INSPECTION SCRIPT
 * Reads the actual DOM of each product to understand real customer workflows
 */
import { chromium } from "playwright";

const BASE_URL = "http://localhost:3000";

async function inspectProduct(browser, name, url, actions = []) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const result = { product: name, url, dom: {}, inputs: [], buttons: [], actions_taken: [] };
  
  try {
    const response = await page.goto(url, { waitUntil: "networkidle", timeout: 15000 });
    result.status = response.status();
    await page.waitForSelector("main", { timeout: 4000 }).catch(() => null);
    
    // Get all inputs
    const inputCount = await page.locator("input").count();
    for (let i = 0; i < Math.min(inputCount, 5); i++) {
      const el = page.locator("input").nth(i);
      result.inputs.push({
        type: await el.getAttribute("type"),
        placeholder: await el.getAttribute("placeholder"),
        class: (await el.getAttribute("class") || "").slice(0, 80),
        visible: await el.isVisible().catch(() => false),
      });
    }
    
    // Get all buttons
    const btnCount = await page.locator("button").count();
    for (let i = 0; i < Math.min(btnCount, 10); i++) {
      const el = page.locator("button").nth(i);
      result.buttons.push({
        text: (await el.innerText().catch(() => "")).trim().slice(0, 60),
        visible: await el.isVisible().catch(() => false),
      });
    }
    
    // Main text excerpt
    result.dom.mainText = (await page.locator("main").innerText().catch(() => "")).slice(0, 800);
    
    // Execute custom actions
    for (const action of actions) {
      if (action.type === "fill") {
        const el = page.locator(action.selector).first();
        if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
          await el.fill(action.value);
          result.actions_taken.push({ type: "fill", selector: action.selector, value: action.value });
          await page.waitForTimeout(action.wait || 1500);
        }
      } else if (action.type === "click") {
        const el = page.locator(action.selector).first();
        if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
          await el.click({ force: true });
          result.actions_taken.push({ type: "click", selector: action.selector });
          await page.waitForTimeout(action.wait || 1500);
        }
      } else if (action.type === "capture") {
        result.dom[action.name] = (await page.locator(action.selector).first().innerText().catch(() => "NOT_FOUND")).slice(0, 600);
        const count = await page.locator(action.selector).count();
        result.dom[`${action.name}_count`] = count;
      }
    }
    
    result.dom.mainTextAfterActions = (await page.locator("main").innerText().catch(() => "")).slice(0, 1200);
    result.dom.dialogText = (await page.locator("[role='dialog']").first().innerText().catch(() => "NO_DIALOG")).slice(0, 600);
  } catch (err) {
    result.error = err.message;
  } finally {
    await page.close();
  }
  return result;
}

const browser = await chromium.launch({ headless: true });

const products = [
  {
    name: "Shield (en) - BTC search",
    url: `${BASE_URL}/en/shield`,
    actions: [
      { type: "fill", selector: "input.shield-search-input-pass2382, input[placeholder*='BTC'], input[placeholder*='Search']", value: "BTC", wait: 2000 },
      { type: "capture", name: "search_results", selector: "[role='row'], table tbody tr" },
      { type: "click", selector: "[role='row']:first-child, table tbody tr:first-child", wait: 1500 },
      { type: "capture", name: "detail_dialog", selector: "[role='dialog']" },
      { type: "capture", name: "withheld_state", selector: ".shield-withheld, [data-withheld], .source-unavailable" },
    ],
  },
  {
    name: "Shield Pro (en)",
    url: `${BASE_URL}/en/shield-pro`,
    actions: [
      { type: "fill", selector: "input[type='text'], input[placeholder*='ETH'], input[placeholder*='asset']", value: "ETH", wait: 2000 },
      { type: "capture", name: "terminal_content", selector: ".shield-pro-terminal, [data-terminal], main" },
      { type: "capture", name: "confidence_section", selector: "[data-confidence], .confidence, .calibration" },
    ],
  },
  {
    name: "Audit (en) - tier selector + intake",
    url: `${BASE_URL}/en/security/audits`,
    actions: [
      { type: "capture", name: "tier_buttons", selector: "button:has-text('PRO'), button:has-text('ADVANCED'), button:has-text('BASIC')" },
      { type: "click", selector: "button:has-text('PRO'), button:has-text('Pro')", wait: 1000 },
      { type: "capture", name: "comparison_btn", selector: "button:has-text('comparison'), button:has-text('Comparison')" },
      { type: "fill", selector: "input[placeholder*='0x'], input[type='text']", value: "0xdAC17F958D2ee523a2206206994597C13D831ec7", wait: 500 },
      { type: "capture", name: "submit_btn", selector: "button:has-text('Prescreen'), button:has-text('Submit'), button:has-text('Scan'), button:has-text('Audit')" },
    ],
  },
  {
    name: "Real Markets (en)",
    url: `${BASE_URL}/en/real-markets`,
    actions: [
      { type: "capture", name: "instruments", selector: "table, [role='table'], .market-row, .instrument" },
      { type: "capture", name: "cache_notice", selector: "[data-cache], [data-stale], .cache-notice, .freshness" },
    ],
  },
  {
    name: "Shield Map (en)",
    url: `${BASE_URL}/en/shield-map`,
    actions: [
      { type: "capture", name: "graph_container", selector: "canvas, svg, .graph, .map, [data-graph]" },
      { type: "capture", name: "entity_search", selector: "input[type='text'], input[placeholder*='address'], input[placeholder*='entity']" },
    ],
  },
  {
    name: "Market Integrity (en)",
    url: `${BASE_URL}/en/market-integrity`,
    actions: [
      { type: "capture", name: "whale_section", selector: ".whale, [data-whale], .transfer, [data-transfer]" },
    ],
  },
  {
    name: "Angel (en) - homepage",
    url: `${BASE_URL}/en`,
    actions: [
      { type: "capture", name: "angel_btn", selector: "button.velmere-floating-utility--angel, button[aria-label*='Angel']" },
      { type: "click", selector: "button.velmere-floating-utility--angel, button:has-text('Angel')", wait: 1000 },
      { type: "capture", name: "angel_panel", selector: ".angel-panel, [data-angel-panel], [role='dialog']" },
      { type: "capture", name: "angel_input", selector: ".angel-input, input[placeholder*='Angel'], input[placeholder*='Zapytaj'], textarea" },
    ],
  },
  {
    name: "Checkout (en)",
    url: `${BASE_URL}/en/checkout`,
    actions: [
      { type: "capture", name: "stop_sell_notice", selector: "[data-stop-sell], .stop-sell, .invitation-required" },
    ],
  },
];

const results = [];
for (const product of products) {
  console.log(`\nInspecting: ${product.name}...`);
  const result = await inspectProduct(browser, product.name, product.url, product.actions);
  results.push(result);
  console.log(`  Status: ${result.status}`);
  console.log(`  Inputs (${result.inputs.length}):`, result.inputs.map(i => `[${i.type}] "${i.placeholder}" visible=${i.visible}`).join(", "));
  console.log(`  Buttons (${result.buttons.length}):`, result.buttons.filter(b => b.visible).map(b => b.text).filter(Boolean).slice(0, 8).join(" | "));
  console.log(`  Actions taken: ${result.actions_taken.length}`);
  console.log(`  Main text (400): ${result.dom.mainTextAfterActions?.slice(0, 400).replace(/\n/g, " | ")}`);
  if (result.dom.dialog_text && result.dom.dialog_text !== "NO_DIALOG") {
    console.log(`  Dialog: ${result.dom.dialog_text.slice(0, 200)}`);
  }
  if (result.error) console.log(`  ERROR: ${result.error}`);
}

await browser.close();
import { writeFileSync } from "fs";
writeFileSync("scripts/customer-campaign/product_inspection_result.json", JSON.stringify(results, null, 2));
console.log("\nInspection complete. Written to scripts/customer-campaign/product_inspection_result.json");
