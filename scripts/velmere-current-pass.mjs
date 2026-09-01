import fs from "node:fs";
import { spawnSync } from "node:child_process";

const manifestPath = new URL("./current-pass-manifest.json", import.meta.url);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const commands = Array.isArray(manifest.commands) ? manifest.commands : [];
const SAFE_COMMAND = /^[a-zA-Z0-9][a-zA-Z0-9:._-]{1,119}$/;

if (!Number.isInteger(manifest.currentPass) || commands.length === 0 || commands.length > 24) {
  throw new Error("current_pass_manifest_invalid");
}
for (const command of commands) {
  if (typeof command !== "string" || !SAFE_COMMAND.test(command) || command === "quick:current") {
    throw new Error("current_pass_manifest_unsafe_command");
  }
}

console.log(`Velmere PASS${manifest.currentPass} generic gate: ${commands.length} commands`);
for (const command of commands) {
  console.log(`\n> npm run ${command}`);
  const result = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", command], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(`\nPASS${manifest.currentPass} generic current gate PASS`);
