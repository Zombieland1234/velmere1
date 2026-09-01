#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { computeSourceSnapshot, sha256File } from "../release-integrity/source-snapshot.mjs";
import { root, sha256, writeJsonAtomic } from "./release-common.mjs";

const args = process.argv.slice(2);
function take(flag, fallback = null) {
  const index = args.indexOf(flag);
  if (index < 0) return fallback;
  const value = args[index + 1];
  args.splice(index, 2);
  return value;
}
const name = take("--name");
const successStatus = take("--success-status", "OFFLINE-PROVEN");
const failureStatus = take("--failure-status", "FAIL");
const truthBoundary = take("--truth", "Command result bound to the sealed current source identity. No staging or LIVE proof is implied.");
const separator = args.indexOf("--");
const commandArgs = separator >= 0 ? args.slice(separator + 1) : args;
if (!name || commandArgs.length === 0 || !/^[a-z0-9_]+$/u.test(name)) throw new Error("command_receipt_arguments_invalid");
const identity = JSON.parse(fs.readFileSync(path.join(root, "artifacts/release/SOURCE_IDENTITY.json"), "utf8"));
const before = computeSourceSnapshot(root);
if (before.sha256 !== identity.sourceTree.sha256) throw new Error("command_receipt_source_identity_not_current");
const [command, ...commandTail] = commandArgs;
const result = spawnSync(command, commandTail, { cwd: root, env: process.env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const exitCode = Number.isInteger(result.status) ? result.status : 1;
const combined = [
  `COMMAND: ${commandArgs.join(" ")}`,
  `EXIT_CODE: ${exitCode}`,
  "--- STDOUT ---",
  result.stdout ?? "",
  "--- STDERR ---",
  result.stderr ?? "",
  result.error ? `--- SPAWN ERROR ---\n${result.error.stack ?? result.error.message}` : "",
].join("\n");
const logPath = `artifacts/release/logs/${name}.log`;
fs.mkdirSync(path.join(root, "artifacts/release/logs"), { recursive: true });
fs.writeFileSync(path.join(root, logPath), combined, { mode: 0o600 });
const after = computeSourceSnapshot(root);
const sourceMutated = before.sha256 !== after.sha256 || before.files !== after.files || before.bytes !== after.bytes;
const effectiveExitCode = exitCode === 0 && sourceMutated ? 1 : exitCode;
const status = effectiveExitCode === 0 ? successStatus : (sourceMutated ? "FAIL" : failureStatus);
const receipt = {
  schemaVersion: "velmere.command-receipt.v2",
  generatedAt: new Date().toISOString(),
  command: commandArgs.join(" "),
  exitCode: effectiveExitCode,
  processExitCode: exitCode,
  status,
  sourceTreeSha256: identity.sourceTree.sha256,
  sourceTreeBefore: before,
  sourceTreeAfter: after,
  sourceMutated,
  lockfileSha256: sha256File(path.join(root, "package-lock.json")),
  stdoutStderrLog: { path: logPath, sha256: sha256(Buffer.from(combined)), bytes: Buffer.byteLength(combined) },
  truthBoundary,
};
writeJsonAtomic(`artifacts/release/commands/${name}.json`, receipt);
process.stdout.write(combined + "\n");
process.exit(effectiveExitCode);
