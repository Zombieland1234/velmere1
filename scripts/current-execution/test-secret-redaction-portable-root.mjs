import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, "../..");
const verifierPath = path.join(root, "scripts/verify-secret-redaction-static-safety.mjs");
const verifierSource = readFileSync(verifierPath, "utf8");

assert.match(verifierSource, /fileURLToPath\(new URL\("\.\."/u);
assert.doesNotMatch(verifierSource, /import\.meta\.url\)\.pathname/u);
assert.match(verifierSource, /path\.relative\(root, full\)\.split\(path\.sep\)\.join\("\/"\)/u);

const execution = spawnSync(process.execPath, [verifierPath], {
  cwd: path.dirname(root),
  encoding: "utf8",
  timeout: 30_000,
});

assert.equal(
  execution.status,
  0,
  `portable verifier execution failed\nstdout:\n${execution.stdout}\nstderr:\n${execution.stderr}`,
);
assert.match(execution.stdout, /Secret redaction static safety checks passed/u);
assert.doesNotMatch(execution.stderr, /ENOENT/u);

if (process.platform === "win32") {
  const drive = path.parse(root).root.slice(0, 2).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  assert.doesNotMatch(`${execution.stdout}\n${execution.stderr}`, new RegExp(`${drive}\\\\${drive}`, "iu"));
}

const negativeFixturePath = path.join(
  root,
  "scripts/current-execution",
  `.secret-redaction-negative-${process.pid}.mjs`,
);
let negativeExecution;
try {
  const rawSecretAssignment = ["STRIPE_SECRET_KEY", "=sk_live_not_a_real_credential"].join("");
  writeFileSync(negativeFixturePath, `const leaked = ${JSON.stringify(rawSecretAssignment)};\n`, "utf8");
  negativeExecution = spawnSync(process.execPath, [verifierPath], {
    cwd: path.dirname(root),
    encoding: "utf8",
    timeout: 30_000,
  });
} finally {
  rmSync(negativeFixturePath, { force: true });
}

assert.equal(negativeExecution.status, 1, "raw-secret negative fixture must fail closed");
assert.match(negativeExecution.stderr, /\.secret-redaction-negative-\d+\.mjs: looks like a raw secret assignment marker/u);

const postNegativeExecution = spawnSync(process.execPath, [verifierPath], {
  cwd: path.dirname(root),
  encoding: "utf8",
  timeout: 30_000,
});
assert.equal(postNegativeExecution.status, 0, "verifier must recover after removal of the negative fixture");

console.log(JSON.stringify({
  schemaVersion: "velmere.current-execution.secret-redaction-portable-root-test.v1",
  status: "PASS",
  platform: process.platform,
  root,
  executedFrom: path.dirname(root),
  negativeFixtureRejected: true,
}, null, 2));
