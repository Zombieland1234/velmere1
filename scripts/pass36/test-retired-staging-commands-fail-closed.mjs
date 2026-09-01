#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

let assertions = 0;
for (const commandId of ["A51", "A52", "A63"]) {
  const result = spawnSync(process.execPath, ["scripts/pass36/block-retired-staging-command.mjs", commandId], {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: false,
    env: { PATH: process.env.PATH ?? "" },
  });
  assert.equal(result.status, 2);
  assertions += 1;
  const receipt = JSON.parse(result.stderr);
  assert.equal(receipt.status, "BLOCKED_UNSAFE_LEGACY_STAGING_COMMAND");
  assert.equal(receipt.commandId, commandId);
  assert.equal(receipt.mutationStarted, false);
  assert.equal(receipt.networkCalls, 0);
  assertions += 4;
}
console.log(JSON.stringify({
  status: "PASS_LEGACY_REAL_STAGING_COMMANDS_FAIL_CLOSED",
  assertions,
  stagingCredit: false,
  saleEnabled: false,
}));
