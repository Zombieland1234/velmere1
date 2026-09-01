#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import process from "node:process";

function run(args, environment = {}) {
  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    env: { ...process.env, ...environment },
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(["--expose-gc", "--max-old-space-size=6144", "scripts/pass4666-partitioned-typecheck.mjs"]);
for (const engine of ["webpack", "turbopack"]) {
  run(["scripts/pass4666-next-build.mjs"], { VELMERE_BUILD_ENGINE: engine });
  run(["scripts/pass4826/create-build-output-binding.mjs", engine]);
}
run(["scripts/pass4826/verify-dual-build-receipts.mjs"]);
