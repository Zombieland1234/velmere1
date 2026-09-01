#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { validateR44P41ReceiptCore } from "../../lib/security/r44p41-foundry-evidence.mjs";
const root = path.resolve(process.argv[2] ?? "");
const original = JSON.parse(fs.readFileSync(path.join(root, "R44P41_FOUNDRY_INVARIANT_CAMPAIGN_RECEIPT.json"), "utf8"));
const clone = () => structuredClone(original);
const mutations = [
  ["revision", (x) => { x.revisionId = "WRONG"; }],
  ["status", (x) => { x.status = "PASS"; }],
  ["forge", (x) => { x.toolchain.forge.sha256 = "0".repeat(64); }],
  ["solc", (x) => { x.toolchain.solc.version = "0.8.25"; }],
  ["family-delete", (x) => { x.campaign.families.pop(); }],
  ["reason", (x) => { x.campaign.families[0].expectedFailureReason = "WRONG"; }],
  ["risk-exit", (x) => { x.campaign.families[0].riskRuns[0].exitCode = 0; }],
  ["control-exit", (x) => { x.campaign.families[0].controlRuns[0].exitCode = 1; }],
  ["sequence", (x) => { x.campaign.families[0].riskRuns[1].sequenceShape = ["different"]; }],
  ["anvil-code", (x) => { x.localAnvil.deployments[0].exactRuntimeBytecodeMatch = false; }],
  ["customer-credit", (x) => { x.credits.customerCredit = true; }],
  ["world-class", (x) => { x.credits.worldClassCredit = true; }]
];
const rows = [];
for (const [id, mutate] of mutations) {
  const candidate = clone();
  mutate(candidate);
  const checks = validateR44P41ReceiptCore(candidate);
  rows.push({ id, passed: checks.some((row) => !row.passed), failedChecks: checks.filter((row) => !row.passed).map((row) => row.id) });
}
const failed = rows.filter((row) => !row.passed);
console.log(JSON.stringify({ schemaVersion: "velmere.pass36.a102r44p41.foundry-evidence-tamper.v1", status: failed.length ? "FAIL_R44P41_FOUNDRY_EVIDENCE_TAMPER" : "PASS_R44P41_FOUNDRY_EVIDENCE_TAMPER", checks: rows.length, passed: rows.length - failed.length, failed: failed.length, rows }, null, 2));
if (failed.length) process.exit(1);
