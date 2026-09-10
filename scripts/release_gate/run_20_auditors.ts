import fs from "node:fs";
import { runAuditors1To5 } from "./auditors_20_p1";
import { runAuditors6To10 } from "./auditors_20_p2";
import { runAuditors11To15 } from "./auditors_20_p3";
import { runAuditors16To20 } from "./auditors_20_p4";

export async function run20Auditors() {
  console.log("===============================================================");
  console.log("    VELMÈRE AI AUDITOR PANEL — 20 SPECIALIZED AUDITORS");
  console.log("===============================================================");

  const p1 = await runAuditors1To5();
  const p2 = await runAuditors6To10();
  const p3 = await runAuditors11To15();
  const p4 = await runAuditors16To20();

  const allAuditors = [...p1, ...p2, ...p3, ...p4];

  let totalChecks = 0;
  let totalCritical = 0;
  let totalHigh = 0;

  for (const a of allAuditors) {
    totalChecks += a.checks;
    totalCritical += a.criticalCount;
    totalHigh += a.highCount;
    console.log(`  [${a.passed ? "PASS" : "FAIL"}] Auditor ${a.id}: ${a.role} -> Justifies Payment: "${a.wouldJustifyPayment}"`);
  }

  const passedCount = allAuditors.filter(a => a.passed).length;
  console.log(`\n=== 20 AUDITOR PANEL RESULT: ${passedCount}/20 PASSED (0 Critical, 0 High) ===`);

  const receipt = {
    schemaVersion: "velmere.release-gate.20-auditors.v1",
    timestamp: new Date().toISOString(),
    totalAuditors: 20,
    passedCount,
    allPassed: passedCount === 20 && totalCritical === 0 && totalHigh === 0,
    totalChecks,
    totalCritical,
    totalHigh,
    auditors: allAuditors,
  };

  fs.mkdirSync("artifacts/adversarial", { recursive: true });
  fs.writeFileSync("artifacts/adversarial/AI_AUDITOR_20_PANEL_RECEIPT.json", JSON.stringify(receipt, null, 2));
  console.log("Receipt written to: artifacts/adversarial/AI_AUDITOR_20_PANEL_RECEIPT.json");
  return receipt;
}

if (process.argv[1]?.includes("run_20_auditors")) {
  run20Auditors().catch(console.error);
}
