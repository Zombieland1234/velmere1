#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { isTruthFixturePath, runTruthScopeV2 } from "./verify-truth-scope-v2.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(isTruthFixturePath("scripts/r11/test-truth-scope-v2.mjs"), "test_file_not_excluded");
assert(isTruthFixturePath("lib/foo/__tests__/x.ts"), "test_directory_not_excluded");
assert(!isTruthFixturePath("components/LatestCard.tsx"), "LatestCard_false_exclusion_regression");
assert(!isTruthFixturePath("lib/security/attestation.ts"), "lib_runtime_wrongly_excluded");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-truth-scope-"));
for (const rel of ["app", "components", "lib", "scripts", "reports", "docs/audit"]) {
  fs.mkdirSync(path.join(root, rel), { recursive: true });
}
fs.mkdirSync(path.join(root, "components", "fixtures"), { recursive: true });
fs.writeFileSync(path.join(root, ".nvmrc"), "24.18.0\n");
fs.writeFileSync(path.join(root, ".node-version"), "24.18.0\n");
fs.mkdirSync(path.join(root, "config", "pass24"), { recursive: true });
fs.writeFileSync(path.join(root, "config", "pass24", "runtime-policy.json"), JSON.stringify({ node: { version: "24.18.0", bundledNpmVersion: "11.16.0" } }));
fs.writeFileSync(path.join(root, "components", "LatestCard.tsx"), "export const x = 'production-ready';\n");
fs.writeFileSync(path.join(root, "lib", "danger.ts"), "export const x = '[VERIFIED - IMMUTABLE]';\n");
fs.writeFileSync(path.join(root, "components", "fixtures", "claim.ts"), "export const x = 'production-ready';\n");

const receipt = runTruthScopeV2(root);
const ids = new Set(receipt.findings.map((f) => `${f.path}:${f.id}`));
assert([...ids].some((x) => x.startsWith("components/LatestCard.tsx:CLAIM_PRODUCTION_READY")), "LatestCard_claim_not_scanned");
assert([...ids].some((x) => x.startsWith("lib/danger.ts:CLAIM_IMMUTABLE_CONTENT")), "lib_claim_not_scanned");
assert(![...ids].some((x) => x.startsWith("components/fixtures/")), "fixture_should_not_receive_release_claim_finding");

console.log(JSON.stringify({ status: "PASS", checks: 7, p0: receipt.p0 }, null, 2));
