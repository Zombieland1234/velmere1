import fs from "fs";
import path from "path";
import { execSync } from "child_process";

async function main() {
  console.log("=== PASS 11: HIGH-RISK ADVERSARIAL & CONTRACT AUDIT ===");
  fs.mkdirSync("artifacts/security", { recursive: true });

  console.log("1. Running external command containment and tool spec...");
  const t0 = Date.now();
  const cOut = execSync("node scripts/pass36/test-a102r41-external-command-containment-and-tool-spec.mjs", { encoding: "utf8" });
  const cDuration = Date.now() - t0;
  const cPassed = cOut.includes('"passed": 11');
  console.log(`[${cPassed ? "PASS" : "FAIL"}] Command Containment (${cDuration}ms)`);

  console.log("2. Running Audit A6 Forge Adapter test suite...");
  const t1 = Date.now();
  const fOut = execSync("node scripts/pass35/test-audit-a6-forge-adapter.mjs", { encoding: "utf8" });
  const fDuration = Date.now() - t1;
  const fPassed = fOut.includes("PASS_AUDIT_A6_FORGE_ADAPTER");
  console.log(`[${fPassed ? "PASS" : "FAIL"}] Forge Adapter Suite (${fDuration}ms)`);

  console.log("3. Running Audit Execution Envelope boundaries...");
  const t2 = Date.now();
  const eOut = execSync("node scripts/pass35/test-audit-execution-envelope.mjs", { encoding: "utf8" });
  const eDuration = Date.now() - t2;
  const ePassed = eOut.includes('"status": "PASS"');
  console.log(`[${ePassed ? "PASS" : "FAIL"}] Execution Envelope Boundaries (${eDuration}ms)`);

  const allPassed = cPassed && fPassed && ePassed;
  const receipt = {
    schemaVersion: "velmere.pass11.high-risk-adversarial.receipt.v1",
    executedAt: new Date().toISOString(),
    containmentChecks: { passed: cPassed, durationMs: cDuration },
    forgeAdapterChecks: { passed: fPassed, durationMs: fDuration },
    envelopeChecks: { passed: ePassed, durationMs: eDuration },
    passed: allPassed
  };

  const receiptPath = path.resolve("artifacts/security/PASS11_HIGH_RISK_ADVERSARIAL_RECEIPT.json");
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2), "utf8");
  console.log(`Saved Pass 11 Receipt to: ${receiptPath}`);
  if (!allPassed) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
