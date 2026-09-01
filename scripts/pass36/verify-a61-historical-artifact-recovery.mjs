#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { evaluateHistoricalRecovery } from "./a61-historical-artifact-recovery-lib.mjs";

function argument(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`a61_argument_missing:${name}`);
  return value;
}

const root = path.resolve(process.cwd());
const policyPath = path.resolve(process.env.VELMERE_A61_TEST_POLICY_PATH || path.join(root, "config/pass36/a61-historical-artifact-recovery-policy.json"));
const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
const direct = {};
const archives = {};
for (const expected of policy.artifacts) {
  const archivePath = argument(expected.archiveArgument);
  if (archivePath) archives[expected.id] = archivePath;
  const directPath = argument(`--artifact-${expected.id.toLowerCase().replaceAll("_", "-")}`);
  if (directPath) direct[expected.id] = directPath;
}
const install = process.argv.includes("--install");
const output = path.resolve(argument("--output") || path.join(root, "artifacts/pass36/a61/PASS36_A61_HISTORICAL_ARTIFACT_RECOVERY.json"));
let result;
try {
  result = evaluateHistoricalRecovery({ root, policy, inputs: { direct, archives }, install });
} catch (error) {
  result = {
    schemaVersion: "velmere.pass36.a61.historical-artifact-recovery.v1",
    revisionId: policy.revisionId,
    decision: policy.decisions.rejected,
    promotionAllowed: false,
    summary: { required: policy.artifacts.length, verifiedInputs: 0, installedExact: 0, rejected: 1, criticalOfflineGateEligible: false },
    errors: [{ id: "GLOBAL", error: error instanceof Error ? error.message : String(error) }],
    saleEnabled: false,
    liveProven: false,
    truthBoundary: policy.truthBoundary,
  };
}
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
if (result.decision === policy.decisions.rejected) process.exitCode = 1;
else if (![policy.decisions.verified, policy.decisions.verifiedNotInstalled].includes(result.decision)) process.exitCode = 2;
