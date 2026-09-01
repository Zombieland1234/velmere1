#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  collectRuntimeInventory,
  createRuntimeArchive,
  verifyRuntimeArchive,
} from "./runtime-bundle-lib.mjs";

const root = process.cwd();
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-runtime-binding-test-"));
const archivePath = path.join(temporaryRoot, "runtime.zip");
const stagedRoot = path.join(temporaryRoot, "staged-current-source");

try {
  const created = createRuntimeArchive(root, archivePath, { overwrite: true });
  const verified = verifyRuntimeArchive(archivePath, { policyRoot: root });
  assert.equal(verified.status, "PASS");
  assert.equal(verified.currentSourceBinding.bound, true);
  assert.equal(verified.currentSourceBinding.aggregateSha256, created.inventory.aggregateSha256);

  for (const entry of created.inventory.included) {
    const target = path.join(stagedRoot, ...entry.path.split("/"));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, entry.content, { mode: entry.mode & 0o777 });
  }
  const policyTarget = path.join(stagedRoot, "config/runtime-bundle-policy.json");
  fs.mkdirSync(path.dirname(policyTarget), { recursive: true });
  fs.copyFileSync(path.join(root, "config/runtime-bundle-policy.json"), policyTarget);
  assert.equal(verifyRuntimeArchive(archivePath, { policyRoot: stagedRoot }).status, "PASS");

  const boundSourcePath = path.join(stagedRoot, "lib/network/fetch-with-deadline.ts");
  fs.appendFileSync(boundSourcePath, "\n// adversarial current-source drift\n");
  assert.throws(
    () => verifyRuntimeArchive(archivePath, { policyRoot: stagedRoot }),
    /runtime_bundle_current_source_aggregate_mismatch/,
  );

  const currentInventory = collectRuntimeInventory(root);
  const paths = new Set(currentInventory.descriptors.map((entry) => entry.path));
  for (const forbidden of [
    "app/[locale]/runtime-proof/page.tsx",
    "app/api/proof-status/pass4337-module-execution-drilldown-contract.ts",
    "fixtures/route-modules/security/audit-rls-policy-regression-fixture-runner.ts",
    "lib/security/runtime-evidence-test-pack.ts",
    "lib/security/runtime-replay-artifact-collector.ts",
    "lib/security/runtime-replay-artifact-storage-adapter.ts",
    "lib/security/supabase-release-evidence-board-migration-rls-gate.ts",
    "lib/security/supabase-rls-policy-regression-fixture-runner.ts",
  ]) {
    assert.equal(paths.has(forbidden), false, `forbidden runtime proof path present: ${forbidden}`);
  }

  console.log("PASS runtime archive is current-source bound and explicit proof/fixture paths are absent");
} finally {
  const normalized = `${path.resolve(temporaryRoot)}${path.sep}`;
  assert.ok(normalized.startsWith(`${path.resolve(os.tmpdir())}${path.sep}velmere-runtime-binding-test-`));
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
