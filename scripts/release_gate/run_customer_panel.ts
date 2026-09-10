import fs from "node:fs";
import { runCustomers1To5 } from "./customers_1_to_5";
import { runCustomers6To10 } from "./customers_6_to_10";
import { runCustomers11To15 } from "./customers_11_to_15";
import { runCustomers16To20 } from "./customers_16_to_20";

export async function runFullCustomerPanel() {
  console.log("===============================================================");
  console.log("    VELMÈRE AI CUSTOMER PANEL — 20 REAL CUSTOMER PROFILES");
  console.log("===============================================================");

  const p1 = await runCustomers1To5();
  const p2 = await runCustomers6To10();
  const p3 = await runCustomers11To15();
  const p4 = await runCustomers16To20();

  const allCustomers = [...p1, ...p2, ...p3, ...p4];

  for (const c of allCustomers) {
    console.log(`  [${c.passed ? "PASS" : "FAIL"}] Customer ${c.id} (${c.persona}) -> Intent: "${c.purchaseIntent}"`);
  }

  const passedCount = allCustomers.filter(c => c.passed).length;
  console.log(`\n=== CUSTOMER PANEL VERDICT: ${passedCount}/20 CUSTOMERS PASSED ===`);

  const receipt = {
    schemaVersion: "velmere.release-gate.customer-panel.v1",
    timestamp: new Date().toISOString(),
    totalCustomers: 20,
    passedCount,
    allPassed: passedCount === 20,
    wouldBuyCount: allCustomers.filter(c => c.purchaseIntent === "would buy").length,
    wouldNotBuyCount: allCustomers.filter(c => c.purchaseIntent === "would not buy").length,
    unclearCount: allCustomers.filter(c => c.purchaseIntent === "unclear" || c.purchaseIntent === "missing value").length,
    customers: allCustomers,
  };

  fs.mkdirSync("artifacts/customer-campaign", { recursive: true });
  fs.writeFileSync("artifacts/customer-campaign/AI_CUSTOMER_PANEL_RECEIPT.json", JSON.stringify(receipt, null, 2));
  console.log("Receipt written to artifacts/customer-campaign/AI_CUSTOMER_PANEL_RECEIPT.json");
  return receipt;
}

if (process.argv[1]?.includes("run_customer_panel")) {
  runFullCustomerPanel().catch(console.error);
}
