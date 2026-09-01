#!/usr/bin/env node
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const scriptPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "verify-a88-clean-unpack-sequence.py");
const candidates = [process.env.PYTHON, process.platform === "win32" ? "py" : "python3", "python"].filter(Boolean);
let lastError = null;
for (const candidate of candidates) {
  const args = candidate === "py" ? ["-3", scriptPath] : [scriptPath];
  const run = spawnSync(candidate, args, {
    cwd: root,
    shell: false,
    windowsHide: true,
    stdio: "inherit",
    env: { ...process.env, PYTHONUNBUFFERED: "1" },
  });
  if (!run.error) process.exit(run.status ?? 1);
  if (run.error.code !== "ENOENT") {
    lastError = run.error;
    break;
  }
  lastError = run.error;
}
console.error(JSON.stringify({
  status: "FAIL_A88_CLEAN_UNPACK_PYTHON_BRIDGE",
  error: lastError instanceof Error ? lastError.message : "python_runtime_not_found",
}, null, 2));
process.exit(1);
