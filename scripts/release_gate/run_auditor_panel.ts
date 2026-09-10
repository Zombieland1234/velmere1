import fs from "node:fs";
import { runAuditor1_Security, runAuditor2_Providers } from "./auditors_1_and_2";
import { runAuditor3_RiskEngine, runAuditor4_AuditProduct, runAuditor5_Shield } from "./auditors_3_4_5";
import { runAuditor6_ShieldPro, runAuditor7_RealMarkets, runAuditor8_BrowserLens, runAuditor9_AngelAI, runAuditor10_VisualUX } from "./auditors_6_to_10";

export async function runFullAuditorPanel() {
  console.log("===============================================================");
  console.log("    VELMÈRE AI AUDITOR PANEL — 10 INDEPENDENT AUDITORS");
  console.log("===============================================================");

  const auditors = [
    runAuditor1_Security,
    runAuditor2_Providers,
    runAuditor3_RiskEngine,
    runAuditor4_AuditProduct,
    runAuditor5_Shield,
    runAuditor6_ShieldPro,
    runAuditor7_RealMarkets,
    runAuditor8_BrowserLens,
    runAuditor9_AngelAI,
    runAuditor10_VisualUX,
  ];

  const results = [];
  let totalChecks = 0;
  let allCriticalCount = 0;
  let allHighCount = 0;

  for (const auditorFn of auditors) {
    const res = await auditorFn();
    results.push(res);
    totalChecks += res.checks;
    const criticals = res.findings.filter(f => f.severity === "CRITICAL").length;
    const highs = res.findings.filter(f => f.severity === "HIGH").length;
    allCriticalCount += criticals;
    allHighCount += highs;
    console.log(`  [${res.passed ? "PASS" : "FAIL"}] ${res.name}: ${res.checks} checks, ${criticals} critical, ${highs} high`);
  }

  const passedAuditors = results.filter(r => r.passed).length;
  console.log(`\n=== AUDITOR PANEL VERDICT: ${passedAuditors}/10 AUDITORS PASSED ===`);

  const receipt = {
    schemaVersion: "velmere.release-gate.auditor-panel.v1",
    timestamp: new Date().toISOString(),
    totalAuditors: 10,
    passedAuditors,
    totalChecks,
    criticalFindings: allCriticalCount,
    highFindings: allHighCount,
    allPassed: passedAuditors === 10 && allCriticalCount === 0 && allHighCount === 0,
    auditors: results,
  };

  fs.mkdirSync("artifacts/adversarial", { recursive: true });
  fs.writeFileSync("artifacts/adversarial/AUDITOR_PANEL_RECEIPT.json", JSON.stringify(receipt, null, 2));
  console.log("Receipt written to artifacts/adversarial/AUDITOR_PANEL_RECEIPT.json");
  return receipt;
}

if (process.argv[1]?.includes("run_auditor_panel")) {
  runFullAuditorPanel().catch(console.error);
}
